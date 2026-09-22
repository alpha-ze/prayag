/**
 * Qualifying screen
 *
 * Shown after both Promptle images are done.
 * Fetches the current leaderboard, sorts by:
 *   1. Promptle score descending
 *   2. Time taken ascending (faster = better tie-break)
 * Top QUALIFYING_CUTOFF (45) players advance to Round 2.
 * This player is checked against the list and auto-navigated accordingly.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, Clock, CheckCircle, XCircle, Zap, PartyPopper, Timer } from 'lucide-react';
import { leaderboardAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  useCompetitionStore,
  QUALIFYING_CUTOFF,
} from '@/store/competitionStore';
import Button from '@/components/ui/Button';

const QualifyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { advancePhase, setQualified } = useCompetitionStore();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const [playerQualified, setPlayerQualified] = useState<boolean | null>(null);

  useEffect(() => {
    loadAndSort();
  }, []);

  const loadAndSort = async () => {
    try {
      const data = await leaderboardAPI.getLeaderboard();

      // Sort by promptle score desc, then time taken asc (lower = faster)
      const sorted = [...data].sort((a, b) => {
        const aScore = (a.roundScores as any)?.promptle ?? a.totalScore ?? 0;
        const bScore = (b.roundScores as any)?.promptle ?? b.totalScore ?? 0;
        if (bScore !== aScore) return bScore - aScore;
        // tiebreak: faster time (lower) wins
        const aTime = (a as any).timeTaken ?? 99999;
        const bTime = (b as any).timeTaken ?? 99999;
        return aTime - bTime;
      });

      setLeaderboard(sorted);

      // Check if the current user is in the top QUALIFYING_CUTOFF
      const qualifyingIds = new Set(
        sorted.slice(0, QUALIFYING_CUTOFF).map((e) => e.userId)
      );
      const qualified = user ? qualifyingIds.has(user.id) : false;
      setPlayerQualified(qualified);
      setQualified(qualified);
    } catch (err) {
      console.error('Failed to load qualifying leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown then auto-navigate
  useEffect(() => {
    if (isLoading || playerQualified === null) return;

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          handleProceed();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, playerQualified]);

  const handleProceed = () => {
    if (playerQualified) {
      advancePhase('round2');
      navigate('/game/round2');
    } else {
      advancePhase('final');
      navigate('/game/final');
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank <= 3) return <Medal className="w-5 h-5 text-gray-300" />;
    return <span className="text-gray-500 font-bold text-sm w-5 text-center">{rank}</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-neon-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Calculating qualifying results…</p>
        </div>
      </div>
    );
  }

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
          <p className="text-gray-400">Top {QUALIFYING_CUTOFF} players advance to Round 2 — Survival</p>
        </motion.div>

        {/* Your result banner */}
        <AnimatePresence>
          {playerQualified !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-8 rounded-2xl p-6 border-2 text-center ${
                playerQualified
                  ? 'bg-neon-green/10 border-neon-green/40'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {playerQualified ? (
                <>
                  <CheckCircle className="w-12 h-12 text-neon-green mx-auto mb-3" />
                  <h2 className="text-3xl font-bold font-cyber text-neon-green mb-1 flex items-center justify-center gap-2">
                    <PartyPopper className="w-7 h-7" /> YOU QUALIFIED!
                  </h2>
                  <p className="text-gray-300">You're in the top {QUALIFYING_CUTOFF} — get ready for Round 2</p>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h2 className="text-3xl font-bold font-cyber text-red-400 mb-1">
                    Better luck next time
                  </h2>
                  <p className="text-gray-300">You didn't make the top {QUALIFYING_CUTOFF} this round</p>
                </>
              )}

              <div className="mt-4 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">
                  {playerQualified ? 'Entering Round 2' : 'Viewing final leaderboard'} in{' '}
                  <span className="text-white font-bold">{countdown}s</span>
                </span>
              </div>

              <Button
                onClick={handleProceed}
                className="mt-4 mx-auto"
                variant={playerQualified ? 'primary' : 'secondary'}
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                {playerQualified ? 'Enter Round 2 Now' : 'View Final Leaderboard'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-200/80 backdrop-blur-xl rounded-2xl border border-gray-600/50 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-600/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Qualifying Standings</h2>
            <span className="text-xs text-gray-500">Sorted by Round 1 score · fastest time breaks ties</span>
          </div>

          <div className="divide-y divide-gray-700/40">
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const qualifies = rank <= QUALIFYING_CUTOFF;
              const isMe = entry.userId === user?.id;
              const promptleScore = (entry.roundScores as any)?.promptle ?? entry.totalScore ?? 0;
              const timeTaken = (entry as any).timeTaken;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`flex items-center px-5 py-3 transition-all ${
                    isMe ? 'bg-neon-blue/10 ring-1 ring-neon-blue/30 ring-inset' : ''
                  } ${rank === QUALIFYING_CUTOFF ? 'border-b-2 border-neon-green/30' : ''}`}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center mr-4">{getRankIcon(rank)}</div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                    qualifies ? 'bg-gradient-to-r from-neon-blue to-neon-purple' : 'bg-gray-700'
                  }`}>
                    {entry.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
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

                  {/* Score */}
                  <p className="text-lg font-bold text-white mr-4">
                    {promptleScore.toLocaleString()}
                  </p>

                  {/* Qualify badge */}
                  {qualifies ? (
                    <span className="text-xs bg-neon-green/20 text-neon-green border border-neon-green/30 px-2 py-0.5 rounded-full font-semibold">
                      ✓ Round 2
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                      Eliminated
                    </span>
                  )}
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
