import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send, MapPin, Package, Target, Crown, Heart, Skull, Shield, Zap
} from 'lucide-react';
import { useGameStore, getSavedSurvivalSession, clearSurvivalSession } from '@/store/gameStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GameTimer from '@/components/game/GameTimer';

// ── Types ─────────────────────────────────────────────────────────────────────
type OutcomeType = 'success' | 'partial_success' | 'failure' | 'critical_success' | 'critical_failure';

interface ActionResult {
  outcome: OutcomeType;
  survived: boolean;        // true = player survives this turn
  gameOver: boolean;        // true = game ends
  reason: string;           // AI narrative explaining what happened
  nextEvent: string;        // what happens next
  damage: number;
  scoreChange: number;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function outcomeColor(outcome: OutcomeType) {
  switch (outcome) {
    case 'critical_success': return 'from-neon-green/30 to-green-900/20 border-neon-green/50';
    case 'success':          return 'from-green-500/20 to-green-900/10 border-green-500/30';
    case 'partial_success':  return 'from-yellow-500/20 to-yellow-900/10 border-yellow-500/30';
    case 'failure':          return 'from-orange-500/20 to-orange-900/10 border-orange-500/30';
    case 'critical_failure': return 'from-red-600/30 to-red-900/20 border-red-600/50';
    default:                 return 'from-gray-500/20 to-gray-900/10 border-gray-500/30';
  }
}

function outcomeBadgeColor(outcome: OutcomeType) {
  switch (outcome) {
    case 'critical_success': return 'bg-neon-green text-black';
    case 'success':          return 'bg-green-500 text-white';
    case 'partial_success':  return 'bg-yellow-500 text-black';
    case 'failure':          return 'bg-orange-500 text-white';
    case 'critical_failure': return 'bg-red-600 text-white';
    default:                 return 'bg-gray-500 text-white';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const SurvivalGame: React.FC = () => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  const {
    currentSurvivalSession,
    survivalHistory,
    startSurvivalScenario,
    restoreSurvivalSession,
    submitSurvivalAction,
    resetSurvivalSession,
    isLoading,
    error,
  } = useGameStore();

  const [currentAction, setCurrentAction] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // For the dramatic "survived / dying" overlay
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  // Animated attempts count (hearts)
  const [displayHealth, setDisplayHealth] = useState(5);

  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // ── Start / restore scenario ────────────────────────────────────────────────
  useEffect(() => {
    if (!scenarioId) return;
    // Already have a live session in the store — nothing to do
    if (currentSurvivalSession) return;
    if (isLoading || isStarting) return;

    setIsStarting(true);

    const saved = getSavedSurvivalSession();
    const tryRestore = saved && saved.scenarioId === scenarioId;

    const init = tryRestore
      ? restoreSurvivalSession(saved.sessionId).then((ok) => {
          if (!ok) {
            // Session expired/ended — start fresh
            return startSurvivalScenario(scenarioId);
          }
        })
      : startSurvivalScenario(scenarioId);

    init
      .catch(() => navigate('/survival'))
      .finally(() => setIsStarting(false));
  }, [scenarioId]);

  // Helper: clear localStorage and navigate away on game-over or timeout
  const handleGameOver = (path: string, state?: any) => {
    clearSurvivalSession();
    setGameComplete(true);
    setTimeout(() => {
      setShowResultOverlay(false);
      navigate(path, state ? { state } : undefined);
    }, 5000);
  };

  // Sync display attempts with session (attemptsRemaining drives hearts)
  useEffect(() => {
    const attempts = (currentSurvivalSession as any)?.attemptsRemaining ?? currentSurvivalSession?.health;
    if (attempts !== undefined) {
      setDisplayHealth(attempts);
    }
  }, [(currentSurvivalSession as any)?.attemptsRemaining, currentSurvivalSession?.health]);

  // Scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [survivalHistory]);

  // Only reset the in-memory store when the game is fully complete (not on every unmount)
  // so a browser refresh doesn't destroy the active session.
  useEffect(() => {
    return () => {
      if (gameComplete) resetSurvivalSession();
    };
  }, [gameComplete, resetSurvivalSession]);

  // ── Submit action ───────────────────────────────────────────────────────────
  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionValue = currentAction.trim();
    if (!actionValue || !currentSurvivalSession || isLoading) return;

    try {
      const result = await submitSurvivalAction(actionValue);

      // Extract AI response from the latest history entry
      const updatedHistory = useGameStore.getState().survivalHistory;
      const lastEntry = updatedHistory[updatedHistory.length - 1];
      const aiResp = lastEntry?.aiResponse;

      const outcome: OutcomeType = aiResp?.outcome || 'partial_success';
      // A failed outcome costs one attempt
      const lostAttempt = outcome === 'failure' || outcome === 'critical_failure';
      const newAttempts = Math.max(0, displayHealth - (lostAttempt ? 1 : 0));

      // Animate heart loss on any bad outcome
      if (lostAttempt) {
        setDisplayHealth(newAttempts);
      }

      // Build dramatic result
      const ar: ActionResult = {
        outcome,
        survived: !result.isGameOver || outcome === 'critical_success',
        gameOver: result.isGameOver,
        reason: aiResp?.reason || 'Your action had consequences...',
        nextEvent: aiResp?.nextEvent || 'Continue your journey...',
        damage: lostAttempt ? 1 : 0,   // 1 = lost an attempt, 0 = safe
        scoreChange: aiResp?.scoreChange ?? 0,
      };

      setActionResult(ar);
      setShowResultOverlay(true);
      setCurrentAction('');

      // Auto-hide overlay after 4s (or on game over stay longer then navigate)
      if (result.isGameOver) {
        handleGameOver('/survival/results', { session: currentSurvivalSession, reason: result.gameOverReason });
      } else {
        setTimeout(() => {
          setShowResultOverlay(false);
          inputRef.current?.focus();
        }, 4000);
      }

    } catch (err) {
      console.error('Failed to submit action:', err);
    }
  };

  const handleTimeUp = () => {
    clearSurvivalSession();
    setGameComplete(true);
    navigate('/survival/results', { state: { session: currentSurvivalSession, reason: 'timeout' } });
  };

  // ── Loading states ──────────────────────────────────────────────────────────
  if ((isLoading || isStarting) && !currentSurvivalSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading scenario...</p>
        </div>
      </div>
    );
  }

