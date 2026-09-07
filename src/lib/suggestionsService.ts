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
  SuggestionAdminVote,
  SuggestionBetaTester
} from '../types';
import { SITE_CONFIG, MAX_CATEGORY_SUGGESTIONS_PER_USER } from '../config';

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

// In-flight concurrency lock maps to deduplicate rapid simultaneous votes and prevent Firestore transaction floods
const inFlightVotePromises = new Map<string, Promise<{ score: number; user_vote: number; upvotes: number; downvotes: number; voters_sample?: SuggestionVoterSummary[] }>>();
const inFlightAdminVotePromises = new Map<string, Promise<AdminVoteResult>>();

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
      const scoreA = a.score !== undefined ? a.score : (a.upvotes || 0) - (a.downvotes || 0);
      const scoreB = b.score !== undefined ? b.score : (b.upvotes || 0) - (b.downvotes || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if ((b.upvotes || 0) !== (a.upvotes || 0)) return (b.upvotes || 0) - (a.upvotes || 0);
      if ((a.downvotes || 0) !== (b.downvotes || 0)) return (a.downvotes || 0) - (b.downvotes || 0);
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB; // deterministic tiebreak: earlier submission first
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'lowest') {
      const scoreA = a.score !== undefined ? a.score : (a.upvotes || 0) - (a.downvotes || 0);
      const scoreB = b.score !== undefined ? b.score : (b.upvotes || 0) - (b.downvotes || 0);
      if (scoreA !== scoreB) return scoreA - scoreB;
      if ((a.upvotes || 0) !== (b.upvotes || 0)) return (a.upvotes || 0) - (b.upvotes || 0);
      if ((b.downvotes || 0) !== (a.downvotes || 0)) return (b.downvotes || 0) - (a.downvotes || 0);
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'oldest') {
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    }
    // newest / default
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return b.id.localeCompare(a.id);
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
        status: (data.status === 'active' || !data.status) ? 'open' : data.status,
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
          status: (data.status === 'active' || !data.status) ? 'open' : data.status,
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
 * Single central rule for whether a category suggestion is considered active
 * and consumes a user submission slot.
 */
export function isSuggestionActive(status?: string | null): boolean {
  if (!status) return true; // default status is 'open'
  const s = status.trim().toLowerCase();
  return s !== 'removed' && s !== 'declined' && s !== 'rejected' && s !== 'archived';
}

export function suggestionConsumesSlot(suggestion: { status?: string | null }): boolean {
  return isSuggestionActive(suggestion.status);
}

/**
 * Authoritative Category Suggestion Statistics.
 */
export interface CategorySuggestionStats {
  suggestions: number;
  votes: number;
  voters: number;
}

/**
 * Authoritatively compute the database ground truth for Category Suggestion counters:
 * - suggestions: count of active suggestions in Firestore
 * - votes: count of all active non-neutral votes (vote === 1 || vote === -1) on active suggestions
 * - voters: count of unique Discord users with at least one active non-neutral vote on an active suggestion
 */
export async function getCategorySuggestionStats(): Promise<CategorySuggestionStats> {
  try {
    const [suggestionsSnap, votesSnap] = await Promise.all([
      getDocs(collection(db, SUGGESTIONS_COLLECTION)),
      getDocs(collection(db, VOTES_COLLECTION))
    ]);

    const activeSuggestionIds = new Set<string>();
    let activeSuggestionsCount = 0;

    suggestionsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (suggestionConsumesSlot(data)) {
        activeSuggestionIds.add(docSnap.id);
        activeSuggestionsCount++;
      }
    });

    let totalVotes = 0;
    const uniqueVoters = new Set<string>();

    votesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const voteVal = Number(data.vote || 0);
      if (activeSuggestionIds.has(data.suggestion_id) && (voteVal === 1 || voteVal === -1)) {
        totalVotes++;
        const voterId = data.discord_id || data.user_id;
        if (voterId) {
          uniqueVoters.add(String(voterId));
        }
      }
    });

    return {
      suggestions: activeSuggestionsCount,
      votes: totalVotes,
      voters: uniqueVoters.size
    };
  } catch (err) {
    console.error('Error computing category suggestion stats:', err);
    return { suggestions: 0, votes: 0, voters: 0 };
  }
}

/**
 * Real-time subscription to authoritative category suggestion stats.
 * Uses a lightweight debounce to synchronize counters across tabs and users without polling.
 */
