/**
 * Final Leaderboard — shown after Round 2.
 * Displays total score = Round 1 (Promptle) + Round 2 (Survival).
 * Polls every 5 s so late-finishers' scores update in real time.
 */
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, Zap, RotateCcw } from 'lucide-react';
import { leaderboardAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useCompetitionStore } from '@/store/competitionStore';
import { clearPromptelSession, clearSurvivalSession, useGameStore } from '@/store/gameStore';
import { shortId } from '@/utils/playerId';
import Button from '@/components/ui/Button';

const FinalLeaderboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { resetCompetition } = useCompetitionStore();
  const { resetPromptelSession, resetSurvivalSession } = useGameStore();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const handlePlayAgain = () => {
    // Clear all active game sessions from localStorage and memory
    clearPromptelSession();
    clearSurvivalSession();
    resetPromptelSession();
    resetSurvivalSession();
    // Reset competition phase back to round1_img1
    resetCompetition();
    navigate('/game/round1', { replace: true });
  };

  const load = async () => {
    try {
      const data = await leaderboardAPI.getLeaderboard();
      const changed = new Set<string>();
      data.forEach((e: any) => {
        const old = prevScoresRef.current.get(e.userId);
        if (old !== undefined && old !== e.totalScore) changed.add(e.userId);
        prevScoresRef.current.set(e.userId, e.totalScore);
      });
      setLeaderboard(data);
      if (changed.size) {
        setFlashIds(changed);
        setTimeout(() => setFlashIds(new Set()), 2000);
      }
    } catch {/* ignore */} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000); // live refresh every 5 s
    // Also respond to socket broadcasts
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (Array.isArray(data) && data.length > 0) {
        const changed = new Set<string>();
        data.forEach((e: any) => {
          const old = prevScoresRef.current.get(e.userId);
          if (old !== undefined && old !== e.totalScore) changed.add(e.userId);
          prevScoresRef.current.set(e.userId, e.totalScore);
        });
        setLeaderboard(data);
        if (changed.size) {
          setFlashIds(changed);
          setTimeout(() => setFlashIds(new Set()), 2000);
        }
      }
    };
    window.addEventListener('leaderboard_updated', handler);
    return () => { clearInterval(iv); window.removeEventListener('leaderboard_updated', handler); };
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-7 h-7 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-gray-500 font-bold w-6 text-center">{rank}</span>;
  };

  const getAvatarGrad = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-yellow-600';
    if (rank === 2) return 'from-gray-400 to-gray-500';
    if (rank === 3) return 'from-amber-600 to-amber-700';
    return 'from-neon-blue to-neon-purple';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading final results…</p>
        </div>
      </div>
    );
  }

  const myEntry = leaderboard.find((e) => e.userId === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 p-6">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-bold font-cyber bg-gradient-to-r from-yellow-400 to-neon-purple bg-clip-text text-transparent">
              FINAL STANDINGS
            </h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-gray-400">Total score: Round 1 (Promptle) + Round 2 (Survival)</p>
          <div className="inline-flex items-center gap-2 mt-2 bg-neon-green/10 border border-neon-green/20 rounded-full px-4 py-1">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-neon-green text-xs font-semibold">LIVE</span>
          </div>
          {/* Play Again */}
          <div className="mt-5">
            <Button onClick={handlePlayAgain} variant="secondary" size="lg" className="gap-2">
              <RotateCcw className="w-5 h-5" />
              Play Again
            </Button>
          </div>
        </motion.div>

        {/* Your result */}
        {myEntry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-2xl p-5 border-2 flex items-center gap-5 ${
              myEntry.rank <= 3
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-neon-blue/10 border-neon-blue/30'
            }`}
          >
            {/* Rank badge — no emojis */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${
              myEntry.rank === 1 ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40' :
              myEntry.rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
              myEntry.rank === 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' :
              'bg-dark-300 text-gray-400 border border-gray-600'
            }`}>
              #{myEntry.rank}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">
                {myEntry.username}
                <span className="ml-2 text-xs font-mono text-gray-500 bg-dark-300 px-2 py-0.5 rounded-full">{shortId(myEntry.userId)}</span>
                <span className="text-neon-blue text-sm ml-1">(you)</span>
              </p>
              <p className="text-gray-400 text-sm">
                Promptle: <span className="text-neon-blue">{(myEntry.roundScores as any)?.promptle ?? 0}</span>
                {' · '}
                Survival: <span className="text-neon-green">{(myEntry.roundScores as any)?.survival ?? 0}</span>
              </p>
            </div>
            <p className="text-3xl font-bold text-white">{myEntry.totalScore.toLocaleString()}</p>
          </motion.div>
        )}

        {/* Full leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-200/80 backdrop-blur-xl rounded-2xl border border-gray-600/50 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-600/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">All Players</h2>
            <span className="text-xs text-gray-500">{leaderboard.length} competitors</span>
          </div>

          <div className="divide-y divide-gray-700/40">
            <AnimatePresence initial={false}>
              {leaderboard.map((entry, idx) => {
                const isMe = entry.userId === user?.id;
                const justFlashed = flashIds.has(entry.userId);
                return (
                  <motion.div
                    key={entry.userId}
                    layout
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, layout: { duration: 0.35 } }}
                    className={`flex items-center px-5 py-3 ${
                      isMe ? 'bg-neon-blue/10 ring-1 ring-neon-blue/30 ring-inset' : ''
                    } ${justFlashed ? 'ring-2 ring-neon-green/50 ring-inset' : ''}`}
                  >
                    <div className="w-9 flex justify-center mr-3">{getRankIcon(entry.rank)}</div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mr-3 bg-gradient-to-r ${getAvatarGrad(entry.rank)} text-white`}>
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isMe ? 'text-neon-blue' : 'text-white'}`}>
                        {entry.username}
                        <span className="ml-2 text-xs font-mono text-gray-600 bg-dark-400 px-1.5 py-0.5 rounded">{shortId(entry.userId)}</span>
                        {isMe && <span className="text-xs ml-1 text-neon-blue">(you)</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-500">
                          R1: {(entry.roundScores as any)?.promptle ?? 0} · R2: {(entry.roundScores as any)?.survival ?? 0}
                        </p>
                        {entry.lastActivity && (
                          <p className="text-xs text-gray-600">
                            {new Date(entry.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right mr-3">
                      <motion.p
                        key={entry.totalScore}
                        initial={justFlashed ? { scale: 1.3, color: '#39ff14' } : false}
                        animate={{ scale: 1, color: '#ffffff' }}
                        transition={{ duration: 0.4 }}
                        className="text-xl font-bold"
                      >
                        {entry.totalScore.toLocaleString()}
                      </motion.p>
                    </div>
                    {justFlashed && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1 bg-neon-green/20 border border-neon-green/30 px-2 py-0.5 rounded-lg"
                      >
                        <Zap className="w-3 h-3 text-neon-green" />
                        <span className="text-neon-green text-xs font-bold">+pts</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FinalLeaderboard;
