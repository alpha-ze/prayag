import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Image, 
  Clock, 
  Target, 
  Star,
  Play,
  Trophy,
  Filter
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import Button from '@/components/ui/Button';

const ChallengeSelect: React.FC = () => {
  const { 
    promptelChallenges, 
    loadPromptelChallenges, 
    isLoading 
  } = useGameStore();

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadPromptelChallenges();
  }, [loadPromptelChallenges]);

  const difficulties = ['all', 'easy', 'medium', 'hard', 'expert'];
  const categories = ['all', 'Space', 'Nature', 'Technology', 'Fantasy', 'Comedy'];

  const filteredChallenges = promptelChallenges?.filter(challenge => {
    const difficultyMatch = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
    const categoryMatch = selectedCategory === 'all' || challenge.category === selectedCategory;
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
        className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading challenges...</p>
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
            <Image className="w-8 h-8 text-neon-blue" />
            <h1 className="text-4xl font-bold font-cyber bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              PROMPTLE CHALLENGES
            </h1>
          </div>
          <p className="text-gray-400">
            Choose your challenge and test your visual perception skills
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
            <Filter className="w-5 h-5 text-neon-blue" />
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
                        ? 'bg-neon-blue text-white'
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
                        ? 'bg-neon-purple text-white'
                        : 'bg-dark-300 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Challenge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-dark-200/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-gray-600/50 hover:border-neon-blue/50 transition-all duration-300 group"
            >
              {/* Challenge Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={challenge.imageUrl}
                  alt={challenge.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-400/80 to-transparent" />
                
                {/* Difficulty Badge */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty.toUpperCase()}
                </div>
              </div>

              {/* Challenge Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-neon-blue transition-colors">
                    {challenge.title}
                  </h3>
                  <div className="flex items-center space-x-1">
                    {getDifficultyStars(challenge.difficulty)}
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {challenge.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <Target className="w-4 h-4 text-neon-blue mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Guesses</p>
                    <p className="text-white font-semibold">{challenge.maxGuesses}</p>
                  </div>
                  
                  <div>
                    <Clock className="w-4 h-4 text-neon-green mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Time</p>
                    <p className="text-white font-semibold">{Math.floor(challenge.timeLimit / 60)}m</p>
                  </div>
                  
                  <div>
                    <Trophy className="w-4 h-4 text-neon-purple mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Category</p>
                    <p className="text-white font-semibold text-xs">{challenge.category}</p>
                  </div>
                </div>

                {/* Play Button */}
                <Link to={`/promptle/${challenge.id}`} className="block">
                  <Button className="w-full group-hover:shadow-lg group-hover:shadow-neon-blue/25">
                    <Play className="w-4 h-4 mr-2" />
                    Start Challenge
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredChallenges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Image className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Challenges Found</h3>
            <p className="text-gray-500">Try adjusting your filters to see more challenges.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChallengeSelect;