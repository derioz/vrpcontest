import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { CategorySuggestion, SuggestionSortOption, CreateSuggestionInput } from '../types';

const SUGGESTIONS_COLLECTION = 'category_suggestions';
const VOTES_COLLECTION = 'category_suggestion_votes';

/**
 * Helper to sort suggestions array according to selected criteria.
 * Top Score: Primary = Net Score, Secondary = Upvotes, Tertiary = Least Downvotes, Tiebreak = Newest.
 */
export function sortSuggestions(
  items: CategorySuggestion[],
  sortBy: SuggestionSortOption
): CategorySuggestion[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'top') {
      // 1. Primary: Net score (upvotes - downvotes)
      if (b.score !== a.score) return b.score - a.score;
      // 2. Secondary: If score is identical, compare upvote count
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      // 3. Tertiary: If upvotes are identical, prefer the one with LEAST downvotes
      if (a.downvotes !== b.downvotes) return a.downvotes - b.downvotes;
      // 4. Tie-break: Newest created date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'lowest') {
      if (a.score !== b.score) return a.score - b.score;
      if (a.upvotes !== b.upvotes) return a.upvotes - b.upvotes;
      if (b.downvotes !== a.downvotes) return b.downvotes - a.downvotes;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    // 'newest' (default)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Fetch all category suggestions with computed scores and the current user's personal vote.
 */
export async function fetchCategorySuggestions(
  userId?: string | null,
  sortBy: SuggestionSortOption = 'newest'
): Promise<CategorySuggestion[]> {
  try {
    const suggestionsSnap = await getDocs(collection(db, SUGGESTIONS_COLLECTION));
    const itemsMap = new Map<string, CategorySuggestion>();

    // Map of user's votes if authenticated
    const userVotesMap = new Map<string, number>();
    if (userId) {
      const userVotesQuery = query(
        collection(db, VOTES_COLLECTION),
        where('user_id', '==', String(userId))
      );
      const userVotesSnap = await getDocs(userVotesQuery);
      userVotesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.suggestion_id) {
          userVotesMap.set(data.suggestion_id, Number(data.vote || 0));
        }
      });
    }

    suggestionsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const upvotes = Number(data.upvotes || 0);
      const downvotes = Number(data.downvotes || 0);
      const score = Number(data.score !== undefined ? data.score : upvotes - downvotes);

      itemsMap.set(docSnap.id, {
        id: docSnap.id,
        category_name: data.category_name || '',
        description: data.description || '',
        user_id: data.user_id || '',
        discord_id: data.discord_id || data.author_discord_id || null,
        discord_name: data.discord_name || data.author_name || 'Discord User',
        author_name: data.author_name || data.discord_name || 'Discord User',
        author_avatar_url: data.author_avatar_url || data.photo_url || null,
        avatar_seed: data.avatar_seed || null,
        avatar_style: data.avatar_style || null,
        is_admin_author: !!data.is_admin_author,
        status: data.status || 'active',
        score,
        upvotes,
        downvotes,
        user_vote: userVotesMap.get(docSnap.id) || 0,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString()
      });
    });

    return sortSuggestions(Array.from(itemsMap.values()), sortBy);
  } catch (error: any) {
    console.error('Error fetching category suggestions from Firestore:', error);
    throw new Error(error?.message || 'Failed to load category suggestions.');
  }
}

/**
 * Subscribe to real-time updates for category suggestions with instant vote-state reflection.
 */
export function subscribeCategorySuggestions(
  userId: string | null,
  sortBy: SuggestionSortOption,
  onUpdate: (suggestions: CategorySuggestion[]) => void,
  onError?: (err: Error) => void
): () => void {
  const userVotesMap = new Map<string, number>();
  let latestRawSuggestions: CategorySuggestion[] = [];

  const emitSorted = () => {
    const combined = latestRawSuggestions.map((s) => ({
      ...s,
      user_vote: userVotesMap.get(s.id) || 0
    }));
    onUpdate(sortSuggestions(combined, sortBy));
  };

  // 1. Subscribe to user votes if userId provided
  let unsubVotes: (() => void) | null = null;
  if (userId) {
    const userVotesQuery = query(
      collection(db, VOTES_COLLECTION),
      where('user_id', '==', String(userId))
    );
    unsubVotes = onSnapshot(
      userVotesQuery,
      (voteSnap) => {
        userVotesMap.clear();
        voteSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.suggestion_id) {
            userVotesMap.set(d.suggestion_id, Number(d.vote || 0));
          }
        });
        emitSorted();
      },
      (voteErr) => console.warn('Vote listener notice:', voteErr)
    );
  }

  // 2. Subscribe to suggestions collection
  const unsubSuggestions = onSnapshot(
    collection(db, SUGGESTIONS_COLLECTION),
    (snapshot) => {
      const itemsMap = new Map<string, CategorySuggestion>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const upvotes = Number(data.upvotes || 0);
        const downvotes = Number(data.downvotes || 0);
        const score = Number(data.score !== undefined ? data.score : upvotes - downvotes);

        itemsMap.set(docSnap.id, {
          id: docSnap.id,
          category_name: data.category_name || '',
          description: data.description || '',
          user_id: data.user_id || '',
          discord_id: data.discord_id || data.author_discord_id || null,
          discord_name: data.discord_name || data.author_name || 'Discord User',
          author_name: data.author_name || data.discord_name || 'Discord User',
          author_avatar_url: data.author_avatar_url || data.photo_url || null,
          avatar_seed: data.avatar_seed || null,
          avatar_style: data.avatar_style || null,
          is_admin_author: !!data.is_admin_author,
          status: data.status || 'active',
          score,
          upvotes,
          downvotes,
          user_vote: userVotesMap.get(docSnap.id) || 0,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        });
      });

      latestRawSuggestions = Array.from(itemsMap.values());
      emitSorted();
    },
    (err) => {
      console.error('Snapshot error for category suggestions:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubSuggestions();
    if (unsubVotes) unsubVotes();
  };
}

/**
 * Submit a new category suggestion attached to the user's Discord profile.
 */
export async function submitCategorySuggestion(
  input: CreateSuggestionInput
): Promise<CategorySuggestion> {
  const trimmedName = input.category_name.trim();
  const trimmedDesc = input.description.trim();

  if (!trimmedName) throw new Error('Category name is required.');
  if (!trimmedDesc) throw new Error('Description is required.');
  if (trimmedName.length > 100) throw new Error('Category name cannot exceed 100 characters.');
  if (trimmedDesc.length > 1000) throw new Error('Description cannot exceed 1000 characters.');

  const suggestionRef = doc(collection(db, SUGGESTIONS_COLLECTION));
  const now = new Date().toISOString();

  const payload = {
    id: suggestionRef.id,
    category_name: trimmedName,
    description: trimmedDesc,
    user_id: String(input.user_id),
    discord_id: input.discord_id || input.author_discord_id || null,
    discord_name: input.discord_name || input.author_name || 'Discord User',
    author_name: input.author_name || input.discord_name || 'Discord User',
    author_avatar_url: input.author_avatar_url || null,
    avatar_seed: input.avatar_seed || null,
    avatar_style: input.avatar_style || null,
    is_admin_author: !!input.is_admin_author,
    status: input.status || 'active',
    score: 0,
    upvotes: 0,
    downvotes: 0,
    created_at: now,
    updated_at: now
  };

  await setDoc(suggestionRef, payload);

  return {
    ...payload,
    user_vote: 0
  };
}

/**
 * Cast, toggle, or invert a vote on a category suggestion using Firestore atomic transactions.
 * Exact Reddit Rules:
 * - Upvote clicked when not voted: vote = 1, score +1, upvotes +1
 * - Upvote clicked when already upvoted: vote = 0 (unvote), score -1, upvotes -1
 * - Downvote clicked when not voted: vote = -1, score -1, downvotes +1
 * - Downvote clicked when already downvoted: vote = 0 (unvote), score +1, downvotes -1
 * - Upvote clicked when downvoted: vote = 1, downvotes -1, upvotes +1, score +2
 * - Downvote clicked when upvoted: vote = -1, upvotes -1, downvotes +1, score -2
 */
