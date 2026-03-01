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
    Award
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
}

export default function AnalyticsDashboard({ photos, categories, onClose }: AnalyticsDashboardProps) {

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
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

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
                        className="flex items-center gap-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-colors"
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
                    className="mb-10"
                >
                    <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2">
                        Contest <span className="text-transparent bg-clip-text bg-gradient-to-r from-fivem-orange to-yellow-500">Analytics</span>
                    </h1>
                    <p className="text-white/40 max-w-2xl">
                        Real-time insights and engagement metrics for the current photo competition.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {/* --- TOP ROW: KPI CARDS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-fivem-orange/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-20 transition-all">
                                <ImageIcon size={100} />
                            </div>
                            <div className="flex items-center gap-3 mb-4 text-white/60">
                                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                    <ImageIcon size={18} />
                                </div>
                                <h3 className="text-xs font-mono uppercase tracking-widest font-semibold">Total Submissions</h3>
                            </div>
                            <p className="text-4xl font-bold text-white">{totalSubmissions}</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-fivem-orange/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-20 transition-all">
                                <Heart size={100} />
                            </div>
                            <div className="flex items-center gap-3 mb-4 text-white/60">
                                <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg">
                                    <Heart size={18} />
                                </div>
                                <h3 className="text-xs font-mono uppercase tracking-widest font-semibold">Total Votes Cast</h3>
                            </div>
                            <p className="text-4xl font-bold text-white">{totalVotes}</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-fivem-orange/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-20 transition-all">
                                <Activity size={100} />
                            </div>
                            <div className="flex items-center gap-3 mb-4 text-white/60">
                                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                                    <Activity size={18} />
                                </div>
                                <h3 className="text-xs font-mono uppercase tracking-widest font-semibold">Top Category</h3>
                            </div>
                            <p className="text-2xl font-bold text-white truncate">{mostActiveCategory?.name || 'N/A'}</p>
                            <p className="text-xs text-white/40 mt-1">{mostActiveCategory?.count || 0} Submissions</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-fivem-orange/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-20 transition-all">
                                <Award size={100} />
                            </div>
                            <div className="flex items-center gap-3 mb-4 text-white/60">
                                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                                    <Award size={18} />
                                </div>
                                <h3 className="text-xs font-mono uppercase tracking-widest font-semibold">Top Contributor</h3>
                            </div>
                            <p className="text-2xl font-bold text-white truncate">{topContributor?.name || 'N/A'}</p>
                            <p className="text-xs text-white/40 mt-1">{topContributor?.votes || 0} Total Votes</p>
                        </motion.div>

                    </div>

                    {/* --- MIDDLE ROW: MAIN CHART --- */}
                    <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-1 tracking-wide">Submission Velocity</h2>
                                <p className="text-xs text-white/40 max-w-md">Volume of photos submitted over the duration of the contest timeline.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-[#060606] border border-white/10 rounded-full p-1">
                                <span className="px-4 py-1.5 text-xs font-medium bg-white/10 text-white rounded-full">Daily</span>
                            </div>
                        </div>

                        <div className="w-full h-[350px]">
                            {submissionsPerDay.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={submissionsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => Math.floor(value).toString()}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                            itemStyle={{ color: '#ea580c', fontWeight: 'bold' }}
                                            labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
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
                                <div className="w-full h-full flex items-center justify-center text-white/30 text-sm italic">
                                    No submission data available to chart.
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* --- BOTTOM ROW: BREAKDOWNS --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Top Players Table */}
                        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Users size={20} className="text-fivem-orange" />
                                <h2 className="text-lg font-semibold text-white tracking-wide">Most Voted Players</h2>
                            </div>

                            <div className="space-y-3">
                                {playerStats.slice(0, 5).map((player, idx) => (
                                    <div key={player.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                idx === 0 ? "bg-amber-500/20 text-amber-500" :
                                                    idx === 1 ? "bg-slate-300/20 text-slate-300" :
                                                        idx === 2 ? "bg-amber-700/20 text-amber-600" :
                                                            "bg-white/5 text-white/40"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{player.name}</p>
                                                <p className="text-[10px] text-white/40">{player.submissions} Submissions</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-fivem-orange">{player.votes}</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Votes</p>
                                        </div>
                                    </div>
                                ))}
                                {playerStats.length === 0 && (
                                    <p className="text-sm text-white/30 text-center py-4">No player data available.</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Category Distribution Bar Chart */}
                        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <BarChart3 size={20} className="text-blue-400" />
                                <h2 className="text-lg font-semibold text-white tracking-wide">Category Distribution</h2>
                            </div>

                            <div className="w-full h-[280px]">
                                {categoryStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={categoryStats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                            <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                stroke="rgba(255,255,255,0.6)"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                width={100}
                                                tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                itemStyle={{ color: '#60a5fa' }}
                                            />
                                            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                                {categoryStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#60a5fa' : 'rgba(96, 165, 250, 0.4)'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/30 text-sm italic">
                                        No categories created.
                                    </div>
                                )}
                            </div>
                        </motion.div>

                    </div>
                </motion.div>

            </div>
        </div>
    );
}
