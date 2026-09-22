/**
 * Round 1 — Promptle wrapper
 *
 * Handles both images transparently:
 *   - phase === 'round1_img1' → starts Challenge 1 (Space Explorer)
 *   - phase === 'round1_img2' → starts Challenge 2 (Ocean Deep)
 *
 * On completion of each image the player is routed to the next phase.
 * The select screen is bypassed entirely.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send, CheckCircle, XCircle, Flame, Trophy, Target, Lightbulb, Star,
} from 'lucide-react';
import { useGameStore, getSavedPromptelSession, clearPromptelSession } from '@/store/gameStore';
import {
  useCompetitionStore, CHALLENGE_1_ID, CHALLENGE_2_ID, CompetitionPhase,
} from '@/store/competitionStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GameTimer from '@/components/game/GameTimer';

// ── challenge metadata ────────────────────────────────────────────────────────
const CHALLENGE_META: Record<string, { title: string; imageUrl: string; imageNum: number }> = {
  [CHALLENGE_1_ID]: {
    title: 'Image 1 — Space Explorer',
    imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1024&h=1024&fit=crop',
    imageNum: 1,
  },
  [CHALLENGE_2_ID]: {
    title: 'Image 2 — Ocean Deep',
    imageUrl: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1024&h=1024&fit=crop',
    imageNum: 2,
  },
};

const Round1Game: React.FC = () => {
  const navigate = useNavigate();
  const { phase, advancePhase, setRound1Score, round1Score } = useCompetitionStore();

  const challengeId = phase === 'round1_img1' ? CHALLENGE_1_ID : CHALLENGE_2_ID;
  const meta = CHALLENGE_META[challengeId];

  const {
    currentPromptelSession,
    promptelGuesses,
    startPromptelChallenge,
    restorePromptelSession,
    submitPromptelGuess,
    usePromptelHint,
    resetPromptelSession,
    isLoading,
    error,
  } = useGameStore();

  const [currentGuess, setCurrentGuess] = useState('');
  const [showHint, setShowHint] = useState('');
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [gameComplete, setGameComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: 'correct' | 'wrong' | 'so-close';
    message: string;
  } | null>(null);
  // brief "next image" transition overlay
  const [showTransition, setShowTransition] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── start / restore ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentPromptelSession) return;
    if (isLoading || isStarting) return;

    setIsStarting(true);

    const saved = getSavedPromptelSession();
    const tryRestore = saved && saved.challengeId === challengeId;

    const init = tryRestore
      ? restorePromptelSession(saved.sessionId).then((ok) => {
          if (!ok) return startPromptelChallenge(challengeId);
        })
      : startPromptelChallenge(challengeId);

    init.catch(() => navigate('/dashboard')).finally(() => setIsStarting(false));
  }, [challengeId]);

  // Re-initialise when the challenge changes (img1 → img2)
  useEffect(() => {
    setCurrentGuess('');
    setShowHint('');
    setGameComplete(false);
    setLastResult(null);
  }, [challengeId]);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const finishAndAdvance = (nextPhase: CompetitionPhase, score: number) => {
    clearPromptelSession();
    setRound1Score(round1Score + score);
    setGameComplete(true);

    if (nextPhase === 'round1_img2') {
      // Show a brief "Great! Next image…" overlay, then navigate
      setShowTransition(true);
      setTimeout(() => {
        resetPromptelSession();
        advancePhase('round1_img2');
        setShowTransition(false);
      }, 3000);
    } else {
      // All images done → go to qualifying screen
      setTimeout(() => {
        resetPromptelSession();
        advancePhase('qualifying');
        navigate('/game/qualify');
      }, 2500);
    }
  };

  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = currentGuess.trim();
    if (!val || !currentPromptelSession || isLoading) return;

    try {
      const result = await submitPromptelGuess(val);
      // Show what the system extracted from the sentence
      const extracted = (result as any).extractedToken;
      const display = extracted && extracted !== val ? `"${extracted}"` : '';

      setLastResult(
        result.isCorrect
          ? { type: 'correct', message: `Keyword found!${display ? ' — matched "' + display + '"' : ''}` }
          : result.isSoClose
          ? { type: 'so-close', message: `Very close!${display ? ' — tried "' + display + '"' : ''}` }
          : { type: 'wrong', message: 'No keyword found in that sentence' }
      );
      setCurrentGuess('');
      setTimeout(() => setLastResult(null), 2000);

      if (result.isGameComplete) {
        const finalScore = currentPromptelSession.score ?? 0;
        const nextPhase: CompetitionPhase =
          phase === 'round1_img1' ? 'round1_img2' : 'qualifying';
        finishAndAdvance(nextPhase, finalScore);
      }
    } catch {
      /* ignore */
    }
  };

  const handleUseHint = async () => {
    if (!currentPromptelSession) return;
    const hintsUsed = (currentPromptelSession as any).hintsUsed ?? 0;
    if (hintsUsed >= 3) return;
    try {
      const { hint, hintsRemaining: rem } = await usePromptelHint();
      setShowHint(hint);
      setHintsRemaining(rem);
    } catch {/* ignore */}
  };

  const handleTimeUp = () => {
    clearPromptelSession();
    const score = currentPromptelSession?.score ?? 0;
    const nextPhase: CompetitionPhase =
      phase === 'round1_img1' ? 'round1_img2' : 'qualifying';
    finishAndAdvance(nextPhase, score);
  };

  // ── loading ──────────────────────────────────────────────────────────────────
  if ((isLoading || isStarting) && !currentPromptelSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading {meta.title}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 relative">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      {/* ── "Next Image" transition overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center"
            >
              <Star className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <h2 className="text-4xl font-bold font-cyber text-neon-green mb-3">
                Image 1 Complete!
              </h2>
              <p className="text-gray-300 text-xl mb-2">Score: {currentPromptelSession?.score ?? 0} pts</p>
              <p className="text-gray-500 mt-4 animate-pulse">Loading Image 2…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <p className="text-xs text-neon-blue font-semibold tracking-widest uppercase mb-1">
            Round 1 — Promptle
          </p>
          <h1 className="text-3xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-1">
            {meta.title}
          </h1>
          {/* Progress pills */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-2 w-12 rounded-full transition-all ${
                  (phase === 'round1_img1' && n === 1) || (phase === 'round1_img2' && n <= 2)
                    ? 'bg-neon-blue'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </motion.div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main area ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <motion.div
              key={challengeId}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-dark-200 rounded-2xl p-5 border border-gray-600"
            >
              <img
                src={meta.imageUrl}
                alt="Challenge"
                className="w-full h-96 object-cover rounded-xl shadow-2xl"
              />
              <p className="text-center text-gray-400 text-sm mt-3">
                Find all 5 hidden keywords in this image
              </p>
            </motion.div>

            {/* Guess input */}
            <div className="bg-dark-200 rounded-2xl p-6 border border-gray-600">
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-neon-blue flex-shrink-0" />
                Write a sentence using a keyword — e.g. <span className="text-neon-blue italic">"I can see a bright star above me"</span>
              </p>
              <form onSubmit={handleSubmitGuess} className="space-y-3">
                <div className="flex space-x-3">
                  <Input
                    ref={inputRef}
                    placeholder="Type a sentence containing a keyword…"
                    value={currentGuess}
                    onChange={(e) => setCurrentGuess(e.target.value)}
                    disabled={isLoading || gameComplete}
                    className="text-lg flex-1"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!currentGuess.trim() || isLoading || gameComplete}
                    loading={isLoading}
                    size="lg"
                    className="px-7"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>

                <AnimatePresence>
                  {lastResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`text-center py-3 rounded-xl font-bold text-lg ${
                        lastResult.type === 'correct'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : lastResult.type === 'so-close'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {lastResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            <GameTimer
              timeRemaining={currentPromptelSession?.timeRemaining ?? 300}
              totalTime={300}
              onTimeUp={handleTimeUp}
            />

            {/* Keywords found */}
            <div className="bg-dark-200 rounded-xl p-5 border border-gray-600">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 text-neon-green mr-2" />
                Keywords Found
                <span className="ml-auto text-neon-blue font-bold">
                  {currentPromptelSession?.discoveredKeywords?.length ?? 0}/5
                </span>
              </h3>
              <div className="space-y-1.5">
                {(currentPromptelSession?.discoveredKeywords ?? []).length > 0 ? (
                  currentPromptelSession!.discoveredKeywords.map((kw: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-sm font-semibold">{kw}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No keywords found yet</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-200 rounded-xl p-3 border border-gray-600 text-center">
                <Target className="w-5 h-5 text-neon-blue mx-auto mb-1" />
                <p className="text-xs text-gray-400">Guesses</p>
                <p className="text-lg font-bold text-white">
                  {8 - (currentPromptelSession?.remainingGuesses ?? 8)}/8
                </p>
              </div>
              <div className="bg-dark-200 rounded-xl p-3 border border-gray-600 text-center">
                <Trophy className="w-5 h-5 text-neon-purple mx-auto mb-1" />
                <p className="text-xs text-gray-400">Score</p>
                <p className="text-lg font-bold text-white">
                  {(currentPromptelSession?.score ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Hint */}
            {hintsRemaining > 0 && (
              <Button
                onClick={handleUseHint}
                variant="secondary"
                className="w-full"
                disabled={isLoading || gameComplete}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Get Hint (−25 pts) · {hintsRemaining} left
              </Button>
            )}
            {hintsRemaining === 0 && (
              <p className="text-center text-gray-600 text-xs">No hints remaining</p>
            )}
            {showHint && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" /> Latest Clue
                </p>
                <p className="text-white text-sm">{showHint}</p>
              </div>
            )}

            {/* Recent guesses */}
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-600">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Guesses</h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {promptelGuesses.length > 0 ? (
                  [...promptelGuesses].reverse().slice(0, 6).map((g: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-start justify-between px-3 py-1.5 rounded-lg text-sm ${
                        g.isCorrect
                          ? 'bg-green-500/15 border border-green-500/25'
                          : g.isSoClose
                          ? 'bg-orange-500/15 border border-orange-500/25'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{g.guess}</p>
                        {g.extractedToken && g.extractedToken !== g.guess && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            matched: <span className="text-gray-400 font-mono">{g.extractedToken}</span>
                          </p>
                        )}
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {g.isCorrect ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : g.isSoClose ? (
                          <Flame className="w-3.5 h-3.5 text-orange-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs">No guesses yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Round1Game;
