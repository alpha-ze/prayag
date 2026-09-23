/**
 * Round 1 Results screen
 * Shows everyone's Round 1 score.
 * ALL players proceed to Round 2 — no cutoff, no countdown.
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, Zap, Timer } from 'lucide-react';
import { leaderboardAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useCompetitionStore } from '@/store/competitionStore';
import Button from '@/components/ui/Button';

const QualifyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { advancePhase, setQualified } = useCompetitionStore();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAndSort();
  }, []);

  const loadAndSort = async () => {
    try {
      const data = await leaderboardAPI.getLeaderboard();

      // Sort by promptle score desc, then time taken asc
      const sorted = [...data].sort((a, b) => {
        const aScore = (a as any)?.roundScores?.promptle ?? a.totalScore ?? 0;
        const bScore = (b as any)?.roundScores?.promptle ?? b.totalScore ?? 0;
        if (bScore !== aScore) return bScore - aScore;
        const aTime = (a as any).timeTaken ?? 99999;
        const bTime = (b as any).timeTaken ?? 99999;
        return aTime - bTime;
      });

      setLeaderboard(sorted);
      // Everyone qualifies
      setQualified(true);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    advancePhase('round2');
    navigate('/game/round2');
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-gray-500 font-bold text-sm w-5 text-center inline-block">{rank}</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-neon-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading Round 1 results…</p>
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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-9 h-9 text-neon-purple" />
            <h1 className="text-4xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              ROUND 1 RESULTS
            </h1>
          </div>
          <p className="text-gray-400">All players advance to Round 2 — Survival</p>
        </motion.div>

        {/* Your score banner */}
        {myEntry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 rounded-2xl p-6 border-2 text-center bg-neon-green/10 border-neon-green/40"
          >
            <h2 className="text-2xl font-bold font-cyber text-neon-green mb-1">
              Your Score: {((myEntry.roundScores as any)?.promptle ?? myEntry.totalScore ?? 0).toLocaleString()} pts
            </h2>
            <p className="text-gray-300 mb-4">Rank #{leaderboard.findIndex(e => e.userId === user?.id) + 1} — Ready for Round 2!</p>
            <Button onClick={handleProceed} variant="primary" size="lg" className="mx-auto">
              <Zap className="w-5 h-5 mr-2" />
              Enter Round 2
            </Button>
          </motion.div>
        )}

        {!myEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 text-center"
          >
            <Button onClick={handleProceed} variant="primary" size="lg" className="mx-auto">
              <Zap className="w-5 h-5 mr-2" />
              Continue to Round 2
            </Button>
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
            <h2 className="text-lg font-bold text-white">Round 1 Standings</h2>
            <span className="text-xs text-gray-500">{leaderboard.length} players</span>
          </div>

          <div className="divide-y divide-gray-700/40">
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.userId === user?.id;
              const promptleScore = (entry as any)?.roundScores?.promptle ?? entry.totalScore ?? 0;
              const timeTaken = (entry as any).timeTaken;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`flex items-center px-5 py-3 ${
                    isMe ? 'bg-neon-blue/10 ring-1 ring-neon-blue/30 ring-inset' : ''
                  }`}
                >
                  <div className="w-8 flex justify-center mr-4">{getRankIcon(rank)}</div>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 bg-gradient-to-r from-neon-blue to-neon-purple">
                    {entry.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${isMe ? 'text-neon-blue' : 'text-white'}`}>
                      {entry.username}
                      {isMe && <span className="ml-2 text-xs text-neon-blue">(you)</span>}
                    </p>
                    {timeTaken != null && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {timeTaken}s
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-white">{promptleScore.toLocaleString()}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QualifyScreen;
