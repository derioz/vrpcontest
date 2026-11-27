import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, UserCheck, Heart, Image as ImageIcon, Sparkles, ExternalLink, Calendar,
  User, Tag, ShieldCheck, RefreshCw, CheckCircle2, Ban
} from 'lucide-react';
import { collection, query, doc, updateDoc, increment, getDocs, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category, Photo } from '../../types';
import LightboxModal from '../LightboxModal';
import { Button, EmptyState, PageHeader, Panel, SearchField } from './kit';
import { useConfirm } from './confirm';
import { cn } from '../../lib/utils';
import { toast } from '../ui/toast';
import { getProfileAvatar, type DiceBearStyleName } from '../../lib/dicebear';
import { Skeleton } from '../ui/skeleton';

interface AdminVoterSearchProps {
  allPhotos: Photo[];
  categories: Category[];
}

interface VoteRecord {
  id: string;
  photoId: string;
  voterUid: string;
  voterName: string;
  voterDiscord: string;
  timestamp?: string;
}

interface VoterSummary {
  id: string;
  voterUid: string;
  displayName: string;
  voterDiscord: string;
  voteCount: number;
  votes: VoteRecord[];
}

interface RegisteredUser {
  uid: string;
  displayName: string;
  discordName?: string;
  discordId?: string;
  avatarUrl?: string;
  discordAvatarUrl?: string;
  avatarSeed?: string;
  avatarStyle?: DiceBearStyleName;
  avatarSource?: 'discord' | 'dicebear';
}

