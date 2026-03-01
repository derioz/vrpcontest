import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Vote, Calendar } from 'lucide-react';
import { Photo } from '../types';

interface LightboxModalProps {
    photo: Photo | null;
    onClose: () => void;
}

export default function LightboxModal({ photo, onClose }: LightboxModalProps) {
    return (
        <AnimatePresence>
            {photo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#060606]/98 backdrop-blur-2xl p-4 md:p-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 cursor-zoom-out"
                    />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/5 hover:bg-white/15 rounded-full text-white backdrop-blur-xl transition-all hover:scale-105 z-50 border border-white/10"
                    >
                        <X size={20} />
                    </button>

                    <motion.div
                        layoutId={photo.id.toString()}
                        className="relative w-full h-full max-w-7xl flex flex-col items-center justify-center pointer-events-none gap-6"
                    >
                        {/* Image Container */}
                        <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
                            <img
                                src={photo.image_url}
                                alt={photo.caption}
                                className="max-w-full max-h-full object-contain pointer-events-auto rounded-md shadow-[0_0_50px_rgba(234,88,12,0.15)] ring-1 ring-white/10"
                            />
                        </div>

                        {/* Caption & Stats Bar */}
                        <div className="shrink-0 flex flex-col items-center text-center max-w-3xl px-4 pointer-events-auto mb-2 md:mb-6">
                            <p className="text-white md:text-lg font-medium tracking-wide mb-4">
                                {photo.caption || "No caption provided"}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
                                    <User size={14} className="text-fivem-orange/80" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                                        {photo.player_name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-fivem-orange/10 backdrop-blur-xl px-4 py-2 rounded-full border border-fivem-orange/20 shadow-lg shadow-fivem-orange/5">
                                    <Vote size={14} className="text-fivem-orange" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-fivem-orange">
                                        {photo.vote_count || 0} Votes
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg hidden sm:flex">
                                    <Calendar size={14} className="text-white/40" />
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                                        {new Date(photo.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
