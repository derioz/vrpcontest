import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCheck, Heart, Image as ImageIcon, Sparkles, ExternalLink, Calendar, User, Tag } from 'lucide-react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category, Photo } from '../../types';
import LightboxModal from '../LightboxModal';

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

export function AdminVoterSearch({ allPhotos, categories }: AdminVoterSearchProps) {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoterUid, setSelectedVoterUid] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Subscribe to all votes in real time
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'votes'));
    const unsub = onSnapshot(
      q,
      (snap) => {
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
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to load votes for admin search:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Map photos by ID
  const photosById = new Map<string, Photo>();
  allPhotos.forEach((p) => photosById.set(String(p.id), p));

  // Map categories by ID
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  // Aggregate votes by voter UID
  const voterSummariesMap = new Map<string, VoterSummary>();

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

  const allVotersList = Array.from(voterSummariesMap.values()).sort((a, b) => b.voteCount - a.voteCount);

  // Filter voters by search query
  const searchTrimmed = searchQuery.toLowerCase().trim();
  const matchingVoters = allVotersList.filter(
    (v) =>
      v.displayName.toLowerCase().includes(searchTrimmed) ||
      v.voterDiscord.toLowerCase().includes(searchTrimmed) ||
      v.voterUid.toLowerCase().includes(searchTrimmed)
  );

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
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="text-cyan-400" size={22} />
          <h3 className="text-xl font-black font-display text-white">Voter Search & Inspector</h3>
        </div>
        <p className="text-sm text-white/40">
          Search for any voter to view all entries they have voted for in the current contest.
        </p>
      </div>

      {/* Search Input & Quick Selector */}
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
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
              Active Voters ({allVotersList.length} Total)
            </p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {matchingVoters.map((voter) => {
                const isSelected = activeVoter?.voterUid === voter.voterUid;
                return (
                  <button
                    key={voter.voterUid}
                    type="button"
                    onClick={() => setSelectedVoterUid(voter.voterUid)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[9px] font-bold text-cyan-400">
                      {voter.displayName.charAt(0).toUpperCase()}
                    </div>
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
        <div className="py-16 flex flex-col items-center justify-center text-white/40 gap-3 border border-white/5 rounded-2xl">
          <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider">Loading vote database...</span>
        </div>
      ) : activeVoter ? (
        <div className="space-y-4">
          {/* Active Voter Overview Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {activeVoter.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-white tracking-wide">{activeVoter.displayName}</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
                    Voted for {activeVoter.voteCount} {activeVoter.voteCount === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
                <p className="text-xs text-white/40 font-mono mt-0.5 truncate">
                  UID: {activeVoter.voterUid}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedVoterUid(null)}
              className="text-xs font-mono text-white/40 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>

          {/* Voted Photos Grid */}
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
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
            Choose any voter from the list above or type a name into the search bar to inspect their votes.
          </p>
        </div>
      )}

      {/* Lightbox Modal for Image Inspection */}
      <LightboxModal photo={previewPhoto} privateKey={null} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}