export function subscribeCategorySuggestionStats(
  onUpdate: (stats: CategorySuggestionStats) => void,
  onError?: (err: Error) => void
): () => void {
  let debounceTimer: any = null;
  const activeSuggestionsMap = new Map<string, boolean>();
  const votesMap = new Map<string, { suggestion_id: string; vote: number; voterId: string }>();

  const computeAndEmit = () => {
    let activeSuggestionsCount = 0;
    const activeIds = new Set<string>();
    for (const [id, isActive] of activeSuggestionsMap.entries()) {
      if (isActive) {
        activeSuggestionsCount++;
        activeIds.add(id);
      }
    }

    let totalVotes = 0;
    const uniqueVoters = new Set<string>();

    for (const v of votesMap.values()) {
      if (activeIds.has(v.suggestion_id) && (v.vote === 1 || v.vote === -1)) {
        totalVotes++;
        if (v.voterId) {
          uniqueVoters.add(v.voterId);
        }
      }
    }

    onUpdate({
      suggestions: activeSuggestionsCount,
      votes: totalVotes,
      voters: uniqueVoters.size
    });
  };

  const scheduleCompute = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(computeAndEmit, 60);
  };

  const unsubSuggestions = onSnapshot(
    collection(db, SUGGESTIONS_COLLECTION),
    (snap) => {
      activeSuggestionsMap.clear();
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        activeSuggestionsMap.set(docSnap.id, suggestionConsumesSlot(data));
      });
      scheduleCompute();
    },
    (err) => {
      console.warn('Suggestions stats listener error:', err);
      if (onError) onError(err);
    }
  );

  const unsubVotes = onSnapshot(
    collection(db, VOTES_COLLECTION),
    (snap) => {
      votesMap.clear();
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const voteVal = Number(data.vote || 0);
        const voterId = String(data.discord_id || data.user_id || '');
        if (data.suggestion_id && voterId) {
          votesMap.set(docSnap.id, {
            suggestion_id: data.suggestion_id,
            vote: voteVal,
            voterId
          });
        }
      });
      scheduleCompute();
    },
    (err) => {
      console.warn('Votes stats listener error:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    unsubSuggestions();
    unsubVotes();
  };
}

/**
 * User Suggestion Limit State
 */
export interface UserSuggestionLimitState {
  limit: number;
  used: number;
  remaining: number;
  canSuggest: boolean;
}

export interface SubmitSuggestionResult extends CategorySuggestion {
  success: boolean;
  suggestion: CategorySuggestion;
  stats?: CategorySuggestionStats;
  userSuggestionLimit: UserSuggestionLimitState;
  suggestionLimit: UserSuggestionLimitState; // backward compatibility
}

/**
 * Fetch total number of active suggestions submitted by a specific user or Discord ID.
 */
export async function fetchUserSuggestionCount(userId: string, discordId?: string | null): Promise<number> {
  if (!userId && !discordId) return 0;
  try {
    const countedIds = new Set<string>();
    let count = 0;

    if (userId) {
      const userSnap = await getDocs(
        query(collection(db, SUGGESTIONS_COLLECTION), where('user_id', '==', String(userId)))
      );
      userSnap.forEach((d) => {
        const data = d.data();
        if (suggestionConsumesSlot(data)) {
          countedIds.add(d.id);
          count++;
        }
      });
    }

    if (discordId) {
      const discordSnap = await getDocs(
        query(collection(db, SUGGESTIONS_COLLECTION), where('discord_id', '==', String(discordId)))
      );
      discordSnap.forEach((d) => {
        const data = d.data();
        if (!countedIds.has(d.id) && suggestionConsumesSlot(data)) {
          countedIds.add(d.id);
          count++;
        }
      });
    }

    return count;
  } catch (err) {
    console.warn('Error fetching user suggestion count:', err);
    return 0;
  }
}

/**
 * Authoritatively fetch the user's database-backed submission limit, usage, and remaining slots.
 */
export async function getUserSuggestionAllowance(
  userId?: string | null,
  discordId?: string | null
): Promise<UserSuggestionLimitState> {
  const maxAllowed = SITE_CONFIG.categorySuggestions.maxSuggestionsPerUser || MAX_CATEGORY_SUGGESTIONS_PER_USER;
  if (!userId && !discordId) {
    return {
      limit: maxAllowed,
      used: 0,
      remaining: maxAllowed,
      canSuggest: false
    };
  }

  const used = await fetchUserSuggestionCount(userId || '', discordId);
  const remaining = Math.max(0, maxAllowed - used);
  return {
    limit: maxAllowed,
    used,
    remaining,
    canSuggest: remaining > 0
  };
}

export const getUserSuggestionLimit = getUserSuggestionAllowance;

/**
 * Submit a new category suggestion attached to the user's Discord profile.
 * Validates character limits, trims whitespace, prevents duplicate categories, and enforces per-user limit.
 */
