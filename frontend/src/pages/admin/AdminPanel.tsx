import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Play, Pause, StopCircle, Trash2,
  RefreshCw, Activity, Crown, Zap, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { leaderboardAPI, adminAPI } from '@/services/api';
import Button from '@/components/ui/Button';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  roundScores?: { promptle?: number; survival?: number };
  status: string;
}

interface ActivityItem {
  id: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roundStatus, setRoundStatus] = useState<'inactive' | 'active' | 'paused'>('inactive');
  const [roundType, setRoundType] = useState<'promptle' | 'survival'>('promptle');
  const [aiQueueStatus, setAiQueueStatus] = useState({ active: 0, queued: 0, processed: 0, capacity: 3 });
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: '1', message: 'Admin panel loaded', time: new Date().toLocaleTimeString(), type: 'info' },
    { id: '2', message: 'Waiting for live events...', time: new Date().toLocaleTimeString(), type: 'info' },
  ]);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const addActivity = useCallback((message: string, type: ActivityItem['type'] = 'info') => {
    setActivity(prev => [
      { id: Date.now().toString(), message, time: new Date().toLocaleTimeString(), type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await leaderboardAPI.getLeaderboard();
      setLeaderboard(data as any);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleStartRound = async () => {
    try {
      await adminAPI.startRound(roundType);
      setRoundStatus('active');
      addActivity(`Round started: ${roundType.toUpperCase()}`, 'success');
    } catch (err) {
      addActivity('Failed to start round', 'warning');
    }
  };

  const handlePauseRound = async () => {
    try {
      await adminAPI.pauseRound();
      setRoundStatus(roundStatus === 'paused' ? 'active' : 'paused');
      addActivity(roundStatus === 'paused' ? 'Round resumed' : 'Round paused', 'info');
    } catch (err) {
      addActivity('Failed to pause/resume round', 'warning');
    }
  };

  const handleEndRound = async () => {
    if (!confirm('End the current round? This cannot be undone.')) return;
    try {
      await adminAPI.endRound();
      setRoundStatus('inactive');
      addActivity('Round ended', 'warning');
      await loadLeaderboard();
    } catch (err) {
      addActivity('Failed to end round', 'warning');
    }
  };

  const handleRemovePlayer = async (userId: string, username: string) => {
    if (!confirm(`Remove ${username} from the leaderboard?`)) return;
    try {
      await leaderboardAPI.removePlayer(userId);
      addActivity(`Removed player: ${username}`, 'warning');
      await loadLeaderboard();
    } catch (err) {
      addActivity(`Failed to remove ${username}`, 'warning');
    }
  };

  const handleClearLeaderboard = async () => {
    if (!confirm('Clear the ENTIRE leaderboard? This cannot be undone.')) return;
    try {
      await leaderboardAPI.clearLeaderboard();
      addActivity('Leaderboard cleared', 'warning');
      setLeaderboard([]);
    } catch (err) {
      addActivity('Failed to clear leaderboard', 'warning');
    }
  };

  const statusColors = {
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  const activityColors = {
    info: 'text-neon-blue',
    success: 'text-neon-green',
    warning: 'text-yellow-400',
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 p-6">
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/30">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-cyber text-white">ADMIN PANEL</h1>
              <p className="text-gray-400 text-sm">Competition Management Dashboard</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Round Management + Activity */}
          <div className="lg:col-span-1 space-y-6">
            {/* Round Management */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-200 rounded-2xl p-6 border border-gray-600"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 text-neon-blue mr-2" />
                Round Management
              </h2>

              {/* Status */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border mb-4 ${statusColors[roundStatus]}`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${roundStatus === 'active' ? 'bg-green-400 animate-pulse' : roundStatus === 'paused' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                {roundStatus.toUpperCase()}
              </div>

              {/* Round Type */}
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Round Type</p>
                <div className="flex gap-2">
                  {(['promptle', 'survival'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setRoundType(type)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        roundType === type
                          ? 'bg-neon-blue text-white'
                          : 'bg-dark-300 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-2">
                <Button
                  onClick={handleStartRound}
                  variant="success"
                  size="sm"
                  className="w-full"
                  disabled={roundStatus === 'active'}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Round
                </Button>
                <Button
                  onClick={handlePauseRound}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={roundStatus === 'inactive'}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  {roundStatus === 'paused' ? 'Resume Round' : 'Pause Round'}
                </Button>
                <Button
                  onClick={handleEndRound}
                  variant="danger"
                  size="sm"
                  className="w-full"
                  disabled={roundStatus === 'inactive'}
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Round
                </Button>
              </div>
            </motion.div>

            {/* Live Activity Feed */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-200 rounded-2xl p-6 border border-gray-600"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 text-neon-green mr-2" />
                Live Activity
              </h2>

              <div className="h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-600">
                {activity.map(item => (
                  <div key={item.id} className="flex items-start space-x-2 text-xs">
                    <span className="text-gray-500 whitespace-nowrap mt-0.5">{item.time}</span>
                    <span className={activityColors[item.type]}>{item.message}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Player Management */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-200 rounded-2xl border border-gray-600 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-600 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center">
                  <Users className="w-5 h-5 text-neon-purple mr-2" />
                  Player Management ({leaderboard.length})
                </h2>
                <div className="flex gap-2">
                  <Button onClick={loadLeaderboard} variant="secondary" size="sm" loading={isLoading}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleClearLeaderboard} variant="danger" size="sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-xs text-gray-400 font-semibold uppercase">Rank</th>
                      <th className="text-left p-4 text-xs text-gray-400 font-semibold uppercase">Player</th>
                      <th className="text-right p-4 text-xs text-gray-400 font-semibold uppercase">Promptle</th>
                      <th className="text-right p-4 text-xs text-gray-400 font-semibold uppercase">Survival</th>
                      <th className="text-right p-4 text-xs text-gray-400 font-semibold uppercase">Total</th>
                      <th className="text-center p-4 text-xs text-gray-400 font-semibold uppercase">Status</th>
                      <th className="text-center p-4 text-xs text-gray-400 font-semibold uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((entry: any, i) => (
                        <tr key={entry.userId} className="hover:bg-dark-300/50 transition-colors">
                          <td className="p-4">
                            {i === 0 ? <Crown className="w-5 h-5 text-yellow-400" />
                              : <span className="text-gray-400 font-bold">#{i + 1}</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {entry.username?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-white font-medium">{entry.username}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right text-neon-blue font-semibold">
                            {entry.roundScores?.promptle ?? 0}
                          </td>
                          <td className="p-4 text-right text-neon-green font-semibold">
                            {entry.roundScores?.survival ?? 0}
                          </td>
                          <td className="p-4 text-right text-white font-bold text-lg">
                            {(entry.totalScore ?? 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              entry.status === 'active' ? 'bg-green-500/20 text-green-400'
                                : entry.status === 'completed' ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {(entry.status ?? 'active').toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {entry.userId !== user?.id && (
                              <button
                                onClick={() => handleRemovePlayer(entry.userId, entry.username)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove player"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-gray-400">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No players yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
