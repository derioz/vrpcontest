import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Photo, Category } from '../../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { EmptyState, Panel } from './kit';
import { RankBars } from './RankBars';

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

    // 2. Uploads per day, with quiet days kept as zero so gaps stay visible
    const submissionsPerDay = useMemo(() => {
        const counts = new Map<number, number>();
        photos.forEach(photo => {
            const day = new Date(photo.created_at).setHours(0, 0, 0, 0);
            if (!Number.isNaN(day)) counts.set(day, (counts.get(day) || 0) + 1);
        });

        let days = [...counts.keys()].sort((a, b) => a - b);
        if (days.length > 1 && days[days.length - 1] - days[0] < 120 * 86_400_000) {
            const filled: number[] = [];
            for (const d = new Date(days[0]); d.getTime() <= days[days.length - 1]; d.setDate(d.getDate() + 1)) {
                filled.push(d.getTime());
            }
            days = filled;
        }

        return days.map(day => ({
            date: new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            submissions: counts.get(day) || 0
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

    const content = (
        <div className="w-full space-y-4">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 lg:grid-cols-4">
                {[
                    { label: 'Entries', value: totalSubmissions, note: '' },
                    { label: 'Votes', value: totalVotes, note: '' },
                    { label: 'Busiest category', value: mostActiveCategory?.name || 'None', note: mostActiveCategory ? `${mostActiveCategory.count} entries, ${mostActiveCategory.votes} votes` : '' },
                    { label: 'Most voted player', value: topContributor?.name || 'None', note: topContributor ? `${topContributor.votes} votes` : '' },
                ].map((stat) => (
                    <div key={stat.label} className="min-w-0 bg-[#0c0c10] px-4 py-3">
                        <dt className="text-xs text-white/60">{stat.label}</dt>
                        <dd className="mt-0.5 truncate text-xl font-bold tabular-nums text-white">{stat.value}</dd>
                        {stat.note && <dd className="truncate text-xs text-white/55">{stat.note}</dd>}
                    </div>
                ))}
            </dl>

            <Panel title="Uploads per day">
                {submissionsPerDay.length > 0 ? (
                    <div className="h-56 w-full px-2 pb-2 pt-4 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={submissionsPerDay} margin={{ top: 0, right: 8, left: -28, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.55)" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} minTickGap={16} />
                                <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.55)" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#14141b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12 }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                    formatter={(value) => [value as number, 'Uploads']}
                                />
                                <Bar isAnimationActive={false} dataKey="submissions" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState title="No uploads yet">Each day with entries appears here.</EmptyState>
                )}
            </Panel>

            <div className="grid items-start gap-4 xl:grid-cols-2">
                <Panel title="Most voted players" description="Votes across all of a player's entries.">
                    {playerStats.length > 0 ? (
                        <RankBars
                            unit="votes"
                            items={playerStats.slice(0, 8).map((player) => ({
                                id: player.name,
                                label: player.name,
                                value: player.votes,
                                sub: `${player.submissions} ${player.submissions === 1 ? 'entry' : 'entries'}`,
                            }))}
                        />
                    ) : (
                        <EmptyState title="No players yet">Players appear once entries arrive.</EmptyState>
                    )}
                </Panel>

                <Panel title="Entries by category" description="Ranked by number of entries.">
                    {categoryStats.length > 0 ? (
                        <RankBars
                            unit="entries"
                            items={categoryStats.map((c) => ({
                                id: c.name,
                                label: c.name,
                                value: c.count,
                                sub: `${c.votes} ${c.votes === 1 ? 'vote' : 'votes'}`,
                            }))}
                        />
                    ) : (
                        <EmptyState title="No categories">Add categories in Contest setup.</EmptyState>
                    )}
                </Panel>
            </div>
        </div>
    );

    if (isInline) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-[#060606] overflow-y-auto">
            {/* Background Decor */}
            <div className="absolute inset-x-0 top-0 h-[500px] pointer-events-none opacity-50">
                <div className="absolute inset-0 bg-white/[0.03]" />
                <div className="absolute top-[-100px] left-1/4 w-[600px] h-[300px] bg-fivem-orange/20 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative min-h-screen p-4 md:p-8 max-w-7xl mx-auto pb-20">
                {/* Header Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8 md:mb-12 pt-4"
                >
                    <button data-btn="secondary"
                        onClick={onClose}
                        className="flex items-center gap-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md border border-white/10 transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={16} />
                        <span className="text-sm font-medium">Back to Settings</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 " />
                            <span className="text-xs tabular-nums text-emerald-500">Live Connect</span>
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
                        Contest <span className="text-fivem-orange">Analytics</span>
                    </h1>
                    <p className="text-white/55 max-w-2xl text-sm">
                        Real-time insights and engagement metrics for the current photo competition.
                    </p>
                </motion.div>

                {content}
            </div>
        </div>
    );
}