export async function submitCategorySuggestion(
  input: CreateSuggestionInput
): Promise<SubmitSuggestionResult> {
  const trimmedName = input.category_name.trim();
  const trimmedDesc = (input.description || '').trim();

  if (!trimmedName) throw new Error('Category name is required.');
  if (trimmedName.length < 3) throw new Error('Category name must be at least 3 characters long.');
  if (trimmedName.length > 100) throw new Error('Category name cannot exceed 100 characters.');
  if (trimmedDesc.length > 1000) throw new Error('Description cannot exceed 1000 characters.');

  // 1. Authoritatively enforce per-user suggestion limit
  const primaryDiscordId = input.discord_id || input.author_discord_id || null;
  const limitState = await getUserSuggestionLimit(input.user_id, primaryDiscordId);
  if (!input.is_admin_author && limitState.remaining <= 0) {
    throw new Error(`You have reached the limit of ${limitState.limit} category suggestions.`);
  }

  // 2. Case-insensitive duplicate prevention (e.g., 'Street Racing' and 'street racing')
  const suggestionsSnap = await getDocs(collection(db, SUGGESTIONS_COLLECTION));
  const normalizedNewName = trimmedName.toLowerCase().replace(/\s+/g, ' ');
  const duplicate = suggestionsSnap.docs.find((d) => {
    const data = d.data();
    if (!suggestionConsumesSlot(data)) return false;
    const existingNormalized = (data.category_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return existingNormalized === normalizedNewName;
  });

  if (duplicate) {
    throw new Error(`A category suggestion titled "${trimmedName}" already exists. You can upvote it instead!`);
  }

  const suggestionRef = doc(collection(db, SUGGESTIONS_COLLECTION));
  const now = new Date().toISOString();

  const payload: any = {
    id: suggestionRef.id,
    category_name: trimmedName,
    description: trimmedDesc,
    user_id: String(input.user_id),
    discord_id: primaryDiscordId,
    discord_name: input.discord_name || input.author_name || 'Discord User',
    author_name: input.author_name || input.discord_name || 'Discord User',
    author_avatar_url: input.author_avatar_url || null,
    avatar_seed: input.avatar_seed || null,
    avatar_style: input.avatar_style || null,
    is_admin_author: !!input.is_admin_author,
    status: (input.status === 'active' || !input.status) ? 'open' : input.status,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    voters_sample: [],
    created_at: now,
    updated_at: now
  };

  await setDoc(suggestionRef, payload);

  const updatedUsed = limitState.used + 1;
  const updatedRemaining = Math.max(0, limitState.limit - updatedUsed);
  const updatedLimitState: UserSuggestionLimitState = {
    limit: limitState.limit,
    used: updatedUsed,
    remaining: updatedRemaining,
    canSuggest: input.is_admin_author || updatedRemaining > 0
  };

  const suggestionItem: CategorySuggestion = {
    ...payload,
    user_vote: 0
  };

  const stats = await getCategorySuggestionStats();

  return {
    ...suggestionItem,
    success: true,
    suggestion: suggestionItem,
    stats,
    userSuggestionLimit: updatedLimitState,
    suggestionLimit: updatedLimitState
  };
}

export interface CastCategoryVoteResult {
  score: number;
  user_vote: number;
  upvotes: number;
  downvotes: number;
  voters_sample?: SuggestionVoterSummary[];
  stats?: CategorySuggestionStats;
}

/**
 * Cast, toggle, or invert a vote on a category suggestion using Firestore atomic transactions.
 * Enforces suggestionId + discordUserId database-level uniqueness to prevent duplicate voting.
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
): Promise<CastCategoryVoteResult> {
  if (!suggestionId || (!userId && !discordId)) {
    throw new Error('Missing suggestion or user identifier for voting.');
  }

  // Consistent unique document ID constraint: suggestionId + (discordId || userId)
  const voterKey = discordId ? String(discordId) : String(userId);
  const voteDocId = `${suggestionId}_${voterKey}`;
  const legacyVoteDocId = `${suggestionId}_${userId}`;
  const voteDocRef = doc(db, VOTES_COLLECTION, voteDocId);
  const legacyVoteDocRef = voteDocId !== legacyVoteDocId ? doc(db, VOTES_COLLECTION, legacyVoteDocId) : null;
  const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);

  // If a vote request for the same suggestion and user is already running, coalesce/await the active promise
  if (inFlightVotePromises.has(voteDocId)) {
    return inFlightVotePromises.get(voteDocId)!;
  }

  // Invalidate memory cache for this suggestion
  voterLookupMemoryCache.delete(suggestionId);

  const votePromise = (async () => {
    try {
      return await runTransaction(db, async (transaction) => {
        const gets: Promise<any>[] = [
          transaction.get(voteDocRef),
          transaction.get(suggestionDocRef)
        ];
        if (legacyVoteDocRef) {
          gets.push(transaction.get(legacyVoteDocRef));
        }

        const snaps = await Promise.all(gets);
        const voteDocSnap = snaps[0];
        const suggestionDocSnap = snaps[1];
        const legacyVoteDocSnap = legacyVoteDocRef ? snaps[2] : null;

        if (!suggestionDocSnap.exists()) {
          throw new Error('Category suggestion does not exist.');
        }

        const suggestionData = suggestionDocSnap.data();
        let currentUpvotes = Math.max(0, Number(suggestionData.upvotes || 0));
        let currentDownvotes = Math.max(0, Number(suggestionData.downvotes || 0));

        let oldVote = 0;
        if (voteDocSnap.exists()) {
          oldVote = Number(voteDocSnap.data().vote || 0);
        } else if (legacyVoteDocSnap && legacyVoteDocSnap.exists()) {
          oldVote = Number(legacyVoteDocSnap.data().vote || 0);
        }

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
        const filteredSample = existingSample.filter((v) => v.userId !== String(userId) && (!discordId || v.discordId !== String(discordId)));

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
          if (legacyVoteDocSnap && legacyVoteDocSnap.exists()) {
            transaction.delete(legacyVoteDocRef!);
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
          if (legacyVoteDocSnap && legacyVoteDocSnap.exists() && legacyVoteDocRef) {
            transaction.delete(legacyVoteDocRef);
          }
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
    } finally {
      inFlightVotePromises.delete(voteDocId);
    }
  })();

  inFlightVotePromises.set(voteDocId, votePromise);
  const txResult = await votePromise;
  const stats = await getCategorySuggestionStats();
  return {
    ...txResult,
    stats
  };
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

export interface DeleteSuggestionResult {
  success: boolean;
  stats: CategorySuggestionStats;
  userSuggestionLimit?: UserSuggestionLimitState;
}

/**
 * Delete a category suggestion and all of its associated vote documents in a single atomic batch.
 * Authoritatively recalculates Category Suggestion statistics and restores the submitter's suggestion allowance.
 */
export async function deleteCategorySuggestion(
  suggestionId: string,
  userId?: string | null,
  discordId?: string | null
): Promise<DeleteSuggestionResult> {
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

    const [stats, userSuggestionLimit] = await Promise.all([
      getCategorySuggestionStats(),
      (userId || discordId) ? getUserSuggestionAllowance(userId, discordId) : Promise.resolve(undefined)
    ]);

    return {
      success: true,
      stats,
      userSuggestionLimit
    };
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

/**
 * Edit title and description of an existing suggestion (e.g. for staff correcting typos or formatting).
 */
export async function updateCategorySuggestionContent(
  suggestionId: string,
  updates: { category_name?: string; description?: string }
): Promise<boolean> {
  try {
    const suggestionDocRef = doc(db, SUGGESTIONS_COLLECTION, suggestionId);
    const dataToUpdate: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.category_name !== undefined) {
      const trimmed = updates.category_name.trim();
      if (!trimmed) throw new Error('Category name cannot be empty.');
      dataToUpdate.category_name = trimmed;
    }
    if (updates.description !== undefined) {
      dataToUpdate.description = updates.description.trim();
    }
    await updateDoc(suggestionDocRef, dataToUpdate);
    return true;
  } catch (error: any) {
    console.error('Error editing suggestion content:', error);
    throw new Error(error?.message || 'Failed to edit category suggestion.');
  }
}

/**
 * Generate CSV export for category suggestions and community votes.
 */
export function exportSuggestionsToCSV(suggestions: CategorySuggestion[]): string {
  const headers = ['ID', 'Category Name', 'Description', 'Status', 'Score', 'Upvotes', 'Downvotes', 'Author Name', 'Discord ID', 'Created At'];
  const rows = suggestions.map((s) => [
    `"${s.id}"`,
    `"${(s.category_name || '').replace(/"/g, '""')}"`,
    `"${(s.description || '').replace(/"/g, '""')}"`,
    `"${s.status || 'open'}"`,
    s.score !== undefined ? s.score : (s.upvotes || 0) - (s.downvotes || 0),
    s.upvotes || 0,
    s.downvotes || 0,
    `"${(s.author_name || s.discord_name || '').replace(/"/g, '""')}"`,
    `"${s.discord_id || s.user_id || ''}"`,
    `"${s.created_at || ''}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
  const adminLockKey = `${suggestionId}_${adminId}`;
  if (inFlightAdminVotePromises.has(adminLockKey)) {
    return inFlightAdminVotePromises.get(adminLockKey)!;
  }

  const adminVotePromise = (async () => {
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

        const existingIndex = currentVotes.findIndex(
          (v) => v.adminId === adminId || (adminName && v.adminName && v.adminName.toLowerCase() === adminName.toLowerCase())
        );
        let updatedVotes: SuggestionAdminVote[] = [];

        if (existingIndex >= 0) {
          // Toggle off (remove admin vote)
          updatedVotes = currentVotes.filter((_, idx) => idx !== existingIndex);
        } else {
          // Toggle on (add admin vote)
          const newVote: SuggestionAdminVote = {
            adminId: String(adminId),
            adminName: adminName || 'Admin',
            adminAvatarUrl: adminAvatarUrl || null,
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
    } finally {
      inFlightAdminVotePromises.delete(adminLockKey);
    }
  })();

  inFlightAdminVotePromises.set(adminLockKey, adminVotePromise);
  return await adminVotePromise;
}

// ── Suggestion Beta Testers Access Management ──

export const BETA_TESTERS_COLLECTION = 'suggestion_beta_testers';

/**
 * Add or update a user's beta testing authorization by Discord ID.
 */
export async function addBetaTester(
  discordId: string,
  notes: string = '',
  addedBy: string = 'Admin',
  discordName?: string
): Promise<SuggestionBetaTester> {
  const cleanId = String(discordId).trim().replace(/\D/g, '');
  if (!cleanId || cleanId.length < 15) {
    throw new Error('Please enter a valid numeric Discord ID (typically 17-20 digits).');
  }

  const cleanTesterData: Record<string, any> = {
    discordId: cleanId,
    addedBy: addedBy || 'Admin',
    addedAt: new Date().toISOString()
  };

  const cleanName = discordName?.trim();
  if (cleanName) {
    cleanTesterData.discordName = cleanName;
  }

  const cleanNotes = notes.trim();
  if (cleanNotes) {
    cleanTesterData.notes = cleanNotes;
  }

  const testerDocRef = doc(db, BETA_TESTERS_COLLECTION, cleanId);
  await setDoc(testerDocRef, cleanTesterData);
  return {
    discordId: cleanId,
    discordName: cleanName || undefined,
    notes: cleanNotes || undefined,
    addedBy: addedBy || 'Admin',
    addedAt: cleanTesterData.addedAt
  };
}

/**
 * Remove a user from the beta testing authorization list.
 */
export async function removeBetaTester(discordId: string): Promise<void> {
  const cleanId = String(discordId).trim();
  if (!cleanId) return;
  const testerDocRef = doc(db, BETA_TESTERS_COLLECTION, cleanId);
  await deleteDoc(testerDocRef);
}

/**
 * Fetch all registered suggestion beta testers.
 */
export async function fetchBetaTesters(): Promise<SuggestionBetaTester[]> {
  try {
    const snap = await getDocs(collection(db, BETA_TESTERS_COLLECTION));
    const testers: SuggestionBetaTester[] = [];
    snap.forEach((d) => {
      const data = d.data();
      testers.push({
        discordId: d.id,
        discordName: data.discordName || undefined,
        notes: data.notes || undefined,
        addedBy: data.addedBy || 'Admin',
        addedAt: data.addedAt || new Date().toISOString()
      });
    });
    // Newest first
    return testers.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  } catch (err) {
    console.error('Error fetching suggestion beta testers:', err);
    return [];
  }
}

/**
 * Real-time listener for suggestion beta testers.
 */
export function subscribeBetaTesters(
  onUpdate: (testers: SuggestionBetaTester[]) => void
): () => void {
  try {
    const colRef = collection(db, BETA_TESTERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        const testers: SuggestionBetaTester[] = [];
        snap.forEach((d) => {
          const data = d.data();
          testers.push({
            discordId: d.id,
            discordName: data.discordName || undefined,
            notes: data.notes || undefined,
            addedBy: data.addedBy || 'Admin',
            addedAt: data.addedAt || new Date().toISOString()
          });
        });
        testers.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        onUpdate(testers);
      },
      (err) => {
        console.warn('Beta testers snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to beta testers:', err);
    return () => {};
  }
}

/**
 * Beta restrictions lifted: all verified community members have access.
 * Retained as compatibility helper returning true.
 */
export async function checkIsBetaTester(_ids?: (string | undefined | null)[]): Promise<boolean> {
  return true;
}