export async function castCategorySuggestionVote(
  suggestionId: string,
  userId: string,
  requestedVote: 1 | -1 | 0,
  discordId?: string
): Promise<{ score: number; user_vote: number; upvotes: number; downvotes: number }> {
  if (!suggestionId || !userId) {
    throw new Error('Missing suggestion or user identifier for voting.');
  }

  const voteDocId = `${suggestionId}_${userId}`;
  const voteDocRef = doc(db, VOTES_COLLECTION, voteDocId);
  const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);

  return await runTransaction(db, async (transaction) => {
    const [voteDocSnap, suggestionDocSnap] = await Promise.all([
      transaction.get(voteDocRef),
      transaction.get(suggestionDocRef)
    ]);

    if (!suggestionDocSnap.exists()) {
      throw new Error('Category suggestion does not exist.');
    }

    const suggestionData = suggestionDocSnap.data();
    let currentUpvotes = Math.max(0, Number(suggestionData.upvotes || 0));
    let currentDownvotes = Math.max(0, Number(suggestionData.downvotes || 0));

    const oldVote = voteDocSnap.exists() ? Number(voteDocSnap.data().vote || 0) : 0;
    const newVote = requestedVote;

    // Adjust counts based on old vote removal
    if (oldVote === 1) currentUpvotes = Math.max(0, currentUpvotes - 1);
    if (oldVote === -1) currentDownvotes = Math.max(0, currentDownvotes - 1);

    // Apply new vote addition
    if (newVote === 1) currentUpvotes += 1;
    if (newVote === -1) currentDownvotes += 1;

    const newScore = currentUpvotes - currentDownvotes;
    const now = new Date().toISOString();

    // 1. Update Vote Document
    if (newVote === 0) {
      if (voteDocSnap.exists()) {
        transaction.delete(voteDocRef);
      }
    } else {
      transaction.set(voteDocRef, {
        id: voteDocId,
        suggestion_id: suggestionId,
        user_id: String(userId),
        discord_id: discordId || null,
        vote: newVote,
        updated_at: now,
        created_at: voteDocSnap.exists() ? voteDocSnap.data().created_at || now : now
      });
    }

    // 2. Update Suggestion Document Totals
    transaction.update(suggestionDocRef, {
      score: newScore,
      upvotes: currentUpvotes,
      downvotes: currentDownvotes,
      updated_at: now
    });

    return {
      score: newScore,
      user_vote: newVote,
      upvotes: currentUpvotes,
      downvotes: currentDownvotes
    };
  });
}

/**
 * Delete a category suggestion and all of its associated vote documents.
 */
export async function deleteCategorySuggestion(suggestionId: string): Promise<boolean> {
  const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);

  try {
    const votesQuery = query(
      collection(db, VOTES_COLLECTION),
      where('suggestion_id', '==', suggestionId)
    );
    const votesSnap = await getDocs(votesQuery);
    const batch = writeBatch(db);

    votesSnap.forEach((voteDoc) => {
      batch.delete(voteDoc.ref);
    });

    batch.delete(suggestionDocRef);
    await batch.commit();
    return true;
  } catch (error: any) {
    console.error('Error deleting category suggestion:', error);
    throw new Error(error?.message || 'Failed to delete category suggestion.');
  }
}

/**
 * Update moderation status of a suggestion (e.g. 'active', 'shortlisted', 'archived').
 */
export async function updateCategorySuggestionStatus(
  suggestionId: string,
  status: 'active' | 'shortlisted' | 'archived'
): Promise<boolean> {
  try {
    const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);
    await updateDoc(suggestionDocRef, {
      status,
      updated_at: new Date().toISOString()
    });
    return true;
  } catch (error: any) {
    console.error('Error updating suggestion status:', error);
    throw new Error(error?.message || 'Failed to update suggestion status.');
  }
}
