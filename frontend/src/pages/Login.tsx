import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Zap, User, Shield, Eye, EyeOff, Target, Swords, Trophy } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface PlayerForm  { username: string; }
interface AdminForm   { pin: string; }

const Login: React.FC = () => {
  const [isLoading, setIsLoading]       = useState(false);
  const [showAdmin, setShowAdmin]       = useState(false);
  const [showPin, setShowPin]           = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginByName, loginAdmin } = useAuthStore();

  const from = (location.state as any)?.from || '/game';

  // ── Player form ────────────────────────────────────────────────────────────
  const {
    register: regPlayer,
    handleSubmit: handlePlayer,
    formState: { errors: playerErrors },
    setError: setPlayerError,
  } = useForm<PlayerForm>();

  const onPlayerSubmit = async (data: PlayerForm) => {
    setIsLoading(true);
    try {
      await loginByName(data.username.trim());
      navigate(from, { replace: true });
    } catch (error) {
      setPlayerError('root', {
        message: error instanceof Error ? error.message : 'Login failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Admin form ─────────────────────────────────────────────────────────────
  const {
    register: regAdmin,
    handleSubmit: handleAdmin,
    formState: { errors: adminErrors },
    setError: setAdminError,
  } = useForm<AdminForm>();

  const onAdminSubmit = async (data: AdminForm) => {
    setIsLoading(true);
    try {
      await loginAdmin(data.pin.trim());
      navigate('/admin', { replace: true });
    } catch {
      setAdminError('root', { message: 'Incorrect PIN' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl mb-4"
          >
            <Zap className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            PROMPT X
          </h1>
          <p className="text-gray-400 mt-2">AI Competition Platform</p>
        </div>

        {/* Player card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-200/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/50 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neon-blue/10 rounded-full border border-neon-blue/30 mb-3">
              <User className="w-6 h-6 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-bold text-white">Enter Your Name</h2>
            <p className="text-gray-400 text-sm mt-1">No password needed — just your name to compete</p>
          </div>

          <form onSubmit={handlePlayer(onPlayerSubmit)} className="space-y-5">
            <Input
              label="Your Name"
              type="text"
              placeholder="e.g. Ahmed, Sara, Player1..."
              autoFocus
              autoComplete="off"
              error={playerErrors.username?.message}
              {...regPlayer('username', {
                required: 'Please enter your name',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 30, message: 'Name must be 30 characters or less' },
                pattern: {
                  value: /^[a-zA-Z0-9_ \-]+$/,
                  message: 'Letters, numbers, spaces, _ and - only',
                },
              })}
            />
            {playerErrors.root && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
              >
                <p className="text-red-400 text-sm text-center">{playerErrors.root.message}</p>
              </motion.div>
            )}
            <Button type="submit" loading={isLoading} disabled={isLoading} className="w-full" size="lg">
              {isLoading ? 'Joining...' : 'Enter the Arena'}
            </Button>
          </form>
        </motion.div>

        {/* Info strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 bg-dark-300/50 rounded-lg p-4 border border-gray-600/30 text-center"
        >
          <div className="text-xs text-gray-400 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-neon-blue flex-shrink-0" />
              <p><strong className="text-white">Round 1 — Promptle:</strong> Guess keywords from AI images</p>
            </div>
            <div className="flex items-center gap-2">
              <Swords className="w-3.5 h-3.5 text-neon-green flex-shrink-0" />
              <p><strong className="text-white">Round 2 — Survive:</strong> Navigate scenarios with AI, 5 attempts</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <p className="text-neon-green">Fewest attempts = highest score</p>
            </div>
          </div>
        </motion.div>

        {/* Admin toggle — small link at very bottom, low visibility */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAdmin((v) => !v)}
            className="text-xs text-gray-700 hover:text-gray-500 transition-colors select-none"
          >
            {showAdmin ? 'Cancel' : 'Admin?'}
          </button>
        </div>

        {/* Admin PIN form */}
        <AnimatePresence>
          {showAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 bg-dark-200/80 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20 shadow-xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-bold">Admin Login</h3>
              </div>

              <form onSubmit={handleAdmin(onAdminSubmit)} className="space-y-4">
                <div className="relative">
                  <Input
                    label="Admin PIN"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter admin PIN"
                    autoComplete="off"
                    error={adminErrors.pin?.message}
                    {...regAdmin('pin', { required: 'PIN is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {adminErrors.root && (
                  <p className="text-red-400 text-sm text-center">{adminErrors.root.message}</p>
                )}

                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading}
                  variant="danger"
                  className="w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Login as Admin
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;
