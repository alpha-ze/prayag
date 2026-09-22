/**
 * Round 2 — Binary Survival
 *
 * Each scenario = one action → SURVIVE (advance) or DIE (lose a life, next scenario).
 * 5 scenarios total. Score = scenarios cleared × 400 + speed bonus per scenario.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Send, Crown, Skull, Shield, Heart, Zap, ChevronRight, Sun, Leaf, Snowflake, Mountain, Flame } from 'lucide-react';
import {
  useGameStore,
  getSavedSurvivalSession,
  clearSurvivalSession,
} from '@/store/gameStore';
import { useCompetitionStore, SCENARIO_ID } from '@/store/competitionStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// ── Scenario metadata (mirrors backend ROUND2_SCENARIOS) ─────────────────────
const SCENARIOS = [
  { index: 0, title: 'Desert Heat',      Icon: Sun,       color: 'from-yellow-900/40 to-orange-900/30', border: 'border-yellow-600/40', accent: 'text-yellow-400',  iconColor: 'text-yellow-400'  },
  { index: 1, title: 'Jungle Predator',  Icon: Leaf,      color: 'from-green-900/40 to-emerald-900/30', border: 'border-green-600/40',  accent: 'text-green-400',   iconColor: 'text-green-400'   },
  { index: 2, title: 'Arctic Blizzard',  Icon: Snowflake, color: 'from-blue-900/40 to-cyan-900/30',     border: 'border-blue-500/40',   accent: 'text-blue-300',    iconColor: 'text-blue-300'    },
  { index: 3, title: 'Cave Collapse',    Icon: Mountain,  color: 'from-stone-900/40 to-gray-900/30',   border: 'border-stone-500/40',  accent: 'text-stone-300',   iconColor: 'text-stone-400'   },
  { index: 4, title: 'Burning Building', Icon: Flame,     color: 'from-red-900/40 to-rose-900/30',     border: 'border-red-600/40',    accent: 'text-red-400',     iconColor: 'text-red-400'     },
];

type ResultScreen = { survived: boolean; reason: string; nextEvent: string; speedBonus: number };

const Round2Game: React.FC = () => {
  const navigate = useNavigate();
  const { advancePhase, setRound2Score } = useCompetitionStore();

  const {
    currentSurvivalSession,
    startSurvivalScenario,
    restoreSurvivalSession,
    submitSurvivalAction,
    resetSurvivalSession,
    isLoading,
  } = useGameStore();

  const [action, setAction]             = useState('');
  const [isStarting, setIsStarting]     = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Which scenario index we're currently showing
  const [scenarioIndex, setScenarioIndex] = useState(0);
  // Lives remaining
  const [livesLeft, setLivesLeft]       = useState(5);
  // Result overlay state
  const [result, setResult]             = useState<ResultScreen | null>(null);
  // Transition overlay state (survived → next scenario)
  const [transitioning, setTransitioning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMeta = SCENARIOS[Math.min(scenarioIndex, SCENARIOS.length - 1)];

  // ── Start / restore ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentSurvivalSession) {
      // Sync local state from restored session
      setScenarioIndex((currentSurvivalSession as any).scenarioIndex ?? 0);
      setLivesLeft((currentSurvivalSession as any).attemptsRemaining ?? 5);
      return;
    }
    if (isLoading || isStarting) return;
    setIsStarting(true);

    const saved = getSavedSurvivalSession();
    const tryRestore = saved && saved.scenarioId === SCENARIO_ID;

    const init = tryRestore
      ? restoreSurvivalSession(saved.sessionId).then((ok) => {
          if (!ok) return startSurvivalScenario(SCENARIO_ID);
        })
      : startSurvivalScenario(SCENARIO_ID);

    init.catch(() => navigate('/game/final')).finally(() => setIsStarting(false));
  }, []);

  // Sync scenario index whenever session updates
  useEffect(() => {
    if (!currentSurvivalSession) return;
    const idx = (currentSurvivalSession as any).scenarioIndex ?? 0;
    const lives = (currentSurvivalSession as any).attemptsRemaining ?? 5;
    setScenarioIndex(idx);
    setLivesLeft(lives);
  }, [(currentSurvivalSession as any)?.scenarioIndex, (currentSurvivalSession as any)?.attemptsRemaining]);

  // ── Submit action ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = action.trim();
    if (!val || !currentSurvivalSession || isLoading || gameComplete) return;

    setAction('');

    try {
      const raw = await submitSurvivalAction(val);
      const res = raw as any;
      const survived: boolean = res.survived ?? false;
      const aiResp = res.event?.aiResponse ?? {};
      const speedBonus: number = res.speedBonus ?? 0;

      // Show the death / survival result overlay
      setResult({
        survived,
        reason: aiResp.reason || (survived ? 'You made it!' : 'You didn\'t make it.'),
        nextEvent: aiResp.nextEvent || '',
        speedBonus,
      });

      if (res.isGameOver) {
        // All 5 scenarios done (or 0 lives left)
        setGameComplete(true);
        setTimeout(() => {
          setResult(null);
          clearSurvivalSession();
          resetSurvivalSession();
          const finalScore = (currentSurvivalSession as any)?.score ?? 0;
          setRound2Score(finalScore);
          advancePhase('final');
          navigate('/game/final');
        }, 6000);
      } else if (survived) {
        // Show triumph briefly, then transition to next scenario
        setTimeout(() => {
          setResult(null);
          setTransitioning(true);
          setTimeout(() => setTransitioning(false), 2500);
        }, 4000);
      } else {
        // Died — show death screen, then auto-advance to next scenario
        setTimeout(() => {
          setResult(null);
          setTransitioning(true);
          setTimeout(() => setTransitioning(false), 2000);
        }, 5000);
      }
    } catch {/* ignore */}
  };

  const handleTimeUp = () => {
    clearSurvivalSession();
    const score = (currentSurvivalSession as any)?.score ?? 0;
    setRound2Score(score);
    advancePhase('final');
    navigate('/game/final');
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if ((isLoading || isStarting) && !currentSurvivalSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading Round 2…</p>
        </div>
      </div>
    );
  }

  const session = currentSurvivalSession as any;
  const score = session?.score ?? 0;
  const scenariosCleared = session?.scenariosCleared ?? 0;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentMeta.color} relative transition-all duration-700`}>
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      {/* ── Result Overlay ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.6, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className={`max-w-2xl w-full mx-4 rounded-3xl p-10 border-2 shadow-2xl ${
                result.survived
                  ? 'bg-gradient-to-br from-neon-green/20 to-green-900/30 border-neon-green/50'
                  : 'bg-gradient-to-br from-red-900/40 to-black border-red-600/60'
              }`}
            >
              {/* Icon */}
              <div className="text-center mb-6">
                {result.survived ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
                    transition={{ repeat: 2, duration: 0.5 }}
                  >
                    <Shield className="w-24 h-24 text-neon-green mx-auto" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: 4, duration: 0.3 }}
                  >
                    <Skull className="w-24 h-24 text-red-500 mx-auto" />
                  </motion.div>
                )}

                <h2 className={`text-5xl font-bold font-cyber mt-4 ${result.survived ? 'text-neon-green' : 'text-red-400'}`}>
                  {result.survived ? 'SURVIVED!' : 'YOU DIED'}
                </h2>

                <p className={`text-lg font-semibold mt-1 ${result.survived ? 'text-neon-green/70' : 'text-red-500/70'}`}>
                  <currentMeta.Icon className={`inline w-5 h-5 mr-1 ${currentMeta.iconColor}`} />
                  {currentMeta.title}
                  {result.survived && result.speedBonus > 0 && (
                    <span className="ml-3 text-yellow-400">+{result.speedBonus} speed bonus</span>
                  )}
                </p>
              </div>

              {/* AI narration */}
              <div className={`rounded-2xl p-5 mb-5 ${result.survived ? 'bg-black/20' : 'bg-black/50'}`}>
                <p className={`text-base leading-relaxed font-medium ${result.survived ? 'text-white' : 'text-gray-200'}`}>
                  {result.reason}
                </p>
              </div>

              {/* Next event / epitaph */}
              {result.nextEvent && (
                <p className={`text-sm italic text-center mt-2 ${result.survived ? 'text-neon-green/60' : 'text-red-400/60'}`}>
                  {result.nextEvent}
                </p>
              )}

              {/* Progress indicator */}
              {!gameComplete && (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-center text-gray-500 text-sm mt-5"
                >
                  {result.survived
                    ? scenarioIndex < 4 ? `Moving to Scenario ${scenarioIndex + 2}…` : 'All scenarios complete!'
                    : livesLeft > 1 ? `${livesLeft - 1} lives remaining — next scenario…` : 'Last life gone…'}
                </motion.p>
              )}
              {gameComplete && (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-center text-yellow-400 text-sm mt-5 font-semibold flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" /> Loading final leaderboard…
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scenario transition flash ─────────────────────────────────────────── */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              className="text-center"
            >
              {(() => { const S = SCENARIOS[Math.min(scenarioIndex, 4)]; return <S.Icon className={`w-20 h-20 mx-auto mb-4 ${S.iconColor}`} />; })()}
              <h3 className="text-3xl font-bold font-cyber text-white">
                Scenario {Math.min(scenarioIndex + 1, 5)} / 5
              </h3>
              <p className={`text-xl font-semibold mt-1 ${SCENARIOS[Math.min(scenarioIndex, 4)].accent}`}>
                {SCENARIOS[Math.min(scenarioIndex, 4)].title}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main UI ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-6 max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <p className="text-xs text-neon-green font-semibold tracking-widest uppercase mb-1">Round 2 — Survival</p>
          <h1 className="text-3xl font-bold font-cyber text-white mb-1 flex items-center justify-center gap-3">
            <currentMeta.Icon className={`w-7 h-7 ${currentMeta.iconColor}`} />
            {currentMeta.title}
          </h1>
          <p className={`text-sm font-semibold ${currentMeta.accent}`}>
            Scenario {scenarioIndex + 1} of {SCENARIOS.length}
          </p>
        </motion.div>

        {/* Progress bar — scenarios */}
        <div className="flex gap-2 mb-6 justify-center">
          {SCENARIOS.map((s, i) => (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-full transition-all duration-500 ${
                i < scenariosCleared
                  ? 'bg-neon-green'
                  : i === scenarioIndex
                  ? 'bg-white animate-pulse'
                  : 'bg-gray-700'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Lives (hearts) */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-xs text-gray-400 uppercase tracking-widest mr-1">Lives</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={i < livesLeft ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0.2 }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className={`w-7 h-7 ${
                  i < livesLeft
                    ? livesLeft === 1
                      ? 'text-red-400 fill-red-400 animate-pulse'
                      : 'text-red-500 fill-red-500'
                    : 'text-gray-700'
                }`}
              />
            </motion.div>
          ))}
          <span className="text-xs text-gray-400 ml-1">{livesLeft} / 5</span>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="bg-dark-200/60 rounded-xl px-5 py-2 border border-gray-600/40 text-center">
            <p className="text-xs text-gray-400">Scenarios Cleared</p>
            <p className="text-2xl font-bold text-neon-green">{scenariosCleared} / 5</p>
          </div>
          <div className="bg-dark-200/60 rounded-xl px-5 py-2 border border-gray-600/40 text-center">
            <Crown className="w-4 h-4 text-neon-purple mx-auto mb-0.5" />
            <p className="text-xs text-gray-400">Score</p>
            <p className="text-2xl font-bold text-white">{score.toLocaleString()}</p>
          </div>
        </div>

        {/* Scenario card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={scenarioIndex}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35 }}
            className={`bg-dark-200/70 backdrop-blur-xl rounded-2xl border ${currentMeta.border} p-6 mb-6`}
          >
            <div className="flex items-start gap-4 mb-4">
              <currentMeta.Icon className={`w-9 h-9 flex-shrink-0 mt-0.5 ${currentMeta.iconColor}`} />
              <div>
                <h2 className={`text-xl font-bold ${currentMeta.accent}`}>{currentMeta.title}</h2>
                <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                  {session?.scenario?.description || 'Survive this scenario.'}
                </p>
              </div>
            </div>

            <div className={`rounded-xl p-3 border ${currentMeta.border} bg-dark-300/40`}>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Win condition
              </p>
              <p className="text-sm text-white font-medium">
                {session?.scenario?.winCondition || 'Find a way out.'}
              </p>
            </div>

            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <p className="text-xs text-yellow-400 font-semibold">⚡ ONE SHOT — describe exactly what you do. Smart action = survive. Wrong move = death.</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                placeholder={`What do you do in the ${currentMeta.title.toLowerCase()}?`}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                disabled={isLoading || gameComplete || !!result}
                className="text-base flex-1"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!action.trim() || isLoading || gameComplete || !!result}
                loading={isLoading}
                size="lg"
                variant="secondary"
                className="px-6"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Be specific — one decisive action. Vague or impossible actions end in death.
            </p>
          </form>
        </motion.div>

        {/* Scenario roadmap (mini) */}
        <div className="mt-8 flex items-center justify-center gap-1">
          {SCENARIOS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex flex-col items-center ${i === scenarioIndex ? 'opacity-100' : 'opacity-40'}`}>
                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
                <span className="text-xs text-gray-500 mt-0.5">{s.title.split(' ')[0]}</span>
              </div>
              {i < SCENARIOS.length - 1 && (
                <ChevronRight className={`w-3 h-3 mx-1 ${i < scenarioIndex ? 'text-neon-green' : 'text-gray-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Round2Game;
