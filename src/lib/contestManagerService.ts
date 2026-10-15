import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Contest, ContestAuditLog, Category, Photo, CountdownSettings } from '../types';

export const CONTESTS_COLLECTION = 'contests';
export const CATEGORIES_COLLECTION = 'categories';
export const PHOTOS_COLLECTION = 'photos';
export const VOTES_COLLECTION = 'votes';
export const AUDIT_LOGS_COLLECTION = 'contest_audit_logs';
export const SETTINGS_COLLECTION = 'settings';

export interface AdminActor {
  uid: string;
  name: string;
  discordId?: string;
  avatarUrl?: string;
}

/**
 * Format milliseconds remaining into human readable string e.g. "2d 4h 15m"
 */
export function formatRemainingTime(ms?: number): string {
  if (ms == null || isNaN(ms)) return 'No deadline set';
  if (ms <= 0) return 'Expired / Closed';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${Math.max(1, minutes)}m remaining`;
}

/**
 * Record an audit log entry in Firestore
 */
export async function recordContestAuditLog(
  action: ContestAuditLog['action'],
  contestId: string,
  contestName: string,
  details: string,
  admin: AdminActor,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
    const logEntry: ContestAuditLog = {
      id: logRef.id,
      contest_id: contestId,
      contest_name: contestName,
      action,
      details,
      performed_by_uid: admin.uid,
      performed_by_name: admin.name || 'Admin',
      performed_by_avatar: admin.avatarUrl,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    };
    await setDoc(logRef, logEntry);
  } catch (err) {
    console.error('Failed to record contest audit log:', err);
  }
}

/**
 * Fetch all contests sorted by creation date descending
 */
export async function fetchAllContests(): Promise<Contest[]> {
  try {
    const q = query(collection(db, CONTESTS_COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || 'Untitled Contest',
        description: data.description || '',
        status: data.status || (data.is_active ? 'active' : 'archived'),
        phase: data.phase || (data.votingOpen ? 'voting' : data.submissionsOpen ? 'submissions' : 'completed'),
        is_active: !!data.is_active,
        submissions_close_date: data.submissions_close_date,
        voting_end_date: data.voting_end_date,
        rulesMarkdown: data.rulesMarkdown,
        paused_at: data.paused_at || null,
        paused_remaining_submissions_ms: data.paused_remaining_submissions_ms,
        paused_remaining_voting_ms: data.paused_remaining_voting_ms,
        previous_phase: data.previous_phase,
        submissionsOpen: data.submissionsOpen,
        votingOpen: data.votingOpen,
        countdownSettings: data.countdownSettings || null,
        submission_count: data.submission_count ?? 0,
        vote_count: data.vote_count ?? 0,
        category_count: data.category_count ?? 0,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at,
        resumed_at: data.resumed_at,
        archived_at: data.archived_at,
      } as Contest;
    });
  } catch (err) {
    console.error('Failed to fetch contests:', err);
    return [];
  }
}

/**
 * Fetch contest audit logs
 */
export async function fetchContestAuditLogs(maxLogs: number = 40): Promise<ContestAuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContestAuditLog));
  } catch (err) {
    console.error('Failed to fetch contest audit logs:', err);
    return [];
  }
}

/**
 * Fetch categories for a specific contest
 */
export async function fetchCategoriesForContest(contestId: string): Promise<Category[]> {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), where('contest_id', '==', contestId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
  } catch (err) {
    console.error('Failed to fetch categories for contest:', contestId, err);
    return [];
  }
}

/**
 * Count photos and votes for a specific contest
 */
export async function getContestStats(contestId: string, contestCategories?: Category[]): Promise<{
  submissionCount: number;
  voteCount: number;
}> {
  try {
    const categories = contestCategories || (await fetchCategoriesForContest(contestId));
    const categoryIds = new Set(categories.map((c) => c.id));

    const photosSnap = await getDocs(collection(db, PHOTOS_COLLECTION));
    let submissionCount = 0;
    let voteCount = 0;

    photosSnap.docs.forEach((d) => {
      const data = d.data();
      const belongs =
        data.contest_id === contestId ||
        (!data.contest_id && data.category_id && categoryIds.has(data.category_id));
      if (belongs) {
        submissionCount++;
        voteCount += Number(data.vote_count || 0);
      }
    });

    return { submissionCount, voteCount };
  } catch (err) {
    console.error('Failed to calculate contest stats:', err);
    return { submissionCount: 0, voteCount: 0 };
  }
}

/**
 * Parameters to Pause and Create a Replacement Contest
 */
export interface PauseAndCreateContestParams {
  currentContest: {
    id: string;
    name: string;
    submissions_close_date?: string;
    voting_end_date?: string;
  } | null;
  currentRules?: string;
  currentSubmissionsOpen?: boolean;
  currentVotingOpen?: boolean;
  currentCategories?: Category[];
  currentPhotos?: Photo[];
  newContest: {
    title: string;
    description?: string;
    rules: string;
    categories: { name: string; desc: string; emoji?: string }[];
    submissionsCloseDate?: string;
    votingEndDate?: string;
    submissionsOpen?: boolean;
    votingOpen?: boolean;
    publishImmediately?: boolean; // true = active, false = save as draft / paused
  };
  admin: AdminActor;
}

/**
 * 1. Atomically pause the current active contest without losing data.
 * 2. Freeze its deadlines and remaining time.
 * 3. Deploy the replacement contest with its new categories, rules, and settings.
 */
export async function pauseAndCreateNewContest(
  params: PauseAndCreateContestParams
): Promise<{ newContestId: string }> {
  const {
    currentContest,
    currentRules = '',
    currentSubmissionsOpen = false,
    currentVotingOpen = false,
    currentCategories = [],
    currentPhotos = [],
    newContest,
    admin,
  } = params;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const batch = writeBatch(db);

  // 1. Snapshot and Pause Current Active Contest(s)
  if (currentContest?.id) {
    const currentCloseMs = currentContest.submissions_close_date
      ? Math.max(0, new Date(currentContest.submissions_close_date).getTime() - now)
      : undefined;
    const currentVotingMs = currentContest.voting_end_date
      ? Math.max(0, new Date(currentContest.voting_end_date).getTime() - now)
      : undefined;

    // Filter current photos belonging to current contest
    const catIds = new Set(currentCategories.map((c) => c.id));
    const activeContestPhotos = currentPhotos.filter(
      (p) => p.contest_id === currentContest.id || (p.category_id && catIds.has(p.category_id))
    );
    const totalVotes = activeContestPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0);

    const prevPhase = currentVotingOpen
      ? 'voting'
      : currentSubmissionsOpen
      ? 'submissions'
      : 'completed';

    const currentDocRef = doc(db, CONTESTS_COLLECTION, currentContest.id);
    batch.update(currentDocRef, {
      is_active: false,
      status: 'paused',
      paused_at: nowIso,
      paused_remaining_submissions_ms: currentCloseMs ?? null,
      paused_remaining_voting_ms: currentVotingMs ?? null,
      previous_phase: prevPhase,
      phase: prevPhase,
      submissionsOpen: currentSubmissionsOpen,
      votingOpen: currentVotingOpen,
      rulesMarkdown: currentRules,
      submission_count: activeContestPhotos.length,
      vote_count: totalVotes,
      category_count: currentCategories.length,
      updated_at: nowIso,
    });

    // Make sure all active contest photos have contest_id set explicitly
    activeContestPhotos.forEach((photo) => {
      if (!photo.contest_id) {
        batch.update(doc(db, PHOTOS_COLLECTION, photo.id), { contest_id: currentContest.id });
      }
    });

    // Audit log for pausing current contest
    const pauseLogRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
    batch.set(pauseLogRef, {
      id: pauseLogRef.id,
      contest_id: currentContest.id,
      contest_name: currentContest.name,
      action: 'pause',
      details: `Safely paused contest. Frozen with ${activeContestPhotos.length} entries, ${totalVotes} votes. Remaining: ${formatRemainingTime(currentCloseMs)} (submissions), ${formatRemainingTime(currentVotingMs)} (voting).`,
      performed_by_uid: admin.uid,
      performed_by_name: admin.name || 'Admin',
      performed_by_avatar: admin.avatarUrl || null,
      timestamp: nowIso,
    });
  } else {
    // If no active contest was provided, check if any contest is currently active in DB and deactivate it
    const qActive = query(collection(db, CONTESTS_COLLECTION), where('is_active', '==', true));
    const activeSnaps = await getDocs(qActive);
    activeSnaps.forEach((d) => {
      batch.update(d.ref, { is_active: false, status: 'paused', paused_at: nowIso, updated_at: nowIso });
    });
  }

  // 2. Create the New Replacement Contest
  const isPublish = newContest.publishImmediately !== false;
  const newContestRef = doc(collection(db, CONTESTS_COLLECTION));
  const newContestId = newContestRef.id;

  const initialPhase = newContest.votingOpen
    ? 'voting'
    : newContest.submissionsOpen !== false
    ? 'submissions'
    : 'completed';

  const newContestData: Partial<Contest> = {
    name: newContest.title.trim(),
    description: newContest.description?.trim() || '',
    is_active: isPublish,
    status: isPublish ? 'active' : 'paused',
    phase: initialPhase,
    rulesMarkdown: newContest.rules || '',
    submissions_close_date: newContest.submissionsCloseDate || undefined,
    voting_end_date: newContest.votingEndDate || undefined,
    submissionsOpen: isPublish ? (newContest.submissionsOpen ?? true) : false,
    votingOpen: isPublish ? (newContest.votingOpen ?? false) : false,
    submission_count: 0,
    vote_count: 0,
    category_count: newContest.categories.length,
    created_at: nowIso,
    updated_at: nowIso,
  };

  batch.set(newContestRef, newContestData);

  // 3. Create Categories for the New Contest
  newContest.categories.forEach((cat) => {
    const catRef = doc(collection(db, CATEGORIES_COLLECTION));
    batch.set(catRef, {
      contest_id: newContestId,
      name: cat.name.trim(),
      description: cat.desc.trim(),
      emoji: cat.emoji || '✨',
    });
  });

  // 4. If Published Immediately, Synchronize to settings/global
  if (isPublish) {
    const globalSettingsUpdates: Record<string, any> = {
      rulesMarkdown: newContest.rules || '',
      submissionsOpen: newContest.submissionsOpen ?? true,
      votingOpen: newContest.votingOpen ?? false,
    };

    if (newContest.submissionsCloseDate) {
      globalSettingsUpdates.countdownSettings = {
        enabled: true,
        mode: 'submissions',
        targetDate: newContest.submissionsCloseDate,
        label: `${newContest.title.trim()} Submissions Close`,
        updatedAt: nowIso,
        updatedBy: admin.name || 'Admin',
      };
    }

    batch.set(doc(db, SETTINGS_COLLECTION, 'global'), globalSettingsUpdates, { merge: true });
  }

  // 5. Audit Log for Creation
  const createLogRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
  batch.set(createLogRef, {
    id: createLogRef.id,
    contest_id: newContestId,
    contest_name: newContest.title.trim(),
    action: 'create',
    details: isPublish
      ? `Created and published replacement contest with ${newContest.categories.length} categories.`
      : `Created contest draft with ${newContest.categories.length} categories.`,
    performed_by_uid: admin.uid,
    performed_by_name: admin.name || 'Admin',
    performed_by_avatar: admin.avatarUrl || null,
    timestamp: nowIso,
  });

  // Commit atomic batch
  await batch.commit();

  return { newContestId };
}

/**
 * Parameters for Restoring a Saved Contest
 */
export interface RestoreContestParams {
  targetContestId: string;
  activeContestAction: 'pause' | 'archive' | 'none';
  currentActiveContest: {
    id: string;
    name: string;
    submissions_close_date?: string;
    voting_end_date?: string;
  } | null;
  currentCategories?: Category[];
  currentPhotos?: Photo[];
  currentRules?: string;
  currentSubmissionsOpen?: boolean;
  currentVotingOpen?: boolean;
  deadlineOption: 'auto_preserve' | 'custom' | 'keep_original';
  customSubmissionsCloseDate?: string;
  customVotingEndDate?: string;
  admin: AdminActor;
}

/**
 * Restore a previously paused or saved contest.
 * Accurately recalculates deadlines so paused contests do not lose time.
 */
export async function restoreSavedContest(params: RestoreContestParams): Promise<void> {
  const {
    targetContestId,
    activeContestAction,
    currentActiveContest,
    currentCategories = [],
    currentPhotos = [],
    currentRules = '',
    currentSubmissionsOpen = false,
    currentVotingOpen = false,
    deadlineOption,
    customSubmissionsCloseDate,
    customVotingEndDate,
    admin,
  } = params;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 1. Fetch Target Contest Doc
  const targetDocSnap = await getDoc(doc(db, CONTESTS_COLLECTION, targetContestId));
  if (!targetDocSnap.exists()) {
    throw new Error('Target contest does not exist.');
  }
  const targetData = targetDocSnap.data() as Contest;

  const batch = writeBatch(db);

  // 2. Handle Current Active Contest (if exists and different from target)
  if (currentActiveContest?.id && currentActiveContest.id !== targetContestId) {
    const catIds = new Set(currentCategories.map((c) => c.id));
    const activeContestPhotos = currentPhotos.filter(
      (p) => p.contest_id === currentActiveContest.id || (p.category_id && catIds.has(p.category_id))
    );
    const totalVotes = activeContestPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0);

    const currentDocRef = doc(db, CONTESTS_COLLECTION, currentActiveContest.id);

    if (activeContestAction === 'pause') {
      const currentCloseMs = currentActiveContest.submissions_close_date
        ? Math.max(0, new Date(currentActiveContest.submissions_close_date).getTime() - now)
        : undefined;
      const currentVotingMs = currentActiveContest.voting_end_date
        ? Math.max(0, new Date(currentActiveContest.voting_end_date).getTime() - now)
        : undefined;

      const prevPhase = currentVotingOpen
        ? 'voting'
        : currentSubmissionsOpen
        ? 'submissions'
        : 'completed';

      batch.update(currentDocRef, {
        is_active: false,
        status: 'paused',
        paused_at: nowIso,
        paused_remaining_submissions_ms: currentCloseMs ?? null,
        paused_remaining_voting_ms: currentVotingMs ?? null,
        previous_phase: prevPhase,
        phase: prevPhase,
        submissionsOpen: currentSubmissionsOpen,
        votingOpen: currentVotingOpen,
        rulesMarkdown: currentRules,
        submission_count: activeContestPhotos.length,
        vote_count: totalVotes,
        category_count: currentCategories.length,
        updated_at: nowIso,
      });

      // Audit log
      const pauseLogRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
      batch.set(pauseLogRef, {
        id: pauseLogRef.id,
        contest_id: currentActiveContest.id,
        contest_name: currentActiveContest.name,
        action: 'pause',
        details: `Paused to restore contest '${targetData.name}'. Preserved ${activeContestPhotos.length} entries, ${totalVotes} votes.`,
        performed_by_uid: admin.uid,
        performed_by_name: admin.name || 'Admin',
        performed_by_avatar: admin.avatarUrl || null,
        timestamp: nowIso,
      });
    } else if (activeContestAction === 'archive') {
      batch.update(currentDocRef, {
        is_active: false,
        status: 'archived',
        archived_at: nowIso,
        submission_count: activeContestPhotos.length,
        vote_count: totalVotes,
        category_count: currentCategories.length,
        updated_at: nowIso,
      });

      // Audit log
      const archiveLogRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
      batch.set(archiveLogRef, {
        id: archiveLogRef.id,
        contest_id: currentActiveContest.id,
        contest_name: currentActiveContest.name,
        action: 'archive',
        details: `Archived during contest switch. Preserved ${activeContestPhotos.length} entries, ${totalVotes} votes.`,
        performed_by_uid: admin.uid,
        performed_by_name: admin.name || 'Admin',
        performed_by_avatar: admin.avatarUrl || null,
        timestamp: nowIso,
      });
    }
  }

  // Deactivate any other active contests just in case
  const qOtherActive = query(collection(db, CONTESTS_COLLECTION), where('is_active', '==', true));
  const otherSnaps = await getDocs(qOtherActive);
  otherSnaps.forEach((d) => {
    if (d.id !== targetContestId && d.id !== currentActiveContest?.id) {
      batch.update(d.ref, { is_active: false, status: 'paused', paused_at: nowIso, updated_at: nowIso });
    }
  });

  // 3. Recalculate Deadlines for Restored Contest
  let newSubmissionsCloseDate = targetData.submissions_close_date;
  let newVotingEndDate = targetData.voting_end_date;

  if (deadlineOption === 'custom') {
    if (customSubmissionsCloseDate) newSubmissionsCloseDate = customSubmissionsCloseDate;
    if (customVotingEndDate) newVotingEndDate = customVotingEndDate;
  } else if (deadlineOption === 'auto_preserve') {
    // If we have preserved remaining time from when it was paused, add it to now!
    if (targetData.paused_remaining_submissions_ms != null && targetData.paused_remaining_submissions_ms > 0) {
      newSubmissionsCloseDate = new Date(now + targetData.paused_remaining_submissions_ms).toISOString();
    }
    if (targetData.paused_remaining_voting_ms != null && targetData.paused_remaining_voting_ms > 0) {
      newVotingEndDate = new Date(now + targetData.paused_remaining_voting_ms).toISOString();
    }
  }

  // 4. Determine Phase to Resume
  let resumeSubmissionsOpen = targetData.submissionsOpen ?? true;
  let resumeVotingOpen = targetData.votingOpen ?? false;
  let resumePhase: Contest['phase'] = targetData.previous_phase || targetData.phase || 'submissions';

  // If previous_phase was 'voting', reopen voting; if 'submissions', reopen submissions
  if (targetData.previous_phase === 'voting' || targetData.votingOpen) {
    resumeSubmissionsOpen = false;
    resumeVotingOpen = true;
    resumePhase = 'voting';
  } else if (targetData.previous_phase === 'submissions' || targetData.submissionsOpen) {
    resumeSubmissionsOpen = true;
    resumeVotingOpen = false;
    resumePhase = 'submissions';
  }

  // 5. Update Restored Contest Doc
  const restoredDocRef = doc(db, CONTESTS_COLLECTION, targetContestId);
  batch.update(restoredDocRef, {
    is_active: true,
    status: 'active',
    phase: resumePhase,
    submissionsOpen: resumeSubmissionsOpen,
    votingOpen: resumeVotingOpen,
    submissions_close_date: newSubmissionsCloseDate || null,
    voting_end_date: newVotingEndDate || null,
    paused_at: null,
    resumed_at: nowIso,
    updated_at: nowIso,
  });

  // 6. Synchronize into settings/global
  const settingsUpdate: Record<string, any> = {
    rulesMarkdown: targetData.rulesMarkdown || '',
    submissionsOpen: resumeSubmissionsOpen,
    votingOpen: resumeVotingOpen,
  };

  const activeDeadline = resumePhase === 'voting' ? newVotingEndDate : newSubmissionsCloseDate;
  if (activeDeadline) {
    settingsUpdate.countdownSettings = {
      enabled: true,
      mode: resumePhase === 'voting' ? 'voting' : 'submissions',
      targetDate: activeDeadline,
      label: `${targetData.name} ${resumePhase === 'voting' ? 'Voting Ends' : 'Submissions Close'}`,
      updatedAt: nowIso,
      updatedBy: admin.name || 'Admin',
    };
  }

  batch.set(doc(db, SETTINGS_COLLECTION, 'global'), settingsUpdate, { merge: true });

  // 7. Audit Log
  const restoreLogRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
  batch.set(restoreLogRef, {
    id: restoreLogRef.id,
    contest_id: targetContestId,
    contest_name: targetData.name,
    action: 'restore',
    details: `Restored contest. Resumed phase '${resumePhase}'. Submissions deadline: ${newSubmissionsCloseDate ? new Date(newSubmissionsCloseDate).toLocaleString() : 'None'}, Voting deadline: ${newVotingEndDate ? new Date(newVotingEndDate).toLocaleString() : 'None'}.`,
    performed_by_uid: admin.uid,
    performed_by_name: admin.name || 'Admin',
    performed_by_avatar: admin.avatarUrl || null,
    timestamp: nowIso,
  });

  await batch.commit();
}

/**
 * Pause the active contest only (without launching a new one immediately)
 */
export async function pauseActiveContest(
  contestId: string,
  contestName: string,
  admin: AdminActor,
  options?: {
    currentPhotos?: Photo[];
    currentCategories?: Category[];
    submissions_close_date?: string;
    voting_end_date?: string;
    submissionsOpen?: boolean;
    votingOpen?: boolean;
    rulesMarkdown?: string;
  }
): Promise<void> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const currentCloseMs = options?.submissions_close_date
    ? Math.max(0, new Date(options.submissions_close_date).getTime() - now)
    : undefined;
  const currentVotingMs = options?.voting_end_date
    ? Math.max(0, new Date(options.voting_end_date).getTime() - now)
    : undefined;

  const prevPhase = options?.votingOpen
    ? 'voting'
    : options?.submissionsOpen
    ? 'submissions'
    : 'completed';

  const batch = writeBatch(db);

  batch.update(doc(db, CONTESTS_COLLECTION, contestId), {
    is_active: false,
    status: 'paused',
    paused_at: nowIso,
    paused_remaining_submissions_ms: currentCloseMs ?? null,
    paused_remaining_voting_ms: currentVotingMs ?? null,
    previous_phase: prevPhase,
    phase: prevPhase,
    submissionsOpen: options?.submissionsOpen ?? false,
    votingOpen: options?.votingOpen ?? false,
    updated_at: nowIso,
    ...(options?.rulesMarkdown ? { rulesMarkdown: options.rulesMarkdown } : {}),
  });

  // Temporarily close both gates in settings/global
  batch.set(
    doc(db, SETTINGS_COLLECTION, 'global'),
    { submissionsOpen: false, votingOpen: false },
    { merge: true }
  );

  // Audit log
  const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
  batch.set(logRef, {
    id: logRef.id,
    contest_id: contestId,
    contest_name: contestName,
    action: 'pause',
    details: `Contest manually paused by administrator. Frozen time: ${formatRemainingTime(currentCloseMs)} (submissions), ${formatRemainingTime(currentVotingMs)} (voting).`,
    performed_by_uid: admin.uid,
    performed_by_name: admin.name || 'Admin',
    performed_by_avatar: admin.avatarUrl || null,
    timestamp: nowIso,
  });

  await batch.commit();
}

/**
 * Archive a contest directly
 */
export async function archiveContestDirectly(
  contestId: string,
  contestName: string,
  admin: AdminActor
): Promise<void> {
  const nowIso = new Date().toISOString();
  const batch = writeBatch(db);

  batch.update(doc(db, CONTESTS_COLLECTION, contestId), {
    is_active: false,
    status: 'archived',
    archived_at: nowIso,
    updated_at: nowIso,
  });

  const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
  batch.set(logRef, {
    id: logRef.id,
    contest_id: contestId,
    contest_name: contestName,
    action: 'archive',
    details: 'Contest archived by administrator.',
    performed_by_uid: admin.uid,
    performed_by_name: admin.name || 'Admin',
    performed_by_avatar: admin.avatarUrl || null,
    timestamp: nowIso,
  });

  await batch.commit();
}

/**
 * Delete a contest draft or archived contest (safely verifies before deletion)
 */
export async function deleteContest(
  contestId: string,
  contestName: string,
  admin: AdminActor
): Promise<void> {
  const nowIso = new Date().toISOString();
  const batch = writeBatch(db);

  // Delete categories for this contest
  const qCats = query(collection(db, CATEGORIES_COLLECTION), where('contest_id', '==', contestId));
  const catSnaps = await getDocs(qCats);
  catSnaps.forEach((d) => batch.delete(d.ref));

  // Delete contest doc
  batch.delete(doc(db, CONTESTS_COLLECTION, contestId));

  // Audit log
  const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
  batch.set(logRef, {
    id: logRef.id,
    contest_id: contestId,
    contest_name: contestName,
    action: 'delete',
    details: `Contest record and its ${catSnaps.size} category document(s) permanently deleted.`,
    performed_by_uid: admin.uid,
    performed_by_name: admin.name || 'Admin',
    performed_by_avatar: admin.avatarUrl || null,
    timestamp: nowIso,
  });

  await batch.commit();
}

/**
 * Update contest details (Name, Description, Dates, Rules)
 */
export async function updateContestDetails(
  contestId: string,
  updates: {
    name?: string;
    description?: string;
    rulesMarkdown?: string;
    submissions_close_date?: string;
    voting_end_date?: string;
  },
  admin: AdminActor
): Promise<void> {
  const nowIso = new Date().toISOString();
  const batch = writeBatch(db);

  const cleanUpdates: Record<string, any> = {
    ...updates,
    updated_at: nowIso,
  };

  batch.update(doc(db, CONTESTS_COLLECTION, contestId), cleanUpdates);

  // If this is the active contest, also update settings/global
  const contestSnap = await getDoc(doc(db, CONTESTS_COLLECTION, contestId));
  if (contestSnap.exists() && contestSnap.data().is_active) {
    const globalUpdates: Record<string, any> = {};
    if (updates.rulesMarkdown !== undefined) {
      globalUpdates.rulesMarkdown = updates.rulesMarkdown;
    }
    if (Object.keys(globalUpdates).length > 0) {
      batch.set(doc(db, SETTINGS_COLLECTION, 'global'), globalUpdates, { merge: true });
    }
  }

  // Audit log
  const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
  batch.set(logRef, {
    id: logRef.id,
    contest_id: contestId,
    contest_name: updates.name || contestSnap.data()?.name || 'Contest',
    action: 'edit',
    details: `Updated contest settings (${Object.keys(updates).join(', ')}).`,
    performed_by_uid: admin.uid,
    performed_by_name: admin.name || 'Admin',
    performed_by_avatar: admin.avatarUrl || null,
    timestamp: nowIso,
  });

  await batch.commit();
}
