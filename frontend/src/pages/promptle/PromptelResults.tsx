import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Trophy, Target, Clock, Lightbulb, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

const PromptelResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { session, completed, reason } = (location.state as any) || {
    session: { score: 0, discoveredKeywords: [], remainingGuesses: 0, hintUsed: false, timeRemaining: 0 },
    completed: false,
    reason: 'unknown',
  };

  const keywordCount = session?.discoveredKeywords?.length ?? 0;
  const totalKeywords = 5;
  const guessesUsed = 8 - (session?.remainingGuesses ?? 8);
  const timeBonus = completed ? Math.floor((session?.timeRemaining ?? 0) / 10) : 0;
  const hintPenalty = session?.hintUsed ? -25 : 0;
  const keywordBonus = keywordCount * 100;
  const baseScore = completed ? 50 : 0;
  const totalScore = session?.score ?? (baseScore + keywordBonus + timeBonus + hintPenalty);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      <div className="relative z-10 max-w-2xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          {completed ? (
            <>
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/50">
                <Trophy className="w-12 h-12 text-green-400" />
              </div>
              <h1 className="text-5xl font-bold font-cyber text-green-400 mb-2">CHALLENGE COMPLETE!</h1>
              <p className="text-gray-400 text-lg">You found all the hidden keywords</p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              <h1 className="text-5xl font-bold font-cyber text-red-400 mb-2">
                {reason === 'timeout' ? 'TIME UP!' : 'CHALLENGE FAILED'}
              </h1>
              <p className="text-gray-400 text-lg">Better luck next time</p>
            </>
          )}
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-200 rounded-2xl p-6 border border-gray-600 mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <Trophy className="w-5 h-5 text-neon-purple mr-2" />
            Score Breakdown
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400">Base Score</span>
              <span className="text-white font-semibold">+{baseScore}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400">Keywords Found ({keywordCount} × 100)</span>
              <span className="text-green-400 font-semibold">+{keywordBonus}</span>
            </div>
            {timeBonus > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Time Bonus</span>
                <span className="text-neon-blue font-semibold">+{timeBonus}</span>
              </div>
            )}
            {session?.hintUsed && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" /> Hint Penalty
                </span>
                <span className="text-red-400 font-semibold">{hintPenalty}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 bg-dark-300 rounded-xl px-4">
              <span className="text-white font-bold text-lg">Total Score</span>
              <span className={`font-bold text-2xl ${completed ? 'text-neon-green' : 'text-neon-blue'}`}>
                {totalScore.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
            <Target className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{keywordCount}/{totalKeywords}</p>
            <p className="text-xs text-gray-400">Keywords Found</p>
          </div>
          <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
            <XCircle className="w-6 h-6 text-neon-pink mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{guessesUsed}/8</p>
            <p className="text-xs text-gray-400">Guesses Used</p>
          </div>
          <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
            <Clock className="w-6 h-6 text-neon-purple mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{session?.timeRemaining ?? 0}s</p>
            <p className="text-xs text-gray-400">Time Remaining</p>
          </div>
        </motion.div>

        {/* Discovered Keywords */}
        {keywordCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-dark-200 rounded-2xl p-6 border border-gray-600 mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3">Keywords Discovered</h3>
            <div className="flex flex-wrap gap-2">
              {(session?.discoveredKeywords ?? []).map((kw: string) => (
                <span
                  key={kw}
                  className="flex items-center space-x-1 bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-sm"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>{kw}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4"
        >
          <Button onClick={() => navigate('/promptle')} variant="secondary" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <Button onClick={() => navigate('/leaderboard')} variant="primary" className="flex-1">
            <Trophy className="w-4 h-4 mr-2" />
            View Leaderboard
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PromptelResults;
