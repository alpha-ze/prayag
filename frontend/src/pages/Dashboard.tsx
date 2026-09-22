import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Image, Skull, Trophy, Clock, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { leaderboardAPI } from '@/services/api';
import { LeaderboardEntry } from '@/types';
import Button from '@/components/ui/Button';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    promptelChallenges,
    survivalScenarios,
    loadPromptelChallenges,
    loadSurvivalScenarios,
  } = useGameStore();

  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeGames: 0,
    completedChallenges: 0,
    averageScore: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Derive real stats from the leaderboard data
  const loadStats = async () => {
    try {
      const entries: LeaderboardEntry[] = await leaderboardAPI.getLeaderboard();
      const totalPlayers = entries.length;
      const activeGames = entries.filter((e) => e.status === 'active').length;
      const completedChallenges = entries.filter(
        (e) => ['survived', 'completed', 'dead', 'turn_limit'].includes(e.status as string)
      ).length;
      const averageScore =
        totalPlayers > 0
          ? Math.round(entries.reduce((sum, e) => sum + (e.totalScore ?? 0), 0) / totalPlayers)
          : 0;

      setStats({ totalPlayers, activeGames, completedChallenges, averageScore });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadPromptelChallenges();
    loadSurvivalScenarios();
    loadStats();

    // Re-derive stats whenever the leaderboard updates live
    const handleLiveUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail as LeaderboardEntry[];
      if (!Array.isArray(data) || data.length === 0) return;
      const totalPlayers = data.length;
      const activeGames = data.filter((e) => e.status === 'active').length;
      const completedChallenges = data.filter(
        (e) => e.status === 'survived' || e.status === 'completed' || e.status === 'dead' || e.status === 'turn_limit'
      ).length;
      const averageScore =
        totalPlayers > 0
          ? Math.round(data.reduce((sum, e) => sum + (e.totalScore ?? 0), 0) / totalPlayers)
          : 0;
      setStats({ totalPlayers, activeGames, completedChallenges, averageScore });
    };

    window.addEventListener('leaderboard_updated', handleLiveUpdate);
    return () => window.removeEventListener('leaderboard_updated', handleLiveUpdate);
  }, [loadPromptelChallenges, loadSurvivalScenarios]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200">
      {/* Background effects */}
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                PROMPT X
              </h1>
              <p className="text-gray-400 mt-1">
                Welcome back, <span className="text-neon-blue font-semibold">{user?.username}</span>
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-dark-200 rounded-lg px-4 py-2 border border-gray-600">
                <span className="text-sm text-gray-400">Status:</span>
                <span className="text-neon-green font-semibold ml-2">ONLINE</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {[
            { label: 'Total Players',  value: stats.totalPlayers,         icon: <Users   className="w-8 h-8 text-neon-blue"   /> },
            { label: 'Active Games',   value: stats.activeGames,          icon: <Zap     className="w-8 h-8 text-neon-green"  /> },
            { label: 'Completed',      value: stats.completedChallenges,  icon: <Trophy  className="w-8 h-8 text-neon-purple" /> },
            { label: 'Avg Score',      value: stats.averageScore,         icon: <Clock   className="w-8 h-8 text-neon-pink"   /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{label}</p>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-gray-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
                  )}
                </div>
                {icon}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Game Modes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Round 1 - Promptle */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-dark-200/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/50 relative overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-neon-purple/10" />
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl flex items-center justify-center">
                  <Image className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">ROUND 1</h2>
                  <p className="text-neon-blue font-semibold">PROMPTLE</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Analyze AI-generated images and guess the hidden keywords. 
                Test your visual perception and deduction skills.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Available Challenges:</span>
                  <span className="text-neon-blue font-semibold">{promptelChallenges?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Difficulty Range:</span>
                  <span className="text-white">Easy → Expert</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Max Time:</span>
                  <span className="text-white">5 minutes</span>
                </div>
              </div>

              <Link to="/promptle" className="block">
                <Button className="w-full" size="lg">
                  Start Promptle Challenge
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Round 2 - Survival */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-dark-200/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/50 relative overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/10 to-neon-green/10" />
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-neon-pink to-neon-green rounded-xl flex items-center justify-center">
                  <Skull className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">ROUND 2</h2>
                  <p className="text-neon-green font-semibold">PROMPT X SURVIVE</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Navigate dangerous scenarios using natural language actions. 
                Survive by making smart decisions and managing resources.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Available Scenarios:</span>
                  <span className="text-neon-green font-semibold">{survivalScenarios?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Survival Rate:</span>
                  <span className="text-white">34%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Max Turns:</span>
                  <span className="text-white">15-20</span>
                </div>
              </div>

              <Link to="/survival" className="block">
                <Button className="w-full" size="lg" variant="secondary">
                  Enter Survival Mode
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Link
            to="/leaderboard"
            className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 hover:border-neon-blue/50 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <Trophy className="w-8 h-8 text-neon-purple group-hover:text-neon-blue transition-colors" />
              <div>
                <h3 className="text-white font-semibold">Leaderboard</h3>
                <p className="text-gray-400 text-sm">Check your ranking</p>
              </div>
            </div>
          </Link>

          <Link
            to="/history"
            className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 hover:border-neon-purple/50 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <Clock className="w-8 h-8 text-neon-blue group-hover:text-neon-purple transition-colors" />
              <div>
                <h3 className="text-white font-semibold">Game History</h3>
                <p className="text-gray-400 text-sm">View past games</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-dark-200/80 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 hover:border-neon-green/50 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <Users className="w-8 h-8 text-neon-green group-hover:text-neon-blue transition-colors" />
              <div>
                <h3 className="text-white font-semibold">Profile</h3>
                <p className="text-gray-400 text-sm">Manage account</p>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;