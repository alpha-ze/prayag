import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Trophy, 
  User, 
  Settings, 
  LogOut,
  Zap,
  Shield
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200">
      {/* Navigation Bar */}
      <nav className="bg-dark-200/80 backdrop-blur-xl border-b border-gray-600/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                PROMPT X
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}

              {/* Admin link — only visible to admins */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    location.pathname === '/admin'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <Shield size={18} />
                  <span className="font-medium">Admin</span>
                </Link>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-neon-purple to-neon-pink rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="text-white font-medium">{user?.username}</p>
                  <p className={`text-xs ${user?.role === 'admin' ? 'text-red-400' : 'text-gray-400'}`}>
                    {user?.role}
                  </p>
                </div>
              </div>

              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
                <Settings size={18} />
              </button>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-600/50">
          <div className="flex items-center justify-around py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                    isActive ? 'text-neon-blue' : 'text-gray-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                  location.pathname === '/admin' ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                <Shield size={20} />
                <span className="text-xs font-medium">Admin</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-dark-300/50 border-t border-gray-600/30 py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <p>&copy; 2024 PROMPT X. AI Competition Platform.</p>
            <p>Made with ⚡ for the future of AI gaming</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;