export function AdminVoterSearch({ allPhotos, categories }: AdminVoterSearchProps) {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<Map<string, RegisteredUser>>(new Map());
  const [archivedUserStats, setArchivedUserStats] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const confirm = useConfirm();
  const [selectedVoterId, setSelectedVoterId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Fetch all votes (active + historic) and user_stats across contests
  const fetchVotesAndUsers = async () => {
    setIsLoading(true);
    try {
      const allFetchedVotes: VoteRecord[] = [];
      const usersPromise = getDocs(collection(db, 'users'));

      // 1. Fetch active votes for current contest
      const votesQuery = query(collection(db, 'votes'));
      const votesSnap = await getDocs(votesQuery);
      votesSnap.docs.forEach((d) => {
        const data = d.data();
        const voterDiscord = (data.voterDiscord as string) || (data.voterName as string) || '';
        const voterName = (data.voterName as string) || voterDiscord;
        allFetchedVotes.push({
          id: d.id,
          photoId: String(data.photoId || ''),
          voterUid: String(data.voterUid || d.id),
          voterName,
          voterDiscord,
          timestamp: data.timestamp as string | undefined,
        });
      });

      // 2. Fetch archived historical votes (if available from past rounds)
      try {
        const archVotesSnap = await getDocs(collection(db, 'archived_votes'));
        archVotesSnap.docs.forEach((d) => {
          const data = d.data();
          const voterDiscord = (data.voterDiscord as string) || (data.voterName as string) || '';
          const voterName = (data.voterName as string) || voterDiscord;
          allFetchedVotes.push({
            id: d.id,
            photoId: String(data.photoId || ''),
            voterUid: String(data.voterUid || d.id),
            voterName,
            voterDiscord,
            timestamp: (data.timestamp || data.archived_at) as string | undefined,
          });
        });
      } catch (archErr) {
        console.warn('archived_votes query info:', archErr);
      }

      setVotes(allFetchedVotes);

      // Resolve voter avatars from their saved Discord/DiceBear profile preference.
      try {
        const usersSnap = await usersPromise;
        const usersMap = new Map<string, RegisteredUser>();
        usersSnap.docs.forEach((userDoc) => {
          const data = userDoc.data();
          const profile: RegisteredUser = {
            uid: String(data.uid || userDoc.id),
            displayName: String(data.custom_display_name || data.default_discord_name || data.discord_name || 'Discord User'),
            discordName: data.default_discord_name || data.discord_name,
            discordId: data.discord_id ? String(data.discord_id) : undefined,
            avatarUrl: data.photo_url || data.avatar_url || undefined,
            discordAvatarUrl: data.discord_avatar_url || undefined,
            avatarSeed: data.avatar_seed || String(data.uid || userDoc.id),
            avatarStyle: data.avatar_style as DiceBearStyleName | undefined,
            avatarSource: data.avatar_source as 'discord' | 'dicebear' | undefined,
          };
          usersMap.set(profile.uid, profile);
          if (profile.discordId) usersMap.set(profile.discordId, profile);
          usersMap.set(profile.displayName.toLowerCase(), profile);
          if (profile.discordName) usersMap.set(profile.discordName.toLowerCase(), profile);
        });
        setRegisteredUsers(usersMap);
      } catch (usersErr) {
        console.warn('users avatar query info:', usersErr);
      }

      // 3. Fetch cumulative user_stats from all previous contests
      try {
        const statsSnap = await getDocs(collection(db, 'user_stats'));
        const statsMap = new Map<string, number>();
        statsSnap.docs.forEach((d) => {
          const data = d.data();
          const archivedVotes = Number(data.archived_votes || 0);
          if (archivedVotes > 0 && d.id && d.id.toLowerCase() !== 'discord user') {
            statsMap.set(d.id.trim(), archivedVotes);
          }
        });
        setArchivedUserStats(statsMap);
      } catch (statErr) {
        console.warn('user_stats query info:', statErr);
      }
    } catch (err) {
      console.error('Failed to load voter database:', err);
      toast.error('Failed to load voter database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVotesAndUsers();
  }, []);

  // Reconcile and fix any desynchronized photo vote_counts from raw votes collection
  const handleRecalculateAllVoteCounts = async () => {
    const confirmSync = await confirm({
      title: 'Reconcile vote counts?',
      body: "Every recorded vote is counted again and each photo's total is set to match.",
      confirmLabel: 'Reconcile',
    });
    if (!confirmSync) return;

    const toastId = toast.loading('Re-syncing and reconciling all photo vote counts...');
    setIsProcessing(true);
    try {
      // 1. Fetch all active votes from 'votes' collection
      const votesSnap = await getDocs(collection(db, 'votes'));
      const voteCountMap = new Map<string, number>();

      votesSnap.docs.forEach((d) => {
        const photoId = String(d.data().photoId || '');
        if (photoId) {
          voteCountMap.set(photoId, (voteCountMap.get(photoId) || 0) + 1);
        }
      });

      // 2. Fetch all photos from 'photos' collection
      const photosSnap = await getDocs(collection(db, 'photos'));
      const batchSize = 450;
      let batch = writeBatch(db);
      let count = 0;
      let repairedCount = 0;

      for (const photoDoc of photosSnap.docs) {
        const actualCount = voteCountMap.get(photoDoc.id) || 0;
        const currentCount = photoDoc.data().vote_count || 0;

        if (currentCount !== actualCount) {
          batch.update(photoDoc.ref, { vote_count: actualCount });
          repairedCount++;
          count++;
          if (count % batchSize === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
      }

      if (count % batchSize !== 0 && count > 0) {
        await batch.commit();
      }

      await fetchVotesAndUsers();
      toast.success(
        repairedCount > 0
          ? `Successfully reconciled ${repairedCount} photo(s) to match exact database votes!`
          : 'All photo vote counts are already 100% accurate and in sync!',
        { id: toastId }
      );
    } catch (err: any) {
      console.error('Failed to recalculate vote counts:', err);
      toast.error('Failed to recalculate vote counts: ' + (err?.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // Map photos by ID
  const photosById = new Map<string, Photo>();
  allPhotos.forEach((p) => photosById.set(String(p.id), p));

  // Map categories by ID
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  const resolveVoterAvatar = (uid?: string, displayName?: string) => {
    const profile = registeredUsers.get(uid || '') || registeredUsers.get((displayName || '').toLowerCase());
    return getProfileAvatar(
      profile?.avatarUrl,
      profile?.avatarSeed || uid || displayName || 'vital-user',
      profile?.avatarStyle,
      profile?.avatarSource,
      profile?.discordAvatarUrl
    );
  };

  // Aggregate votes by voter
  const allVotersList = useMemo(() => {
    const voterSummariesMap = new Map<string, VoterSummary>();

    // 1. Process all actual votes (current contest + archived rounds)
    votes.forEach((vote) => {
      if (vote.voterDiscord === 'Discord User' && vote.voterName === 'Discord User') return;

      const rawName = (vote.voterDiscord || vote.voterName || vote.voterUid || '').trim();
      if (!rawName || rawName.toLowerCase() === 'discord user') return;

      const key = rawName.toLowerCase();
      if (!voterSummariesMap.has(key)) {
        voterSummariesMap.set(key, {
          id: key,
          voterUid: vote.voterUid || key,
          displayName: vote.voterDiscord || vote.voterName || rawName,
          voterDiscord: vote.voterDiscord || vote.voterName || rawName,
          voteCount: 0,
          votes: [],
        });
      }
      const summary = voterSummariesMap.get(key)!;
      summary.voteCount += 1;
      summary.votes.push(vote);
    });

    // 2. Overlay cumulative archived stats from previous contests
    archivedUserStats.forEach((pastVotes, discordKey) => {
      const rawKey = discordKey.trim();
      if (!rawKey || rawKey.toLowerCase() === 'discord user') return;
      const key = rawKey.toLowerCase();

      if (!voterSummariesMap.has(key)) {
        voterSummariesMap.set(key, {
          id: key,
          voterUid: rawKey,
          displayName: rawKey,
          voterDiscord: rawKey,
          voteCount: pastVotes,
          votes: [],
        });
      } else {
        const summary = voterSummariesMap.get(key)!;
        summary.voteCount = Math.max(summary.voteCount, summary.votes.length, pastVotes);
      }
    });

    // Filter out placeholder entries with 0 votes
    return Array.from(voterSummariesMap.values())
      .filter((v) => {
        const isPlaceholder = v.displayName.toLowerCase() === 'discord user' || v.voterDiscord.toLowerCase() === 'discord user';
        if (isPlaceholder) return false;
        return v.voteCount > 0;
      })
      .sort((a, b) => b.voteCount - a.voteCount);
  }, [votes, archivedUserStats]);

  // Memoize filtered voters by search query
  const searchTrimmed = searchQuery.toLowerCase().trim();
  const matchingVoters = useMemo(() => {
    return allVotersList.filter((v) => {
      if (!searchTrimmed) return true;
      return (
        v.displayName.toLowerCase().includes(searchTrimmed) ||
        v.voterDiscord.toLowerCase().includes(searchTrimmed) ||
        v.voterUid.toLowerCase().includes(searchTrimmed)
      );
    });
  }, [allVotersList, searchTrimmed]);

  // Selected voter details
  const activeVoter = useMemo(() => {
    if (!selectedVoterId) return null;
    return allVotersList.find((v) => v.id === selectedVoterId || v.voterUid === selectedVoterId) || null;
  }, [allVotersList, selectedVoterId]);

  // Active voter's photos
  const activeVoterPhotos = useMemo(() => {
    if (!activeVoter) return [];
    return activeVoter.votes
      .map((vote) => ({
        vote,
        photo: photosById.get(vote.photoId),
      }))
      .filter((item) => item.photo !== undefined);
  }, [activeVoter, photosById]);

  // The newest votes whose photo is still in this contest and whose voter is listed.
  const latestVotes = useMemo(() => {
    const listed = new Set(allVotersList.map((v) => v.id));
    const time = (v: VoteRecord) => Date.parse(v.timestamp || '') || 0;
    const rows: { vote: VoteRecord; photo: Photo; voterId: string }[] = [];
    for (const vote of [...votes].sort((a, b) => time(b) - time(a))) {
      const photo = photosById.get(vote.photoId);
      const voterId = (vote.voterDiscord || vote.voterName || vote.voterUid || '').trim().toLowerCase();
      if (photo && listed.has(voterId)) rows.push({ vote, photo, voterId });
      if (rows.length === 12) break;
    }
    return rows;
  }, [votes, allVotersList, photosById]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Voter audit"
        description={isLoading ? 'Loading votes' : `${allVotersList.length} voters on record`}
        actions={
          <>
            <Button onClick={fetchVotesAndUsers} disabled={isLoading || isProcessing} title="Fetch the latest votes and players">
              <RefreshCw size={14} aria-hidden="true" className={isLoading ? 'animate-spin' : undefined} /> Refresh
            </Button>
            <Button onClick={handleRecalculateAllVoteCounts} disabled={isProcessing || isLoading} title="Set every photo's vote count to the number of recorded votes">
              <ShieldCheck size={14} aria-hidden="true" /> Reconcile counts
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[20rem_1fr]">
        <Panel className="lg:sticky lg:top-4">
          <div className="border-b border-white/10 p-2">
            <SearchField
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setSelectedVoterId(null); }}
              placeholder="Search Discord name or ID"
            />
          </div>
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : matchingVoters.length === 0 ? (
            <EmptyState title="No voters found">{searchQuery ? `Nothing matches "${searchQuery}".` : 'No votes have been cast yet.'}</EmptyState>
          ) : (
            <ul className="max-h-72 overflow-y-auto lg:max-h-[calc(100vh-13rem)]">
              {matchingVoters.map((voter) => {
                const selected = activeVoter?.id === voter.id;
                return (
                  <li key={voter.id} className="border-b border-white/[0.07] last:border-b-0">
                    <button
                      type="button"
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => setSelectedVoterId(voter.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fivem-orange',
                        selected ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/[0.05]',
                      )}
                    >
                      <img src={resolveVoterAvatar(voter.voterUid, voter.displayName)} alt="" loading="lazy" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                      <span className="min-w-0 flex-1 truncate">{voter.displayName}</span>
                      <span className="text-xs tabular-nums text-white/55">{voter.voteCount}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {!activeVoter ? (
          <Panel title="Latest votes" description="Newest first. Pick a vote to see everything that person voted for.">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : latestVotes.length === 0 ? (
              <EmptyState title="No votes to show">Votes appear here as players cast them.</EmptyState>
            ) : (
              <ul>
                {latestVotes.map(({ vote, photo, voterId }) => (
                  <li key={vote.id} className="border-b border-white/[0.07] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSelectedVoterId(voterId); }}
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fivem-orange"
                    >
                      <img src={photo.image_url} alt="" loading="lazy" decoding="async" className="aspect-video w-16 shrink-0 rounded border border-white/10 bg-white/5 object-cover sm:w-24" />
                      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{vote.voterDiscord || vote.voterName}</span>
                          <span className="block truncate text-xs text-white/60">
                            Voted for {photo.player_name || 'Anonymous'}, {categoryMap.get(photo.category_id) || 'Category'}
                          </span>
                        </span>
                        {vote.timestamp && (
                          <time dateTime={vote.timestamp} className="shrink-0 text-xs tabular-nums text-white/55">
                            {new Date(vote.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </time>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel
            title={activeVoter.displayName}
            description={`${activeVoter.voteCount} ${activeVoter.voteCount === 1 ? 'vote' : 'votes'} recorded. ID ${activeVoter.voterUid}`}
            actions={<Button size="sm" onClick={() => setSelectedVoterId(null)}>Clear</Button>}
          >
            {activeVoterPhotos.length === 0 ? (
              <EmptyState title={activeVoter.voteCount > 0 ? 'Votes from earlier rounds' : 'No votes recorded'}>
                {activeVoter.voteCount > 0 ? 'The photos from those contests have been archived.' : 'This account has no votes in the database.'}
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-4 p-3 xl:grid-cols-3 2xl:grid-cols-4">
                {activeVoterPhotos.map(({ vote, photo }) => (
                  <li key={vote.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo!)}
                      className="block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-fivem-orange"
                    >
                      <span className={cn('relative block aspect-video overflow-hidden rounded-md border bg-white/5', photo!.is_disqualified ? 'border-red-500/70' : 'border-white/10')}>
                        <img src={photo!.image_url} alt={photo!.caption || 'Entry'} loading="lazy" decoding="async" className={cn('h-full w-full object-cover', photo!.is_disqualified && 'opacity-50')} />
                        {photo!.is_disqualified && <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">Disqualified</span>}
                      </span>
                      <span className="mt-1.5 flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-white">{photo!.player_name || 'Anonymous'}</span>
                        <span className="shrink-0 text-xs tabular-nums text-white/60">{photo!.vote_count || 0} votes</span>
                      </span>
                      <span className="block truncate text-xs text-white/55">
                        {categoryMap.get(photo!.category_id) || 'Category'}
                        {vote.timestamp ? `, voted ${new Date(vote.timestamp).toLocaleDateString()}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {/* Lightbox Modal for Image Inspection */}
      <LightboxModal photo={previewPhoto} privateKey={null} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}
