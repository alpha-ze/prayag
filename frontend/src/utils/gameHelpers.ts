/**
 * Game utility functions
 */

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatScore = (score: number): string => {
  return score.toLocaleString();
};

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'hard':
      return 'text-orange-400';
    case 'expert':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

export const getDifficultyBadgeColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'hard':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'expert':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export const getHealthPercentage = (current: number, max: number): number => {
  return max > 0 ? (current / max) * 100 : 0;
};

export const getHealthColor = (percentage: number): string => {
  if (percentage <= 20) return 'text-red-400';
  if (percentage <= 40) return 'text-yellow-400';
  return 'text-green-400';
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'alive':
      return 'text-green-400 bg-green-500/20';
    case 'completed':
    case 'survived':
      return 'text-blue-400 bg-blue-500/20';
    case 'failed':
    case 'dead':
    case 'eliminated':
      return 'text-red-400 bg-red-500/20';
    case 'timeout':
    case 'turn_limit':
      return 'text-orange-400 bg-orange-500/20';
    default:
      return 'text-gray-400 bg-gray-500/20';
  }
};

export const calculateTimeBonus = (timeRemaining: number, totalTime: number): number => {
  const timeUsed = totalTime - timeRemaining;
  const timePercentage = timeUsed / totalTime;
  
  // Better time bonus for faster completion
  if (timePercentage <= 0.25) return 100; // Completed in 25% of time
  if (timePercentage <= 0.50) return 75;  // Completed in 50% of time
  if (timePercentage <= 0.75) return 50;  // Completed in 75% of time
  return 25; // Completed but used most of the time
};

export const getRandomEncouragementMessage = (isSuccess: boolean): string => {
  const successMessages = [
    "Excellent work!",
    "Outstanding!",
    "Brilliant deduction!",
    "Perfect execution!",
    "Impressive skills!",
    "Well done!",
    "Fantastic!",
    "Superb thinking!"
  ];

  const failureMessages = [
    "Don't give up!",
    "Try a different approach!",
    "You're getting closer!",
    "Think outside the box!",
    "Keep pushing forward!",
    "Learn from this!",
    "Stay focused!",
    "You've got this!"
  ];

  const messages = isSuccess ? successMessages : failureMessages;
  return messages[Math.floor(Math.random() * messages.length)];
};

export const validateGuess = (guess: string): { isValid: boolean; error?: string } => {
  const trimmedGuess = guess.trim();
  
  if (!trimmedGuess) {
    return { isValid: false, error: "Guess cannot be empty" };
  }
  
  if (trimmedGuess.length < 2) {
    return { isValid: false, error: "Guess must be at least 2 characters" };
  }
  
  if (trimmedGuess.length > 50) {
    return { isValid: false, error: "Guess is too long" };
  }
  
  // Check for valid characters (letters, numbers, spaces, hyphens)
  const validPattern = /^[a-zA-Z0-9\s\-]+$/;
  if (!validPattern.test(trimmedGuess)) {
    return { isValid: false, error: "Guess contains invalid characters" };
  }
  
  return { isValid: true };
};

export const validateAction = (action: string): { isValid: boolean; error?: string } => {
  const trimmedAction = action.trim();
  
  if (!trimmedAction) {
    return { isValid: false, error: "Action cannot be empty" };
  }
  
  if (trimmedAction.length < 5) {
    return { isValid: false, error: "Action must be more descriptive (at least 5 characters)" };
  }
  
  if (trimmedAction.length > 500) {
    return { isValid: false, error: "Action is too long (maximum 500 characters)" };
  }
  
  return { isValid: true };
};

export const getGameModeInfo = (mode: 'promptle' | 'survival') => {
  switch (mode) {
    case 'promptle':
      return {
        name: 'PROMPTLE',
        description: 'Guess hidden keywords from AI-generated images',
        icon: '🎯',
        color: 'neon-blue',
        gradient: 'from-neon-blue to-neon-purple'
      };
    case 'survival':
      return {
        name: 'SURVIVAL',
        description: 'Navigate dangerous scenarios using natural language',
        icon: '⚔️',
        color: 'neon-green',
        gradient: 'from-neon-pink to-neon-green'
      };
    default:
      return {
        name: 'UNKNOWN',
        description: 'Unknown game mode',
        icon: '❓',
        color: 'gray',
        gradient: 'from-gray-500 to-gray-600'
      };
  }
};