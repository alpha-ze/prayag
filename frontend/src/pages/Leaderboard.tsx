import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Target, Users, Trash2, RefreshCw, Zap } from 'lucide-react';
import { leaderboardAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { LeaderboardEntry } from '@/types';
import Button from '@/components/ui/Button';
import { shortId } from '@/utils/playerId';

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which userIds just got a score update so we can flash them
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';

  // Mark entries whose score changed since last render then flash them
  const applyUpdate = (newData: LeaderboardEntry[]) => {
    const prev = prevScoresRef.current;
    const changed = new Set<string>();
    newData.forEach((e) => {
      const old = prev.get(e.userId);
      if (old !== undefined && old !== e.totalScore) changed.add(e.userId);
      prev.set(e.userId, e.totalScore);
    });
    setLeaderboard(newData);
    if (changed.size > 0) {
      setUpdatedIds(changed);
      setTimeout(() => setUpdatedIds(new Set()), 1800);
    }
  };

  useEffect(() => {
    loadLeaderboard();

    const handleLiveUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (Array.isArray(data) && data.length > 0) {
        applyUpdate(data);
      } else {
        // Empty broadcast = reset event, re-fetch
        loadLeaderboard();
      }
    };

    window.addEventListener('leaderboard_updated', handleLiveUpdate);
    return () => window.removeEventListener('leaderboard_updated', handleLiveUpdate);
  }, []);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const data = await leaderboardAPI.getLeaderboard();
      // Initialise prev scores without triggering flash on first load
      data.forEach((e: LeaderboardEntry) => prevScoresRef.current.set(e.userId, e.totalScore));
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const removePlayer = async (playerId: string, username: string) => {
    if (!confirm(`Remove ${username} from the leaderboard?`)) return;
    try {
      await leaderboardAPI.removePlayer(playerId);
      await loadLeaderboard();
    } catch {
      setError('Failed to remove player');
    }
  };

  const clearLeaderboard = async () => {
    if (!confirm('Clear the entire leaderboard? This cannot be undone.')) return;
    try {
      await leaderboardAPI.clearLeaderboard();
      await loadLeaderboard();
    } catch {
      setError('Failed to clear leaderboard');
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-gray-400 font-bold w-6 text-center inline-block">{rank}</span>;
    }
  };

  const getRankGradient = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
      case 2: return 'from-gray-400/20 to-gray-500/10 border-gray-400/30';
      case 3: return 'from-amber-600/20 to-amber-700/10 border-amber-600/30';
      default: return 'from-dark-200/50 to-dark-300/50 border-gray-600/30';
    }
  };

  const getAvatarGradient = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-500 to-yellow-600';
      case 2: return 'from-gray-400 to-gray-500';
      case 3: return 'from-amber-600 to-amber-700';
      default: return 'from-neon-blue to-neon-purple';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 p-6">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-8 h-8 text-neon-purple" />
            <h1 className="text-4xl font-bold font-cyber bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
              LEADERBOARD
            </h1>
            <Trophy className="w-8 h-8 text-neon-purple" />
          </div>
          <p className="text-gray-400">Live scores — updated in real time</p>
          <div className="inline-flex items-center gap-2 mt-2 bg-neon-green/10 border border-neon-green/20 rounded-full px-4 py-1">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-neon-green text-xs font-semibold">LIVE</span>
          </div>
        </motion.div>

        {/* Admin Panel */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-6"
          >
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" /> Admin Controls
            </h2>
            <div className="flex flex-wrap gap-4">
              <Button onClick={loadLeaderboard} variant="secondary" size="sm" className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" /><span>Refresh</span>
              </Button>
              <Button onClick={clearLeaderboard} variant="danger" size="sm" className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4" /><span>Clear All</span>
              </Button>
            </div>
            <p className="text-red-300 text-sm mt-3">⚠️ Admin actions are permanent</p>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 text-center">
            <Users className="w-8 h-8 text-neon-blue mx-auto mb-3" />
            <p className="text-2xl font-bold text-white mb-1">{leaderboard.length}</p>
            <p className="text-gray-400 text-sm">Total Competitors</p>
          </div>
          <div className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 text-center">
            <Target className="w-8 h-8 text-neon-green mx-auto mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {leaderboard.filter((p) => p.status === 'active').length}
            </p>
            <p className="text-gray-400 text-sm">Active Players</p>
          </div>
          <div className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 text-center">
            <Crown className="w-8 h-8 text-neon-purple mx-auto mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {(leaderboard[0]?.totalScore ?? 0).toLocaleString()}
            </p>
            <p className="text-gray-400 text-sm">Highest Score</p>
          </div>
        </motion.div>

        {/* Error */}
        {error ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-dark-200/80 backdrop-blur-xl rounded-2xl border border-gray-600/50 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-600/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Rankings</h2>
              <span className="text-xs text-gray-500">
                {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="divide-y divide-gray-600/30">
              <AnimatePresence initial={false}>
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => {
                    const justUpdated = updatedIds.has(entry.userId);
                    return (
                      <motion.div
                        key={entry.userId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, layout: { duration: 0.4 } }}
                        className={`p-5 bg-gradient-to-r ${getRankGradient(entry.rank)} transition-all duration-300 ${
                          justUpdated ? 'ring-2 ring-neon-green/60 ring-inset' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-5">
                            {/* Rank */}
                            <div className="w-10 flex justify-center">
                              {getRankIcon(entry.rank)}
                            </div>

                            {/* Avatar + Name */}
                            <div className="flex items-center space-x-4">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-r ${getAvatarGradient(entry.rank)} text-white shadow`}>
                                {entry.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-semibold text-lg leading-tight">
                                  {entry.username}
                                  <span className="ml-2 text-xs font-mono text-gray-600 bg-dark-400 px-1.5 py-0.5 rounded">{shortId(entry.userId)}</span>
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    entry.status === 'active'    ? 'bg-green-500/20 text-green-400' :
                                    entry.status === 'completed' ? 'bg-blue-500/20  text-blue-400'  :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {entry.status.toUpperCase()}
                                  </span>
                                  {entry.lastActivity && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(entry.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Score + flash */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <motion.p
                                key={entry.totalScore}
                                initial={justUpdated ? { scale: 1.35, color: '#39ff14' } : false}
                                animate={{ scale: 1, color: '#ffffff' }}
                                transition={{ duration: 0.5 }}
                                className="text-2xl font-bold leading-none"
                              >
                                {entry.totalScore.toLocaleString()}
                              </motion.p>
                              <p className="text-xs text-gray-400 mt-0.5">points</p>
                            </div>

                            {justUpdated && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-1 bg-neon-green/20 border border-neon-green/40 px-2 py-1 rounded-lg"
                              >
                                <Zap className="w-3 h-3 text-neon-green" />
                                <span className="text-neon-green text-xs font-bold">+pts</span>
                              </motion.div>
                            )}

                            {isAdmin && entry.userId !== user?.id && (
                              <Button
                                onClick={() => removePlayer(entry.userId, entry.username)}
                                variant="danger"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No competitors yet</p>
                    <p className="text-gray-500 text-sm mt-1">Be the first to enter the arena!</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
