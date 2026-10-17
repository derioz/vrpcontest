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
    const confirmSync = window.confirm(
      "Re-sync all photo vote counts?\n\nThis will scan all verified votes in the database and reconcile each photo's vote tally to match 100% accurately."
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="text-cyan-400" size={22} />
            <h3 className="text-xl font-black font-display text-white">Voter Directory & Vote Audit</h3>
          </div>
          <p className="text-sm text-white/40">
            Search for registered voters, inspect voted submissions, and audit vote distribution across contest categories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchVotesAndUsers}
            disabled={isLoading || isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer"
            title="Re-fetch latest vote and user records from Firestore"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-cyan-400" : "text-white/60"} />
            <span>Refresh Data</span>
          </button>

          <button
            type="button"
            onClick={handleRecalculateAllVoteCounts}
            disabled={isProcessing || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            title="Reconcile and ensure all photo vote counts exactly equal verified database votes"
          >
            <ShieldCheck size={13} className="text-cyan-400" />
            <span>Reconcile Counts</span>
          </button>
        </div>
      </div>

      {/* Search Input & Directory */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedVoterId(null);
            }}
            placeholder="Search voters by Discord Name or UID..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Directory Pill List of Active Voters */}
        {!isLoading && allVotersList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                Voter Directory ({matchingVoters.length} Listed)
              </p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {matchingVoters.map((voter) => {
                const isSelected = activeVoter?.id === voter.id || activeVoter?.voterUid === voter.voterUid || activeVoter?.displayName.toLowerCase() === voter.displayName.toLowerCase();
                return (
                  <button
                    key={voter.id}
                    type="button"
                    onClick={() => setSelectedVoterId(voter.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <img
                      src={resolveVoterAvatar(voter.voterUid, voter.displayName)}
                      alt=""
                      className="w-4 h-4 rounded-full border border-white/20 object-cover shrink-0"
                    />
                    <span>{voter.displayName}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[9px] font-mono font-bold text-white/60">
                      {voter.voteCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Results Display */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-white/10 bg-[#0d0d14]/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full bg-white/[0.08]" />
              <div className="space-y-2">
                <Skeleton className="w-40 h-5 rounded-lg bg-white/[0.08]" />
                <Skeleton className="w-24 h-3 rounded-md bg-white/[0.05]" />
              </div>
            </div>
            <Skeleton className="w-28 h-8 rounded-xl bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-white/10 bg-[#0d0d14]/70 space-y-3">
                <Skeleton className="w-full aspect-video rounded-xl bg-white/[0.07]" />
                <Skeleton className="w-3/4 h-4 rounded-md bg-white/[0.07]" />
                <Skeleton className="w-1/2 h-3 rounded-md bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </div>
      ) : activeVoter ? (
        <div className="space-y-4">
          {/* Active Voter Info Banner */}
          <div className="p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 backdrop-blur-md bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border-cyan-500/20">
            <div className="flex items-center gap-3">
              <img
                src={resolveVoterAvatar(activeVoter.voterUid, activeVoter.displayName)}
                alt=""
                className="w-12 h-12 rounded-2xl border object-cover shadow-lg border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-bold text-white tracking-wide">{activeVoter.displayName}</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
                    {activeVoter.voteCount} Total {activeVoter.voteCount === 1 ? 'Vote' : 'Votes'} Recorded
                  </span>
                </div>
                <p className="text-xs text-white/40 font-mono mt-0.5 truncate">
                  UID: {activeVoter.voterUid}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedVoterId(null)}
              className="text-xs font-mono text-white/40 hover:text-white px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Voted Photos Grid or Historical Notice */}
          {activeVoterPhotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeVoterPhotos.map(({ vote, photo }, idx) => (
                <motion.div
                  key={vote.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] overflow-hidden flex flex-col transition-all hover:border-cyan-500/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                >
                  {/* Photo Thumbnail */}
                  <div className="relative aspect-video bg-black/40 overflow-hidden">
                    {photo ? (
                      <img
                        src={photo.image_url}
                        alt={photo.caption || 'Submission'}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          photo.is_disqualified ? 'grayscale-[40%] opacity-80' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                        <ImageIcon size={32} />
                        <span className="text-xs font-mono mt-1">Photo archived</span>
                      </div>
                    )}

                    {/* DISQUALIFIED Permanent Banner */}
                    {photo?.is_disqualified && (
                      <div className="absolute top-0 inset-x-0 bg-red-600/95 text-white font-black text-[10px] uppercase tracking-widest py-1 px-2 flex items-center justify-center gap-1 z-20 shadow-md border-b border-red-400/40">
                        <Ban size={11} className="stroke-[2.5]" />
                        <span>DISQUALIFIED</span>
                        {photo.disqualification_reason && (
                          <span className="font-normal text-[9px] opacity-90 truncate max-w-[100px] font-mono">
                            ({photo.disqualification_reason})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Category Pill Badge */}
                    {photo && (
                      <div className={`absolute left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/80 flex items-center gap-1 z-10 ${
                        photo.is_disqualified ? 'top-8' : 'top-2.5'
                      }`}>
                        <Tag size={10} className="text-cyan-400" />
                        <span>{categoryMap.get(photo.category_id) || 'Category'}</span>
                      </div>
                    )}

                    {/* Click to Preview Button */}
                    {photo && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(photo)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold cursor-pointer backdrop-blur-[2px]"
                      >
                        <ExternalLink size={16} className="text-cyan-400" />
                        <span>View Full Image</span>
                      </button>
                    )}
                  </div>

                  {/* Photo Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-2">
                        {photo?.caption || 'No caption provided'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-white/60">
                        <span className="flex items-center gap-1 text-[11px]">
                          <User size={12} className="text-cyan-400" />
                          Submitted by:
                        </span>
                        <span className="font-bold text-white truncate max-w-[130px]">
                          {photo?.player_name || 'Anonymous'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white/60">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Heart size={12} className="text-fivem-orange" />
                          Total Votes:
                        </span>
                        <span className="font-mono font-bold text-fivem-orange">
                          {photo?.vote_count || 0}
                        </span>
                      </div>

                      {vote.timestamp && (
                        <div className="flex items-center justify-between text-white/40 text-[10px] font-mono pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            Voted on:
                          </span>
                          <span>{new Date(vote.timestamp).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : activeVoter.voteCount > 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-white/50 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-base font-bold text-white">Historical Contest Voter</p>
              <p className="text-xs text-white/50 mt-1 max-w-md">
                This voter has cast <strong>{activeVoter.voteCount}</strong> verified vote{activeVoter.voteCount !== 1 ? 's' : ''} in previous contest rounds. Individual submission image records from concluded contests have been archived.
              </p>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-white/40 text-center border border-white/5 rounded-2xl">
              <p className="text-base font-medium text-white/70">No active votes recorded</p>
              <p className="text-xs text-white/40 mt-1 max-w-sm">
                This account has 0 active votes in the database.
              </p>
            </div>
          )}
        </div>
      ) : searchQuery ? (
        <div className="py-16 flex flex-col items-center justify-center text-white/40 text-center border border-white/5 rounded-2xl">
          <Search size={36} className="mb-2 text-white/20 stroke-[1.5]" />
          <p className="text-base font-medium text-white/70">No voters found</p>
          <p className="text-xs text-white/40 mt-1">No active voters match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-white/40 text-center border border-white/5 rounded-2xl">
          <Sparkles size={36} className="mb-2 text-cyan-400/40 stroke-[1.5]" />
          <p className="text-base font-medium text-white/70">Select or search for a voter</p>
          <p className="text-xs text-white/40 mt-1 max-w-sm">
            Choose any voter from the directory above to inspect their voted photos and voting distribution.
          </p>
        </div>
      )}

      {/* Lightbox Modal for Image Inspection */}
      <LightboxModal photo={previewPhoto} privateKey={null} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}
