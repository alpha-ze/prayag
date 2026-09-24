/**
 * /live — Fullscreen live leaderboard for projector / big screen display.
 * No auth required. Auto-updates via socket + polls every 5s.
 * Large text, high contrast, designed to be readable from across a room.
 */
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Zap } from 'lucide-react';
import { leaderboardAPI } from '@/services/api';

const LiveLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Map<string, number>>(new Map());

  const applyData = (data: any[]) => {
    const changed = new Set<string>();
    data.forEach((e) => {
      const old = prevScoresRef.current.get(e.userId);
      if (old !== undefined && old !== e.totalScore) changed.add(e.userId);
      prevScoresRef.current.set(e.userId, e.totalScore);
    });
    setLeaderboard(data);
    setLastUpdate(new Date());
    if (changed.size > 0) {
      setFlashIds(changed);
      setTimeout(() => setFlashIds(new Set()), 2000);
    }
    setIsLoading(false);
  };

  const load = async () => {
    try {
      const data = await leaderboardAPI.getLeaderboard();
      applyData(data);
    } catch {/* ignore */}
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);

    // Listen to socket broadcasts
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (Array.isArray(data) && data.length > 0) applyData(data);
    };
    window.addEventListener('leaderboard_updated', handler);

    return () => {
      clearInterval(iv);
      window.removeEventListener('leaderboard_updated', handler);
    };
  }, []);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-300" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-amber-500" />;
    return <span className="text-gray-500 font-bold text-2xl w-8 text-center inline-block">{rank}</span>;
  };

  const getRowBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-l-4 border-yellow-400';
    if (rank === 2) return 'bg-gray-400/10 border-l-4 border-gray-300';
    if (rank === 3) return 'bg-amber-600/10 border-l-4 border-amber-500';
    return 'border-l-4 border-transparent';
  };

  // Show top 20 on screen
  const visible = leaderboard.slice(0, 20);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-6" />
          <p className="text-white text-2xl font-bold">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 border-b border-gray-700 px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Trophy className="w-12 h-12 text-yellow-400" />
          <div>
            <h1 className="text-5xl font-bold font-cyber bg-gradient-to-r from-yellow-400 to-neon-purple bg-clip-text text-transparent">
              PROMPT X
            </h1>
            <p className="text-gray-400 text-lg">Live Leaderboard</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            <span className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
            <span className="text-neon-green font-bold text-lg">LIVE</span>
          </div>
          <p className="text-gray-500 text-sm">
            Updated {lastUpdate.toLocaleTimeString()}
          </p>
          <p className="text-gray-500 text-sm">{leaderboard.length} players</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-10 py-6">
        {/* Column headers */}
        <div className="flex items-center px-4 pb-3 border-b border-gray-800 mb-2">
          <div className="w-16 text-gray-500 text-sm font-semibold uppercase">Rank</div>
          <div className="flex-1 text-gray-500 text-sm font-semibold uppercase">Player</div>
          <div className="w-40 text-right text-gray-500 text-sm font-semibold uppercase">R1</div>
          <div className="w-40 text-right text-gray-500 text-sm font-semibold uppercase">R2</div>
          <div className="w-48 text-right text-gray-500 text-sm font-semibold uppercase">Total</div>
        </div>

        <AnimatePresence initial={false}>
          {visible.map((entry, idx) => {
            const rank = idx + 1;
            const justFlashed = flashIds.has(entry.userId);
            const r1 = (entry as any)?.roundScores?.promptle ?? 0;
            const r2 = (entry as any)?.roundScores?.survival ?? 0;

            return (
              <motion.div
                key={entry.userId}
                layout
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, layout: { duration: 0.4 } }}
                className={`flex items-center px-4 py-4 rounded-xl mb-2 transition-all ${getRowBg(rank)} ${
                  justFlashed ? 'ring-2 ring-neon-green/60' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-16 flex justify-start">
                  {getRankDisplay(rank)}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl text-white ${
                    rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                    rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                    'bg-gradient-to-r from-neon-blue to-neon-purple'
                  }`}>
                    {entry.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-white block">{entry.username}</span>
                    {entry.lastActivity && (
                      <span className="text-sm text-gray-500">
                        {new Date(entry.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* R1 score */}
                <div className="w-40 text-right">
                  <span className="text-xl text-neon-blue font-semibold">{r1.toLocaleString()}</span>
                </div>

                {/* R2 score */}
                <div className="w-40 text-right">
                  <span className="text-xl text-neon-green font-semibold">{r2.toLocaleString()}</span>
                </div>

                {/* Total */}
                <div className="w-48 text-right flex items-center justify-end gap-2">
                  {justFlashed && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    >
                      <Zap className="w-5 h-5 text-neon-green" />
                    </motion.div>
                  )}
                  <motion.span
                    key={entry.totalScore}
                    initial={justFlashed ? { scale: 1.4, color: '#39ff14' } : false}
                    animate={{ scale: 1, color: '#ffffff' }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl font-bold"
                  >
                    {entry.totalScore.toLocaleString()}
                  </motion.span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {leaderboard.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="w-20 h-20 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-2xl">No players yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveLeaderboard;