  if (!currentSurvivalSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading scenario...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
              <Button onClick={() => navigate('/survival')} size="sm" className="mt-3">Back</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const maxHealth = currentSurvivalSession?.maxHealth ?? 5;
  const sessionAny = currentSurvivalSession as any;
  const healthPct = maxHealth > 0 ? (displayHealth / maxHealth) * 100 : 0;
  const isLowHealth = healthPct <= 40;
  const isCriticalHealth = healthPct <= 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 relative">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      {/* ── Dramatic Result Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showResultOverlay && actionResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!actionResult.gameOver) { setShowResultOverlay(false); inputRef.current?.focus(); } }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`max-w-lg w-full mx-4 bg-gradient-to-br ${outcomeColor(actionResult.outcome)} rounded-3xl p-8 border-2 shadow-2xl`}
            >
              {/* Big outcome icon */}
              <div className="text-center mb-6">
                {actionResult.outcome === 'critical_success' ? (
                  <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }} transition={{ repeat: 2, duration: 0.4 }}>
                    <Shield className="w-20 h-20 text-neon-green mx-auto" />
                  </motion.div>
                ) : actionResult.outcome === 'success' ? (
                  <Zap className="w-20 h-20 text-green-400 mx-auto" />
                ) : actionResult.outcome === 'partial_success' ? (
                  <Heart className="w-20 h-20 text-yellow-400 mx-auto" />
                ) : actionResult.outcome === 'critical_failure' ? (
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: 3, duration: 0.3 }}>
                    <Skull className="w-20 h-20 text-red-500 mx-auto" />
                  </motion.div>
                ) : (
                  <Skull className="w-20 h-20 text-orange-400 mx-auto" />
                )}

                <h2 className={`text-4xl font-bold font-cyber mt-4 ${
                  actionResult.outcome === 'critical_success' ? 'text-neon-green' :
                  actionResult.outcome === 'success' ? 'text-green-400' :
                  actionResult.outcome === 'partial_success' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {actionResult.outcome === 'critical_success' ? '🏆 YOU SURVIVED!' :
                   actionResult.outcome === 'success' ? '✅ YOU MADE IT!' :
                   actionResult.outcome === 'partial_success' ? '⚡ BARELY SURVIVED' :
                   actionResult.outcome === 'failure' ? '💀 TAKING DAMAGE!' :
                   '☠️ CRITICAL FAILURE!'}
                </h2>

                <span className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-bold ${outcomeBadgeColor(actionResult.outcome)}`}>
                  {actionResult.outcome.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* AI narrative */}
              <div className="bg-black/30 rounded-2xl p-4 mb-4">
                <p className="text-white text-base leading-relaxed">{actionResult.reason}</p>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-center gap-6 mb-4">
                {actionResult.damage > 0 && (
                  <div className="flex items-center space-x-2 bg-red-500/20 px-4 py-2 rounded-xl">
                    <Heart className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-bold text-lg">−1 Attempt</span>
                  </div>
                )}
                {actionResult.scoreChange !== 0 && (
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${actionResult.scoreChange > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <Crown className="w-5 h-5 text-neon-purple" />
                    <span className={`font-bold text-lg ${actionResult.scoreChange > 0 ? 'text-neon-green' : 'text-red-400'}`}>
                      {actionResult.scoreChange > 0 ? '+' : ''}{actionResult.scoreChange} pts
                    </span>
                  </div>
                )}
              </div>

              {/* Next event */}
              {actionResult.nextEvent && !actionResult.gameOver && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-gray-300 text-sm italic">🔮 {actionResult.nextEvent}</p>
                </div>
              )}

              {/* Game over message */}
              {actionResult.gameOver && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="mt-4 text-center text-gray-400 text-sm"
                >
                  Redirecting to results in 5 seconds...
                </motion.div>
              )}

              {/* Tap to dismiss hint */}
              {!actionResult.gameOver && (
                <p className="text-center text-gray-500 text-xs mt-4">Tap anywhere to continue</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-3xl font-bold font-cyber bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent mb-1">
            PROMPT X — SURVIVE
          </h1>
          <p className="text-gray-400">{sessionAny?.scenario?.title || 'Desert Survival'}</p>
        </motion.div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Attempts — Hearts */}
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400 font-medium flex items-center">
                  <Heart className="w-4 h-4 text-red-400 mr-1" /> Attempts
                </p>
                <span className={`text-sm font-bold font-mono ${
                  isCriticalHealth ? 'text-red-400' : isLowHealth ? 'text-yellow-400' : 'text-white'
                }`}>
                  {displayHealth}/5
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from({ length: maxHealth }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={i < displayHealth
                      ? { scale: 1, opacity: 1 }
                      : { scale: [1, 1.4, 0], opacity: [1, 1, 0] }
                    }
                    transition={{ duration: 0.4, delay: i >= displayHealth ? (maxHealth - 1 - i) * 0.08 : 0 }}
                  >
                    <Heart
                      className={`w-7 h-7 ${
                        i < displayHealth
                          ? isCriticalHealth ? 'text-red-400 fill-red-400 animate-pulse'
                            : isLowHealth ? 'text-yellow-400 fill-yellow-400'
                            : 'text-red-500 fill-red-500'
                          : 'text-gray-700'
                      }`}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="w-full bg-dark-400 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCriticalHealth ? 'bg-red-500' : isLowHealth ? 'bg-yellow-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>
              {isCriticalHealth && (
                <p className="text-xs text-red-400 text-center mt-1 font-semibold animate-pulse">⚠️ LAST CHANCE!</p>
              )}
              {isLowHealth && !isCriticalHealth && (
                <p className="text-xs text-yellow-400 text-center mt-1 font-semibold">⚡ Running low!</p>
              )}
            </div>

            {/* Live Timer */}
            <GameTimer
              timeRemaining={currentSurvivalSession?.timeRemaining ?? 1800}
              totalTime={1800}
              onTimeUp={handleTimeUp}
            />

            {/* Location */}
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-600">
              <p className="text-sm text-gray-400 mb-1 flex items-center">
                <MapPin className="w-4 h-4 text-neon-green mr-1" /> Location
              </p>
              <p className="text-neon-green font-semibold">{currentSurvivalSession?.currentLocation ?? 'Desert Outpost'}</p>
            </div>

            {/* Inventory */}
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-600">
              <p className="text-sm text-gray-400 mb-3 flex items-center">
                <Package className="w-4 h-4 text-neon-blue mr-1" /> Inventory
              </p>
              <div className="space-y-1.5">
                {currentSurvivalSession?.inventory?.length ? (
                  currentSurvivalSession.inventory.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between bg-dark-300 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-white">{item.name}</span>
                      <span className="text-neon-blue font-semibold">×{item.quantity}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs">Empty</p>
                )}
              </div>
            </div>

            {/* Objectives */}
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-600">
              <p className="text-sm text-gray-400 mb-3 flex items-center">
                <Target className="w-4 h-4 text-neon-purple mr-1" /> Objectives
              </p>
              <div className="space-y-2">
                {currentSurvivalSession?.objectives?.map((obj: any, i: number) => {
                  const done = currentSurvivalSession?.completedObjectives?.includes(obj.id);
                  return (
                    <div key={i} className={`rounded-lg p-2 border text-xs ${done ? 'bg-green-500/20 border-green-500/30' : 'bg-dark-300 border-gray-700'}`}>
                      <span className={done ? 'text-green-400' : 'text-gray-300'}>{done ? '✅ ' : '🎯 '}{obj.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Score only */}
            <div className="bg-dark-200 rounded-xl p-3 border border-gray-600 text-center">
              <Crown className="w-5 h-5 text-neon-purple mx-auto mb-1" />
              <p className="text-xs text-gray-400">Score</p>
              <p className="text-lg font-bold text-white">{(currentSurvivalSession?.score ?? 0).toLocaleString()}</p>
            </div>
          </div>

          {/* ── Main Area ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Scenario + Instructions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-200 rounded-2xl border border-gray-600 overflow-hidden">
              <div className="bg-gradient-to-r from-neon-pink/20 to-neon-green/20 px-6 py-4 border-b border-gray-600 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  📍 {sessionAny?.scenario?.title || 'Desert Survival'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  sessionAny?.scenario?.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                  sessionAny?.scenario?.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {sessionAny?.scenario?.difficulty || 'medium'}
                </span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  {sessionAny?.scenario?.description || 'You are stranded. Survive and reach safety.'}
                </p>
                <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4">
                  <h3 className="text-neon-blue font-semibold mb-2 text-sm">💡 How to Play</h3>
                  <ul className="text-sm text-gray-300 space-y-1.5">
                    <li>→ <strong className="text-white">Describe your action</strong> in plain English — the more detail, the better the AI responds</li>
                    <li>→ <strong className="text-white">You have 5 attempts</strong> ❤️❤️❤️❤️❤️ — a bad decision costs one heart</li>
                    <li>→ <strong className="text-white">Use your inventory</strong>: {currentSurvivalSession?.inventory?.map((i: any) => i.name).join(', ') || 'water bottle, compass, knife'}</li>
                    <li>→ Complete <strong className="text-white">objectives</strong> for bonus points</li>
                    <li className="text-neon-green font-semibold">🏆 Survive with hearts to spare = maximum score!</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['I search for shade and ration my water', 'I follow the compass north towards the mountains', 'I dig in the sand to find underground water', 'I signal for help with my knife in the sunlight'].map(ex => (
                    <button key={ex} onClick={() => setCurrentAction(ex)}
                      className="text-xs bg-dark-400 hover:bg-neon-green/20 hover:text-neon-green text-gray-400 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-neon-green/40 transition-all">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Game History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-dark-200 rounded-2xl p-5 border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4">📜 Adventure Log</h3>
              <div ref={historyRef} className="h-72 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-gray-700">
                {survivalHistory?.length ? (
                  survivalHistory.map((event: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      {/* Player action */}
                      <div className="bg-dark-300 rounded-xl p-3 border border-gray-700">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded-full font-semibold">
                            TURN {event?.turn ?? idx + 1}
                          </span>
                          <span className="text-xs text-gray-500">YOU</span>
                        </div>
                        <p className="text-gray-200 text-sm">"{event?.playerAction}"</p>
                      </div>
                      {/* AI result */}
                      <div className={`rounded-xl p-3 border bg-gradient-to-r ${outcomeColor(event?.aiResponse?.outcome)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${outcomeBadgeColor(event?.aiResponse?.outcome)}`}>
                            {(event?.aiResponse?.outcome || 'unknown').replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            {(event?.aiResponse?.outcome === 'failure' || event?.aiResponse?.outcome === 'critical_failure') && (
                              <span className="text-red-400">💔 −1 attempt</span>
                            )}
                            {(event?.aiResponse?.scoreChange ?? 0) > 0 && (
                              <span className="text-neon-green">+{event.aiResponse.scoreChange} pts</span>
                            )}
                          </div>
                        </div>
                        <p className="text-white text-sm leading-relaxed">{event?.aiResponse?.reason}</p>
                        {event?.aiResponse?.nextEvent && (
                          <p className="text-gray-400 text-xs mt-1 italic">🔮 {event.aiResponse.nextEvent}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p className="text-lg mb-1">🌵</p>
                    <p>Your adventure hasn't started yet.</p>
                    <p className="text-sm mt-1">Type your first action below!</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Input */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-dark-200 rounded-2xl p-5 border border-gray-600">
              <h3 className="text-base font-semibold text-white mb-3">⚔️ What do you do?</h3>
              <form onSubmit={handleSubmitAction} className="space-y-3">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="Describe your survival action in detail..."
                      value={currentAction}
                      onChange={e => setCurrentAction(e.target.value)}
                      disabled={isLoading || gameComplete}
                      className="text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!currentAction.trim() || isLoading || gameComplete}
                    loading={isLoading}
                    size="lg"
                    variant="secondary"
                    className="px-6"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Be specific — the AI evaluates your action and decides if you survive or take damage.
                </p>
              </form>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SurvivalGame;
