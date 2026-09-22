import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lightbulb, 
  Send, 
  CheckCircle, 
  XCircle, 
  Flame,
  Trophy,
  Clock,
  Target,
  User
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getSavedPromptelSession, clearPromptelSession } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GameTimer from '@/components/game/GameTimer';

const PromptelGame: React.FC = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  
  const { user } = useAuthStore();
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

  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [showHint, setShowHint] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [timerStart] = useState<number>(() => currentPromptelSession?.timeRemaining ?? 300);
  const [lastResult, setLastResult] = useState<{
    type: 'correct' | 'wrong' | 'so-close';
    message: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sample challenge data (would come from API)
  const challengeData = {
    id: challengeId || '1',
    title: 'Space Explorer',
    description: 'Find the hidden space-themed keywords',
    imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1024&h=1024&fit=crop',
    difficulty: 'medium' as const,
    category: 'Space',
  };

  // No authentication check needed since we made the endpoint public
  useEffect(() => {
    if (!challengeId) return;
    // Already have a live session in the store — nothing to do
    if (currentPromptelSession) return;
    if (isLoading || isStarting) return;

    setIsStarting(true);

    // Check if there's a saved session for this challenge
    const saved = getSavedPromptelSession();
    const tryRestore = saved && saved.challengeId === challengeId;

    const init = tryRestore
      ? restorePromptelSession(saved.sessionId).then((ok) => {
          if (!ok) {
            // Saved session expired or ended — start a fresh one
            return startPromptelChallenge(challengeId);
          }
        })
      : startPromptelChallenge(challengeId);

    init
      .catch(() => navigate('/promptle'))
      .finally(() => setIsStarting(false));
  }, [challengeId]);

  // Clear saved session only when the game actually ends, not on every unmount
  const handleGameOver = (navigateTo: string, state?: any) => {
    clearPromptelSession();
    setGameComplete(true);
    setTimeout(() => navigate(navigateTo, state ? { state } : undefined), 3000);
  };

  useEffect(() => {
    // Focus input when component mounts or after guess
    if (inputRef.current && !gameComplete) {
      inputRef.current.focus();
    }
  }, [lastResult, gameComplete]);

  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const guessValue = String(currentGuess || '');
    
    if (!guessValue.trim() || !currentPromptelSession || isLoading) {
      return;
    }

    try {
      const result = await submitPromptelGuess(guessValue.trim());
      
      // Show result animation
      if (result.isCorrect) {
        setLastResult({ type: 'correct', message: '✓ KEYWORD DISCOVERED!' });
      } else if (result.isSoClose) {
        setLastResult({ type: 'so-close', message: '🔥 SO CLOSE!' });
      } else {
        setLastResult({ type: 'wrong', message: 'Not quite right...' });
      }

      // Check if game is complete
      if (result.isGameComplete) {
        handleGameOver('/promptle/results', { session: currentPromptelSession, completed: true });
      }

      // Clear input
      setCurrentGuess('');

      // Clear result after 2 seconds
      setTimeout(() => setLastResult(null), 2000);
      
    } catch (error) {
      console.error('Failed to submit guess:', error);
    }
  };

  const handleUseHint = async () => {
    if (!currentPromptelSession || currentPromptelSession?.hintUsed) {
      return;
    }

    try {
      const hint = await usePromptelHint();
      setShowHint(hint);
    } catch (error) {
      console.error('Failed to use hint:', error);
    }
  };

  const handleTimeUp = () => {
    handleGameOver('/promptle/results', { session: currentPromptelSession, completed: false, reason: 'timeout' });
  };

  // Don't render anything if still loading or starting the initial session
  if ((isLoading || isStarting) && !currentPromptelSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (!currentPromptelSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading challenge...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400">Failed to load challenge</p>
              <p className="text-red-400 text-sm mt-1">{error}</p>
              <Button 
                onClick={() => navigate('/promptle')} 
                className="mt-2"
                size="sm"
              >
                Back to Challenges
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200">
      {/* Background effects */}
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-2">
            PROMPT X
          </h1>
          <p className="text-xl font-semibold text-white mb-1">ROUND 1 — PROMPTLE</p>
          <p className="text-gray-400">{challengeData.title}</p>
        </motion.div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-2">
            {/* Challenge Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-200 rounded-2xl p-6 border border-gray-600 mb-6"
            >
              <img
                src={challengeData.imageUrl}
                alt="Challenge"
                className="w-full h-96 object-cover rounded-xl shadow-2xl"
              />
              
              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">Find the hidden keywords in this image</p>
              </div>
            </motion.div>

            {/* Guess Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-dark-200 rounded-2xl p-6 border border-gray-600"
            >
              <form onSubmit={handleSubmitGuess} className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="Enter your guess..."
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      disabled={isLoading || gameComplete}
                      className="text-lg"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={!currentGuess || !String(currentGuess).trim() || isLoading || gameComplete}
                    loading={isLoading}
                    className="px-8"
                    size="lg"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>

                {/* Result Animation */}
                <AnimatePresence>
                  {lastResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      className={`text-center py-4 px-6 rounded-xl font-bold text-lg ${
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
            </motion.div>
          </div>

          {/* Game Stats Sidebar */}
          <div className="space-y-6">
            {/* Timer */}
            <GameTimer
              timeRemaining={currentPromptelSession?.timeRemaining ?? 300}
              totalTime={300}
              onTimeUp={handleTimeUp}
            />

            {/* Keywords Found */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-200 rounded-xl p-6 border border-gray-600"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-neon-green mr-2" />
                Keywords Found
              </h3>
              
              <div className="space-y-2">
                {currentPromptelSession?.discoveredKeywords && Array.isArray(currentPromptelSession.discoveredKeywords) && currentPromptelSession.discoveredKeywords.length > 0 ? (
                  currentPromptelSession.discoveredKeywords.map((keyword, index) => (
                    <motion.div
                      key={`keyword-${keyword}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-2 bg-green-500/20 rounded-lg p-3"
                    >
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-semibold">{keyword}</span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No keywords discovered yet</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-sm text-gray-400">
                  Remaining: <span className="text-neon-blue font-semibold">3</span>
                </p>
              </div>
            </motion.div>

            {/* Game Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
                <Target className="w-6 h-6 text-neon-blue mx-auto mb-2" />
                <p className="text-sm text-gray-400">Guesses</p>
                <p className="text-xl font-bold text-white">
                  {8 - (currentPromptelSession?.remainingGuesses ?? 8)} / 8
                </p>
              </div>

              <div className="bg-dark-200 rounded-xl p-4 border border-gray-600 text-center">
                <Trophy className="w-6 h-6 text-neon-purple mx-auto mb-2" />
                <p className="text-sm text-gray-400">Score</p>
                <p className="text-xl font-bold text-white">
                  {(currentPromptelSession?.score ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Hint Button */}
            {!currentPromptelSession?.hintUsed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={handleUseHint}
                  variant="secondary"
                  className="w-full"
                  disabled={isLoading}
                >
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Use Hint (-25 points)
                </Button>
              </motion.div>
            )}

            {/* Show Hint */}
            {showHint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">Hint</span>
                </div>
                <p className="text-white font-mono text-lg">{showHint}</p>
              </motion.div>
            )}

            {/* Recent Guesses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-dark-200 rounded-xl p-6 border border-gray-600"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Recent Guesses</h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {promptelGuesses && Array.isArray(promptelGuesses) && promptelGuesses.length > 0 ? (
                  promptelGuesses.slice(-5).reverse().map((guess, index) => (
                  <div
                    key={`guess-${index}-${guess.guess}-${guess.isCorrect}`}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      guess.isCorrect
                        ? 'bg-green-500/20 border border-green-500/30'
                        : guess.isSoClose
                          ? 'bg-orange-500/20 border border-orange-500/30'
                          : 'bg-red-500/20 border border-red-500/30'
                    }`}
                  >
                    <span className="text-white">{guess.guess}</span>
                    {guess.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : guess.isSoClose ? (
                      <Flame className="w-4 h-4 text-orange-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No guesses yet
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptelGame;