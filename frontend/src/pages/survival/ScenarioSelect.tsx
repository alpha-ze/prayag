import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Skull, 
  Clock, 
  Heart, 
  Star,
  Play,
  Scroll,
  Filter
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';

const ScenarioSelect: React.FC = () => {
  const { 
    survivalScenarios, 
    loadSurvivalScenarios, 
    isLoading 
  } = useGameStore();

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadSurvivalScenarios();
  }, [loadSurvivalScenarios]);

  const difficulties = ['all', 'easy', 'medium', 'hard', 'expert'];
  const categories = ['all', 'Urban Survival', 'Horror Survival', 'Survival Horror', 'Sci-Fi Horror', 'Comedy Survival'];

  const filteredScenarios = survivalScenarios?.filter(scenario => {
    const difficultyMatch = selectedDifficulty === 'all' || scenario.difficulty === selectedDifficulty;
    const categoryMatch = selectedCategory === 'all' || scenario.category === selectedCategory;
    return difficultyMatch && categoryMatch;
  }) || [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'hard': return 'text-orange-400 bg-orange-400/20';
      case 'expert': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    const stars = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4;
    return Array.from({ length: 4 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < stars ? 'text-red-400 fill-red-400' : 'text-gray-600'}`} 
      />
    ));
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('Horror')) return '👻';
    if (category.includes('Sci-Fi')) return '🚀';
    if (category.includes('Comedy')) return '😄';
    if (category.includes('Urban')) return '🏙️';
    return '⚔️';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 p-6">
      {/* Background effects */}
      <div className="absolute inset-0 bg-cyber-grid opacity-5" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Skull className="w-8 h-8 text-neon-green" />
            <h1 className="text-4xl font-bold font-cyber bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent">
              SURVIVAL SCENARIOS
            </h1>
          </div>
          <p className="text-gray-400">
            Choose your scenario and test your survival instincts
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-200/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-600/50 mb-8"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-5 h-5 text-neon-green" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {difficulties.map(difficulty => (
                  <button
                    key={difficulty}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedDifficulty === difficulty
                        ? 'bg-neon-green text-white'
                        : 'bg-dark-300 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-neon-pink text-white'
                        : 'bg-dark-300 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {category === 'all' ? 'All' : category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scenario Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredScenarios.map((scenario, index) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-dark-200/80 backdrop-blur-xl rounded-2xl border border-gray-600/50 hover:border-neon-green/50 transition-all duration-300 group overflow-hidden"
            >
              {/* Scenario Header */}
              <div className="relative p-6 bg-gradient-to-r from-neon-pink/10 to-neon-green/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getCategoryIcon(scenario.category)}</div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-neon-green transition-colors">
                        {scenario.title}
                      </h3>
                      <p className="text-sm text-neon-green">{scenario.category}</p>
                    </div>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${getDifficultyColor(scenario.difficulty)}`}>
                    {scenario.difficulty.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center space-x-1 mb-4">
                  {getDifficultyStars(scenario.difficulty)}
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              {/* Scenario Stats */}
              <div className="p-6 border-t border-gray-600/30">
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div>
                    <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Health</p>
                    <p className="text-white font-semibold">{scenario.maxTurns || 5}</p>
                  </div>
                  
                  <div>
                    <Scroll className="w-4 h-4 text-neon-blue mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Max Turns</p>
                    <p className="text-white font-semibold">{scenario.maxTurns}</p>
                  </div>
                  
                  <div>
                    <Clock className="w-4 h-4 text-neon-purple mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Time Limit</p>
                    <p className="text-white font-semibold">
                      {scenario.timeLimit ? `${Math.floor(scenario.timeLimit / 60)}m` : '∞'}
                    </p>
                  </div>
                </div>

                {/* Objectives Preview */}
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-2">Primary Objectives:</p>
                  <div className="space-y-1">
                    {scenario.objectives?.slice(0, 2).map((objective, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-neon-green rounded-full" />
                        <p className="text-xs text-gray-300">{objective.title}</p>
                      </div>
                    ))}
                    {(scenario.objectives?.length || 0) > 2 && (
                      <p className="text-xs text-gray-500">+{(scenario.objectives?.length || 0) - 2} more objectives</p>
                    )}
                  </div>
                </div>

                {/* Survival Rate (Mock Data) */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">Survival Rate</span>
                    <span className="text-red-400 font-semibold">
                      {scenario.difficulty === 'easy' ? '78%' : 
                       scenario.difficulty === 'medium' ? '45%' : 
                       scenario.difficulty === 'hard' ? '23%' : '8%'}
                    </span>
                  </div>
                  <div className="w-full bg-dark-400 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        scenario.difficulty === 'easy' ? 'bg-green-500' :
                        scenario.difficulty === 'medium' ? 'bg-yellow-500' :
                        scenario.difficulty === 'hard' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: scenario.difficulty === 'easy' ? '78%' : 
                               scenario.difficulty === 'medium' ? '45%' : 
                               scenario.difficulty === 'hard' ? '23%' : '8%'
                      }}
                    />
                  </div>
                </div>

                {/* Enter Button */}
                <Link to={`/survival/${scenario.id}`} className="block">
                  <Button 
                    variant="secondary" 
                    className="w-full group-hover:shadow-lg group-hover:shadow-neon-green/25"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Enter Scenario
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredScenarios.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Skull className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Scenarios Found</h3>
            <p className="text-gray-500">Try adjusting your filters to see more scenarios.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ScenarioSelect;