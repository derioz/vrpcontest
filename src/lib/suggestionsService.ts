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
import {
  CategorySuggestion,
  SuggestionSortOption,
  CreateSuggestionInput,
  SuggestionVoterSummary,
  SuggestionStatus,
  SuggestionAdminVote
} from '../types';

const SUGGESTIONS_COLLECTION = 'category_suggestions';
const VOTES_COLLECTION = 'category_suggestion_votes';

export interface SuggestionVoter {
  userId: string;
  discordId?: string;
  discordName?: string;
  authorAvatarUrl?: string;
  avatarSeed?: string;
  avatarStyle?: string;
  vote: 1 | -1;
  updatedAt: string;
}

// In-memory LRU voter cache to prevent redundant Firestore queries
const voterLookupMemoryCache = new Map<string, { upvoters: SuggestionVoter[]; downvoters: SuggestionVoter[]; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

/**
 * High-performance in-memory sorting utility.
 * Top Score: Primary = Net Score, Secondary = Upvotes, Tertiary = Least Downvotes, Tiebreak = Newest.
 */
export function sortSuggestions(
  items: CategorySuggestion[],
  sortBy: SuggestionSortOption = 'top'
): CategorySuggestion[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'top') {
      if (b.score !== a.score) return b.score - a.score;
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      if (a.downvotes !== b.downvotes) return a.downvotes - b.downvotes;
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
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Fetch all category suggestions with computed scores and the current user's personal vote.
 */
export async function fetchCategorySuggestions(
  userId?: string | null,
  sortBy: SuggestionSortOption = 'top'
): Promise<CategorySuggestion[]> {
  try {
    const suggestionsSnap = await getDocs(collection(db, SUGGESTIONS_COLLECTION));
    const itemsMap = new Map<string, CategorySuggestion>();

    // Map of user's personal votes if authenticated
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
        voters_sample: Array.isArray(data.voters_sample) ? data.voters_sample : [],
        admin_votes: Array.isArray(data.admin_votes) ? data.admin_votes : [],
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
 * Real-time subscription to category suggestions.
 * Designed for maximum read efficiency: maintains in-memory document state and emits cleanly.
 */
export function subscribeCategorySuggestions(
  userId: string | null,
  onUpdate: (suggestions: CategorySuggestion[]) => void,
  onError?: (err: Error) => void
): () => void;
export function subscribeCategorySuggestions(
  userId: string | null,
  sortByOrOnUpdate: SuggestionSortOption | ((suggestions: CategorySuggestion[]) => void),
  onUpdateOrOnError?: ((suggestions: CategorySuggestion[]) => void) | ((err: Error) => void),
  onError?: (err: Error) => void
): () => void {
  // Handle overloaded signatures gracefully
  let sortBy: SuggestionSortOption | null = null;
  let onUpdate: (suggestions: CategorySuggestion[]) => void;
  let actualOnError: ((err: Error) => void) | undefined;

  if (typeof sortByOrOnUpdate === 'function') {
    onUpdate = sortByOrOnUpdate;
    actualOnError = onUpdateOrOnError as (err: Error) => void;
  } else {
    sortBy = sortByOrOnUpdate;
    onUpdate = onUpdateOrOnError as (suggestions: CategorySuggestion[]) => void;
    actualOnError = onError;
  }

  const userVotesMap = new Map<string, number>();
  let latestRawSuggestions: CategorySuggestion[] = [];

  const emit = () => {
    const combined = latestRawSuggestions.map((s) => ({
      ...s,
      user_vote: userVotesMap.get(s.id) || 0
    }));
    onUpdate(sortBy ? sortSuggestions(combined, sortBy) : combined);
  };

  // 1. Subscribe to current user's votes if authenticated (1 single lightweight query)
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
        emit();
      },
      (voteErr) => console.warn('Vote listener notice:', voteErr)
    );
  }

  // 2. Subscribe to suggestions collection (1 single collection listener)
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
          voters_sample: Array.isArray(data.voters_sample) ? data.voters_sample : [],
          admin_votes: Array.isArray(data.admin_votes) ? data.admin_votes : [],
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        });
      });

      latestRawSuggestions = Array.from(itemsMap.values());
      emit();
    },
    (err) => {
      console.error('Snapshot error for category suggestions:', err);
      if (actualOnError) actualOnError(err);
    }
  );

  return () => {
    unsubSuggestions();
    if (unsubVotes) unsubVotes();
  };
}

/**
 * Submit a new category suggestion attached to the user's Discord profile.
 * Generates 1 single document write to Cloud Firestore.
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

  const payload: any = {
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
    voters_sample: [],
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
 * Maintains inlined `voters_sample` on the suggestion document to eliminate extra hover queries.
 */
export async function castCategorySuggestionVote(
  suggestionId: string,
  userId: string,
  requestedVote: 1 | -1 | 0,
  discordId?: string,
  discordName?: string,
  avatarUrl?: string,
  avatarSeed?: string,
  avatarStyle?: string
): Promise<{ score: number; user_vote: number; upvotes: number; downvotes: number; voters_sample?: SuggestionVoterSummary[] }> {
  if (!suggestionId || !userId) {
    throw new Error('Missing suggestion or user identifier for voting.');
  }

  const voteDocId = `${suggestionId}_${userId}`;
  const voteDocRef = doc(db, VOTES_COLLECTION, voteDocId);
  const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);

  // Invalidate memory cache for this suggestion
  voterLookupMemoryCache.delete(suggestionId);

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

    // 1. Maintain inlined voters_sample (up to 40 most recent voters)
    const existingSample: SuggestionVoterSummary[] = Array.isArray(suggestionData.voters_sample)
      ? suggestionData.voters_sample
      : [];
    const filteredSample = existingSample.filter((v) => v.userId !== String(userId));

    let updatedVotersSample: SuggestionVoterSummary[] = filteredSample;
    if (newVote !== 0) {
      const newVoterEntry: SuggestionVoterSummary = {
        userId: String(userId),
        discordId: discordId || null,
        discordName: discordName || 'Discord User',
        authorAvatarUrl: avatarUrl || null,
        avatarSeed: avatarSeed || null,
        avatarStyle: avatarStyle || 'botttsNeutral',
        vote: newVote,
        updatedAt: now
      };
      updatedVotersSample = [newVoterEntry, ...filteredSample].slice(0, 40);
    }

    // 2. Update Vote Document
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
        discord_name: discordName || 'Discord User',
        author_name: discordName || 'Discord User',
        author_avatar_url: avatarUrl || null,
        avatar_seed: avatarSeed || null,
        avatar_style: avatarStyle || 'botttsNeutral',
        vote: newVote,
        updated_at: now,
        created_at: voteDocSnap.exists() ? voteDocSnap.data().created_at || now : now
      });
    }

    // 3. Update Suggestion Document Totals & Inlined Voter Sample
    transaction.update(suggestionDocRef, {
      score: newScore,
      upvotes: currentUpvotes,
      downvotes: currentDownvotes,
      voters_sample: updatedVotersSample,
      updated_at: now
    });

    return {
      score: newScore,
      user_vote: newVote,
      upvotes: currentUpvotes,
      downvotes: currentDownvotes,
      voters_sample: updatedVotersSample
    };
  });
}

/**
 * Fetch all voters for a specific category suggestion (upvoters and downvoters).
 * Uses in-memory cache and falls back to Firestore only when necessary.
 */
export async function fetchSuggestionVoters(
  suggestionId: string,
  inlinedVoters?: SuggestionVoterSummary[]
): Promise<{ upvoters: SuggestionVoter[]; downvoters: SuggestionVoter[] }> {
  // 1. If suggestion already carries inlined voters_sample, parse instantly with ZERO Firestore reads!
  if (Array.isArray(inlinedVoters) && inlinedVoters.length > 0) {
    const upvoters: SuggestionVoter[] = [];
    const downvoters: SuggestionVoter[] = [];

    inlinedVoters.forEach((v) => {
      const item: SuggestionVoter = {
        userId: v.userId,
        discordId: v.discordId,
        discordName: v.discordName || 'Community Member',
        authorAvatarUrl: v.authorAvatarUrl,
        avatarSeed: v.avatarSeed || v.userId,
        avatarStyle: v.avatarStyle || 'botttsNeutral',
        vote: v.vote,
        updatedAt: v.updatedAt
      };
      if (v.vote === 1) upvoters.push(item);
      else if (v.vote === -1) downvoters.push(item);
    });

    return { upvoters, downvoters };
  }

  // 2. Check LRU memory cache
  const cached = voterLookupMemoryCache.get(suggestionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { upvoters: cached.upvoters, downvoters: cached.downvoters };
  }

  // 3. Query Firestore category_suggestion_votes as a fallback
  try {
    const votesQuery = query(
      collection(db, VOTES_COLLECTION),
      where('suggestion_id', '==', suggestionId)
    );
    const votesSnap = await getDocs(votesQuery);

    const upvoters: SuggestionVoter[] = [];
    const downvoters: SuggestionVoter[] = [];

    votesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const voter: SuggestionVoter = {
        userId: data.user_id || docSnap.id,
        discordId: data.discord_id || null,
        discordName: data.discord_name || data.author_name || (data.discord_id ? `User ${data.discord_id.slice(-4)}` : 'Community Member'),
        authorAvatarUrl: data.author_avatar_url || null,
        avatarSeed: data.avatar_seed || data.user_id,
        avatarStyle: data.avatar_style || 'botttsNeutral',
        vote: Number(data.vote) as 1 | -1,
        updatedAt: data.updated_at || data.created_at || new Date().toISOString()
      };

      if (voter.vote === 1) upvoters.push(voter);
      else if (voter.vote === -1) downvoters.push(voter);
    });

    const result = { upvoters, downvoters, timestamp: Date.now() };
    voterLookupMemoryCache.set(suggestionId, result);
    return { upvoters, downvoters };
  } catch (error: any) {
    console.error('Error fetching suggestion voters:', error);
    return { upvoters: [], downvoters: [] };
  }
}

