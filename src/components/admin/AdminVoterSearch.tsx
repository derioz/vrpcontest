import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, UserCheck, Heart, Image as ImageIcon, Sparkles, ExternalLink, Calendar,
  User, Tag, ShieldAlert, ShieldCheck, UserX, AlertTriangle, RefreshCw
} from 'lucide-react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, updateDoc, increment, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category, Photo } from '../../types';
import LightboxModal from '../LightboxModal';
import { toast } from '../ui/toast';
import { getDiceBearAvatarUrl } from '../../lib/dicebear';

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
  voterUid: string;
  displayName: string;
  voterDiscord: string;
  voteCount: number;
  votes: VoteRecord[];
}

interface FlaggedVoter {
  voterUid: string;
  voterName: string;
  flaggedAt: string;
  reason?: string;
}

export function AdminVoterSearch({ allPhotos, categories }: AdminVoterSearchProps) {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [flaggedVoters, setFlaggedVoters] = useState<Map<string, FlaggedVoter>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoterUid, setSelectedVoterUid] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  // Fetch votes on demand (using getDocs instead of live onSnapshot to prevent read quota exhaustion)
  const fetchVotes = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'votes'));
      const snap = await getDocs(q);
      const fetched: VoteRecord[] = snap.docs.map((d) => {
        const data = d.data();
        const voterDiscord = (data.voterDiscord as string) || (data.voterName as string) || 'Anonymous';
        const voterName = (data.voterName as string) || voterDiscord;
        return {
          id: d.id,
          photoId: String(data.photoId || ''),
          voterUid: String(data.voterUid || d.id),
          voterName,
          voterDiscord,
          timestamp: data.timestamp as string | undefined,
        };
      });
      setVotes(fetched);
    } catch (err) {
      console.error('Failed to load votes for admin search:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVotes();
  }, []);

  // Subscribe to flagged_voters collection
  useEffect(() => {
    const q = query(collection(db, 'flagged_voters'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = new Map<string, FlaggedVoter>();
        snap.docs.forEach((doc) => {
          const data = doc.data();
          map.set(doc.id, {
            voterUid: doc.id,
            voterName: (data.voterName as string) || 'Alt Account',
            flaggedAt: (data.flaggedAt as string) || new Date().toISOString(),
            reason: data.reason as string | undefined,
          });
        });
        setFlaggedVoters(map);
      },
      (err) => {
        console.error('Failed to load flagged voters:', err);
      }
    );

    return () => unsub();
  }, []);

  // Handler to toggle Alt Account flag & invalidate votes
  const handleToggleAltFlag = async (voterUid: string, voterName: string) => {
    const isCurrentlyFlagged = flaggedVoters.has(voterUid);

    if (isCurrentlyFlagged) {
      // Unflag account
      try {
        await deleteDoc(doc(db, 'flagged_voters', voterUid));
        toast.success(`Unflagged ${voterName}. Alt flag removed.`);
      } catch (err: any) {
        toast.error('Failed to unflag account: ' + (err?.message || 'Unknown error'));
      }
    } else {
      // Flag account & remove votes
      const confirmFlag = window.confirm(
        `Are you sure you want to flag "${voterName}" as an Alt Account?\n\nAll votes cast by this account will be permanently deleted and photo vote totals will be updated automatically.`
      );
      if (!confirmFlag) return;

      const toastId = toast.loading(`Flagging ${voterName} and purging alt votes...`);
      setIsProcessing(true);

      try {
        // 1. Add to flagged_voters collection
        await setDoc(doc(db, 'flagged_voters', voterUid), {
          voterUid,
          voterName,
          flaggedAt: new Date().toISOString(),
          reason: 'Verified Alt Discord Account',
        });

        // 2. Fetch and remove all votes cast by this voterUid
        const votesQuery = query(collection(db, 'votes'), where('voterUid', '==', voterUid));
        const votesSnap = await getDocs(votesQuery);

        let votesRemovedCount = 0;
        const photoVoteDecrements = new Map<string, number>();

        for (const voteDoc of votesSnap.docs) {
          const photoId = String(voteDoc.data().photoId || '');
          if (photoId) {
            photoVoteDecrements.set(photoId, (photoVoteDecrements.get(photoId) || 0) + 1);
          }
          await deleteDoc(doc(db, 'votes', voteDoc.id));
          votesRemovedCount++;
        }

        // 3. Update vote counts on affected photos
        for (const [photoId, count] of photoVoteDecrements.entries()) {
          try {
            await updateDoc(doc(db, 'photos', photoId), {
              vote_count: increment(-count),
            });
          } catch (e) {
            console.error(`Failed to decrement vote_count on photo ${photoId}:`, e);
          }
        }

        toast.success(
          `Flagged ${voterName} as alt account. Removed ${votesRemovedCount} vote(s) and updated photo tallies!`,
          { id: toastId }
        );
        await fetchVotes();
      } catch (err: any) {
        console.error('Failed to flag alt account:', err);
        toast.error('Error flagging alt account: ' + (err?.message || 'Unknown error'), { id: toastId });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Map photos by ID
  const photosById = new Map<string, Photo>();
  allPhotos.forEach((p) => photosById.set(String(p.id), p));

  // Map categories by ID
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  // Aggregate votes by voter UID
  const voterSummariesMap = new Map<string, VoterSummary>();

  // Add all voters with votes
  votes.forEach((vote) => {
    const key = vote.voterUid || vote.voterDiscord;
    if (!voterSummariesMap.has(key)) {
      voterSummariesMap.set(key, {
        voterUid: vote.voterUid,
        displayName: vote.voterDiscord || vote.voterName || 'Anonymous',
        voterDiscord: vote.voterDiscord,
        voteCount: 0,
        votes: [],
      });
    }
    const summary = voterSummariesMap.get(key)!;
    summary.voteCount += 1;
    summary.votes.push(vote);
  });

  // Also include flagged voters with 0 votes remaining
  flaggedVoters.forEach((fv, uid) => {
    if (!voterSummariesMap.has(uid)) {
      voterSummariesMap.set(uid, {
        voterUid: uid,
        displayName: fv.voterName,
        voterDiscord: fv.voterName,
        voteCount: 0,
        votes: [],
      });
    }
  });

  const allVotersList = Array.from(voterSummariesMap.values()).sort((a, b) => b.voteCount - a.voteCount);

  // Filter voters by search query and flagged filter
  const searchTrimmed = searchQuery.toLowerCase().trim();
  const matchingVoters = allVotersList.filter((v) => {
    if (showFlaggedOnly && !flaggedVoters.has(v.voterUid)) return false;
    if (!searchTrimmed) return true;
    return (
      v.displayName.toLowerCase().includes(searchTrimmed) ||
      v.voterDiscord.toLowerCase().includes(searchTrimmed) ||
      v.voterUid.toLowerCase().includes(searchTrimmed)
    );
  });

  // Determine active voter selection
  const activeVoter = selectedVoterUid
    ? voterSummariesMap.get(selectedVoterUid) || null
    : matchingVoters.length === 1
    ? matchingVoters[0]
    : null;

  // Photos voted for by active voter
  const activeVoterPhotos: { vote: VoteRecord; photo?: Photo }[] = activeVoter
    ? activeVoter.votes.map((v) => ({
        vote: v,
        photo: photosById.get(v.photoId),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="text-cyan-400" size={22} />
            <h3 className="text-xl font-black font-display text-white">Voter Search & Alt Account Manager</h3>
          </div>
          <p className="text-sm text-white/40">
            Search for voters, view voted photos, and flag verified alt Discord accounts to purge invalid votes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchVotes}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer"
            title="Re-fetch latest vote records from Firestore"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-cyan-400" : "text-white/60"} />
            <span>Refresh Data</span>
          </button>

          {/* Flagged Alt Count Badge */}
          {flaggedVoters.size > 0 && (
            <button
              type="button"
              onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                showFlaggedOnly
                  ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <ShieldAlert size={14} className="text-red-400" />
              <span>{flaggedVoters.size} Flagged Alt{flaggedVoters.size !== 1 ? 's' : ''}</span>
            </button>
          )}
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
              setSelectedVoterUid(null);
            }}
            placeholder="Search voter by Discord name, display name, or UID..."
            className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] text-white text-sm rounded-xl pl-11 pr-4 py-3 border border-white/10 focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/30"
          />
        </div>

        {/* Directory Pill List of Active Voters */}
        {!isLoading && allVotersList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                Voter Directory ({matchingVoters.length} Listed)
              </p>
              {showFlaggedOnly && (
                <button
                  type="button"
                  onClick={() => setShowFlaggedOnly(false)}
                  className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                >
                  Show all voters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {matchingVoters.map((voter) => {
                const isSelected = activeVoter?.voterUid === voter.voterUid;
                const isAlt = flaggedVoters.has(voter.voterUid);
                return (
                  <button
                    key={voter.voterUid}
                    type="button"
                    onClick={() => setSelectedVoterUid(voter.voterUid)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : isAlt
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <img
                      src={getDiceBearAvatarUrl(voter.voterUid || voter.displayName)}
                      alt=""
                      className="w-4 h-4 rounded-full border border-white/20 object-cover shrink-0"
                    />
                    <span>{voter.displayName}</span>
                    {isAlt && (
                      <span className="px-1 py-0.2 rounded bg-red-500/20 text-[9px] font-mono font-bold text-red-400 border border-red-500/30">
                        ALT
                      </span>
                    )}
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
        <div className="py-16 flex flex-col items-center justify-center text-white/40 gap-3 border border-white/5 rounded-2xl">
          <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider">Loading vote database...</span>
        </div>
      ) : activeVoter ? (
        <div className="space-y-4">
          {/* Active Voter Overview Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
              flaggedVoters.has(activeVoter.voterUid)
                ? 'bg-gradient-to-r from-red-500/15 via-rose-500/5 to-transparent border-red-500/30'
                : 'bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border-cyan-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={getDiceBearAvatarUrl(activeVoter.voterUid || activeVoter.displayName)}
                alt=""
                className={`w-12 h-12 rounded-2xl border object-cover shadow-lg ${
                  flaggedVoters.has(activeVoter.voterUid)
                    ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                }`}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-bold text-white tracking-wide">{activeVoter.displayName}</h4>
                  {flaggedVoters.has(activeVoter.voterUid) ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-mono font-bold flex items-center gap-1">
                      <ShieldAlert size={12} />
                      ALT ACCOUNT FLAGGED (0 Counted Votes)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
                      Voted for {activeVoter.voteCount} {activeVoter.voteCount === 1 ? 'photo' : 'photos'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 font-mono mt-0.5 truncate">
                  UID: {activeVoter.voterUid}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Flag / Unflag Alt Account Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleToggleAltFlag(activeVoter.voterUid, activeVoter.displayName)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  flaggedVoters.has(activeVoter.voterUid)
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                }`}
              >
                {flaggedVoters.has(activeVoter.voterUid) ? (
                  <>
                    <ShieldCheck size={14} />
                    <span>Unflag Alt Account</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={14} />
                    <span>Flag as Alt Account & Purge Votes</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedVoterUid(null)}
                className="text-xs font-mono text-white/40 hover:text-white px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Voted Photos Grid */}
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
                        <span className="text-xs font-mono mt-1">Photo unavailable</span>
                      </div>
                    )}

                    {/* Category Pill Badge */}
                    {photo && (
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/80 flex items-center gap-1">
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
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-white/40 text-center border border-white/5 rounded-2xl">
              <ShieldAlert size={36} className="mb-2 text-red-400/50 stroke-[1.5]" />
              <p className="text-base font-medium text-white/70">No active votes recorded</p>
              <p className="text-xs text-white/40 mt-1 max-w-sm">
                This account has 0 active votes in the database (or votes were purged after flagging as alt).
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
            Choose any voter from the directory above to inspect their voted photos or flag verified alt Discord accounts.
          </p>
        </div>
      )}

      {/* Lightbox Modal for Image Inspection */}
      <LightboxModal photo={previewPhoto} privateKey={null} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}
