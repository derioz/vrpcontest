import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
    BarChart3,
    TrendingUp,
    Users,
    Image as ImageIcon,
    Heart,
    ChevronLeft,
    Activity,
    Award,
    Maximize2,
    Layers,
    Sparkles
} from 'lucide-react';
import { Photo, Category } from '../../types';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { cn } from '../../lib/utils';

interface AnalyticsDashboardProps {
    photos: Photo[];
    categories: Category[];
    onClose: () => void;
    isInline?: boolean;
}

export default function AnalyticsDashboard({ photos, categories, onClose, isInline = false }: AnalyticsDashboardProps) {

    // --- Aggregate Computations --- //

    // 1. Total Submissions & Votes
    const totalSubmissions = photos.length;
    const totalVotes = photos.reduce((sum, photo) => sum + (photo.vote_count || 0), 0);

    // 2. Submission Velocity (By Day)
    const submissionsPerDay = useMemo(() => {
        const counts: Record<string, number> = {};
        const sorted = [...photos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        sorted.forEach(photo => {
            const date = new Date(photo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            counts[date] = (counts[date] || 0) + 1;
        });

        return Object.entries(counts).map(([date, count]) => ({
            date,
            submissions: count
        }));
    }, [photos]);

    // 3. Category Distribution
    const categoryStats = useMemo(() => {
        const stats: Record<string, { count: number; name: string; votes: number }> = {};
        categories.forEach(c => {
            stats[c.id] = { count: 0, name: c.name, votes: 0 };
        });

        photos.forEach(photo => {
            if (stats[photo.category_id]) {
                stats[photo.category_id].count += 1;
                stats[photo.category_id].votes += (photo.vote_count || 0);
            }
        });

        return Object.values(stats).sort((a, b) => b.count - a.count);
    }, [photos, categories]);

    const mostActiveCategory = categoryStats[0];

    // 4. Top Contributors
    const playerStats = useMemo(() => {
        const stats: Record<string, { name: string; votes: number; submissions: number }> = {};

        photos.forEach(photo => {
            if (!stats[photo.player_name]) {
                stats[photo.player_name] = { name: photo.player_name, votes: 0, submissions: 0 };
            }
            stats[photo.player_name].votes += (photo.vote_count || 0);
            stats[photo.player_name].submissions += 1;
        });

        return Object.values(stats).sort((a, b) => b.votes - a.votes);
    }, [photos]);

    const topContributor = playerStats[0];

    // --- Animation Variants --- //
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
    };

    const content = (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full space-y-6"
        >
            {/* --- TOP ROW: KPI CARDS --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

                <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-sm">
                    <div className="flex items-center justify-between text-white/60 mb-3">
                        <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider font-semibold text-white/50">Total Submissions</span>
                        <div className="p-2 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/30">
                            <ImageIcon size={16} />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black font-display text-white">{totalSubmissions}</p>
                    <p className="text-[10px] text-white/40 font-mono mt-1">Uploaded contest entries</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-pink-500/40 transition-all shadow-sm">
                    <div className="flex items-center justify-between text-white/60 mb-3">
                        <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider font-semibold text-white/50">Total Votes Cast</span>
                        <div className="p-2 bg-pink-500/15 text-pink-400 rounded-xl border border-pink-500/30">
                            <Heart size={16} />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black font-display text-white">{totalVotes}</p>
                    <p className="text-[10px] text-white/40 font-mono mt-1">Verified community votes</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-sm">
                    <div className="flex items-center justify-between text-white/60 mb-3">
                        <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider font-semibold text-white/50">Top Category</span>
                        <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                            <Activity size={16} />
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-black font-display text-white truncate">{mostActiveCategory?.name || 'N/A'}</p>
                    <p className="text-[10px] text-emerald-400/80 font-mono mt-1">{mostActiveCategory?.count || 0} Photos ({mostActiveCategory?.votes || 0} votes)</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-sm">
                    <div className="flex items-center justify-between text-white/60 mb-3">
                        <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider font-semibold text-white/50">Top Contributor</span>
                        <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
                            <Award size={16} />
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-black font-display text-white truncate">{topContributor?.name || 'N/A'}</p>
                    <p className="text-[10px] text-amber-400/80 font-mono mt-1">{topContributor?.votes || 0} Total Votes</p>
                </motion.div>

            </div>

            {/* --- MIDDLE ROW: MAIN CHART --- */}
            <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 sm:p-7 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-display">Submission Velocity</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-fivem-orange/15 text-fivem-orange border border-fivem-orange/30">
                                Live Telemetry
                            </span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">Volume of photo uploads recorded across contest timeline dates.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white/60">
                        <TrendingUp size={14} className="text-fivem-orange" />
                        <span>Daily Tracking</span>
                    </div>
                </div>

                <div className="w-full h-[280px] sm:h-[340px]">
                    {submissionsPerDay.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={submissionsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(255,255,255,0.3)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={8}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.3)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => Math.floor(value).toString()}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090e', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                                    itemStyle={{ color: '#ea580c', fontWeight: 'bold' }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px', fontFamily: 'monospace' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="submissions"
                                    stroke="#ea580c"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorVelocity)"
                                    activeDot={{ r: 6, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono italic">
                            No submission telemetry recorded yet.
                        </div>
                    )}
                </div>
            </motion.div>

            {/* --- BOTTOM ROW: BREAKDOWNS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                {/* Top Players Table */}
                <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 sm:p-7">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange">
                            <Users size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-wide font-display">Top Ranked Participants</h2>
                            <p className="text-xs text-white/40">Photographers with the highest total vote accumulation.</p>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {playerStats.slice(0, 5).map((player, idx) => (
                            <div key={player.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0",
                                        idx === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                                            idx === 1 ? "bg-slate-300/20 text-slate-200 border border-slate-300/40" :
                                                idx === 2 ? "bg-amber-700/20 text-amber-500 border border-amber-700/40" :
                                                    "bg-white/5 text-white/40 border border-white/10"
                                    )}>
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-white truncate">{player.name}</p>
                                        <p className="text-[10px] text-white/40 font-mono">{player.submissions} Entry{player.submissions > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black font-display text-fivem-orange">{player.votes}</p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider font-mono">Votes</p>
                                </div>
                            </div>
                        ))}
                        {playerStats.length === 0 && (
                            <p className="text-xs text-white/30 text-center py-6 font-mono">No participant votes logged yet.</p>
                        )}
                    </div>
                </motion.div>

                {/* Category Distribution Bar Chart */}
                <motion.div variants={itemVariants} className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 sm:p-7">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                            <BarChart3 size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-wide font-display">Category Distribution</h2>
                            <p className="text-xs text-white/40">Submissions distribution per category.</p>
                        </div>
                    </div>

                    <div className="w-full h-[240px]">
                        {categoryStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryStats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke="rgba(255,255,255,0.6)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={110}
                                        tickFormatter={(val) => val.length > 14 ? val.substring(0, 12) + '...' : val}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090e', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                                        {categoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : 'rgba(59, 130, 246, 0.45)'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono italic">
                                No categories configured.
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );

    if (isInline) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-[#060606] overflow-y-auto">
            {/* Background Decor */}
            <div className="absolute inset-x-0 top-0 h-[500px] pointer-events-none opacity-50">
                <div className="absolute inset-0 bg-gradient-to-b from-fivem-orange/10 via-transparent to-transparent" />
                <div className="absolute top-[-100px] left-1/4 w-[600px] h-[300px] bg-fivem-orange/20 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative min-h-screen p-4 md:p-8 max-w-7xl mx-auto pb-20">
                {/* Header Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8 md:mb-12 pt-4"
                >
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={16} />
                        <span className="text-sm font-medium">Back to Settings</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">Live Connect</span>
                        </div>
                    </div>
                </motion.div>

                {/* Dashboard Title */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2">
                        Contest <span className="text-transparent bg-clip-text bg-gradient-to-r from-fivem-orange to-yellow-500">Analytics</span>
                    </h1>
                    <p className="text-white/40 max-w-2xl text-sm">
                        Real-time insights and engagement metrics for the current photo competition.
                    </p>
                </motion.div>

                {content}
            </div>
        </div>
    );
}
