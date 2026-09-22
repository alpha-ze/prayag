import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Trophy, Heart, Scroll, Target, RotateCcw, Shield, Lightbulb } from 'lucide-react';
import Button from '@/components/ui/Button';

const SurvivalResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { session, reason } = (location.state as any) || {
    session: { score: 0, health: 0, attemptsRemaining: 0, attemptsUsed: 0, turn: 0, status: 'dead', completedObjectives: [], objectives: [] },
    reason: 'unknown',
  };

  const survived = session?.status === 'survived';
  const turnsSurvived = session?.turn ?? 0;

  // Prefer attemptsRemaining; fall back to health for older sessions
  const attemptsRemaining: number = session?.attemptsRemaining ?? session?.health ?? 0;
  const attemptsUsed: number = session?.attemptsUsed ?? (5 - attemptsRemaining);

  const completedCount = session?.completedObjectives?.length ?? 0;
  const totalObjectives = session?.objectives?.length ?? 3;

  // Attempts-based score breakdown (mirrors controller logic)
  // base = max(250, 1000 - attemptsUsed * 150)
  // attemptsBonus = attemptsRemaining * 200
  // actionScore = incremental points earned during non-failure, non-win turns
  const base = survived ? Math.max(250, 1000 - attemptsUsed * 150) : 0;
  const attemptsBonus = survived ? attemptsRemaining * 200 : 0;
  const survivalTotal = base + attemptsBonus;
  // Everything else in the score was incremental action score
  const actionScore = Math.max(0, (session?.score ?? 0) - survivalTotal);

  const reasonLabel: Record<string, string> = {
    victory: 'You escaped and reached safety!',
    health_depleted: 'You used all 5 attempts.',
    turn_limit_reached: 'You reached the turn limit.',
    timeout: 'Time ran out.',
    unknown: 'The scenario ended.',
  };

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
          {survived ? (
            <>
              <div className="w-24 h-24 bg-neon-green/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-neon-green/50">
                <Shield className="w-12 h-12 text-neon-green" />
              </div>
              <h1 className="text-5xl font-bold font-cyber text-neon-green mb-2">SURVIVED!</h1>
              <p className="text-gray-400 text-lg">{reasonLabel[reason || 'victory']}</p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              <h1 className="text-5xl font-bold font-cyber text-red-400 mb-2">ELIMINATED</h1>
              <p className="text-gray-400 text-lg">{reasonLabel[reason || 'unknown']}</p>
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
            {/* Incremental action score */}
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400">Action Score</span>
              <span className="text-white font-semibold">+{actionScore}</span>
            </div>

            {/* Survival base score */}
            {survived && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                  <span className="text-gray-400">Survival Base</span>
                  <p className="text-xs text-gray-600 mt-0.5">1000 − ({attemptsUsed} × 150)</p>
                </div>
                <span className="text-neon-green font-semibold">+{base}</span>
              </div>
            )}

            {/* Attempts bonus */}
            {survived && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                  <span className="text-gray-400">Attempts Bonus</span>
                  <p className="text-xs text-gray-600 mt-0.5">{attemptsRemaining} unused × 200 pts</p>
                </div>
                <span className={`font-semibold ${attemptsBonus > 0 ? 'text-neon-green' : 'text-gray-500'}`}>
                  +{attemptsBonus}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center py-3 bg-dark-300 rounded-xl px-4">
              <span className="text-white font-bold text-lg">Total Score</span>
              <span className={`font-bold text-2xl ${survived ? 'text-neon-green' : 'text-neon-blue'}`}>
                {(session?.score ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Max score hint */}
            {survived && attemptsRemaining < 5 && (
              <p className="text-xs text-gray-500 text-center pt-1 flex items-center justify-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" />
                Survive with all 5 attempts intact for the maximum score of 2,000 pts
              </p>
            )}
            {survived && attemptsRemaining === 5 && (
              <p className="text-xs text-neon-green text-center pt-1 font-semibold flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Perfect run — all 5 attempts preserved!
              </p>
            )}
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
            <Scroll className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{turnsSurvived}</p>
            <p className="text-xs text-gray-400">Turns Survived</p>
          </div>
          <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
            <Heart className={`w-6 h-6 mx-auto mb-2 ${attemptsRemaining === 5 ? 'text-neon-green' : attemptsRemaining > 0 ? 'text-red-400' : 'text-gray-600'}`} />
            <p className={`text-2xl font-bold ${attemptsRemaining === 5 ? 'text-neon-green' : 'text-white'}`}>
              {attemptsRemaining}/5
            </p>
            <p className="text-xs text-gray-400">Attempts Left</p>
          </div>
          <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
            <Target className="w-6 h-6 text-neon-purple mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{completedCount}/{totalObjectives}</p>
            <p className="text-xs text-gray-400">Objectives</p>
          </div>
        </motion.div>

        {/* Objectives */}
        {session?.objectives?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-dark-200 rounded-2xl p-6 border border-gray-600 mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3">Objectives</h3>
            <div className="space-y-2">
              {session.objectives.map((obj: any) => {
                const done = session.completedObjectives?.includes(obj.id);
                return (
                  <div key={obj.id} className={`flex items-center justify-between p-3 rounded-lg ${done ? 'bg-green-500/20 border border-green-500/30' : 'bg-dark-300 border border-gray-700'}`}>
                    <div className="flex items-center space-x-3">
                      {done
                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                        : <XCircle className="w-4 h-4 text-gray-500" />}
                      <span className={done ? 'text-green-400' : 'text-gray-400'}>{obj.title}</span>
                    </div>
                    <span className={`text-sm font-semibold ${done ? 'text-green-400' : 'text-gray-500'}`}>
                      +{obj.points}
                    </span>
                  </div>
                );
              })}
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
          <Button onClick={() => navigate('/survival')} variant="secondary" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
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

export default SurvivalResults;