/**
 * Delete a category suggestion and all of its associated vote documents in a single atomic batch.
 */
export async function deleteCategorySuggestion(suggestionId: string): Promise<boolean> {
  const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);
  voterLookupMemoryCache.delete(suggestionId);

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
 * Update moderation status of a suggestion (e.g. 'open', 'under_review', 'approved', 'implemented', 'declined', 'archived').
 * Generates 1 single document write to Cloud Firestore.
 */
export async function updateCategorySuggestionStatus(
  suggestionId: string,
  status: SuggestionStatus | string
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

export interface AdminVoteResult {
  admin_votes: SuggestionAdminVote[];
  status: SuggestionStatus | string;
  autoTransitioned: boolean;
  transitionType?: 'opened_for_voting' | 'approved_for_contest';
}

/**
 * Toggle an administrator's vote on whether staff will use this category proposal for the contest.
 * Enforces 2/3 Admin Quorum:
 * - When 'under_review': 2/3 admin votes automatically transitions status to 'open' ("Open for Voting").
 * - When 'open' / 'active': 2/3 admin votes automatically transitions status to 'approved' ("Approved for Contest").
 */
export async function toggleAdminSuggestionVote(
  suggestionId: string,
  adminId: string,
  adminName: string,
  adminAvatarUrl?: string | null
): Promise<AdminVoteResult> {
  try {
    const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(suggestionDocRef);
      if (!snap.exists()) {
        throw new Error('Suggestion does not exist');
      }

      const data = snap.data();
      const currentStatus: string = data.status || 'open';
      const currentVotes: SuggestionAdminVote[] = Array.isArray(data.admin_votes) ? data.admin_votes : [];

      const existingIndex = currentVotes.findIndex((v) => v.adminId === adminId);
      let updatedVotes: SuggestionAdminVote[] = [];

      if (existingIndex >= 0) {
        // Toggle off (remove admin vote)
        updatedVotes = currentVotes.filter((v) => v.adminId !== adminId);
      } else {
        // Toggle on (add admin vote)
        const newVote: SuggestionAdminVote = {
          adminId,
          adminName,
          adminAvatarUrl: adminAvatarUrl || undefined,
          vote: 'yes',
          votedAt: new Date().toISOString()
        };
        updatedVotes = [...currentVotes, newVote];
      }

      // ── Automated 2/3 Admin Quorum Transitions ──
      if (currentStatus === 'under_review' && updatedVotes.length >= 2) {
        // Threshold reached for Under Review: Promote to Open for Voting
        transaction.update(suggestionDocRef, {
          status: 'open',
          review_admin_votes: updatedVotes,
          admin_votes: [],
          updated_at: new Date().toISOString()
        });
        return {
          admin_votes: [],
          status: 'open',
          autoTransitioned: true,
          transitionType: 'opened_for_voting' as const
        };
      } else if ((currentStatus === 'open' || currentStatus === 'active') && updatedVotes.length >= 2) {
        // Threshold reached for Open for Voting: Promote to Approved for Contest
        transaction.update(suggestionDocRef, {
          status: 'approved',
          admin_votes: updatedVotes,
          updated_at: new Date().toISOString()
        });
        return {
          admin_votes: updatedVotes,
          status: 'approved',
          autoTransitioned: true,
          transitionType: 'approved_for_contest' as const
        };
      } else {
        transaction.update(suggestionDocRef, {
          admin_votes: updatedVotes,
          updated_at: new Date().toISOString()
        });
        return {
          admin_votes: updatedVotes,
          status: currentStatus,
          autoTransitioned: false
        };
      }
    });

    return result;
  } catch (error: any) {
    console.error('Error toggling admin suggestion vote:', error);
    throw new Error(error?.message || 'Failed to submit admin decision vote.');
  }
}
