// @ts-nocheck — legacy file, not used in active game flow
import { supabase } from '@/database/supabase';
import { Challenge, ChallengeKeyword } from '@/types';
import { CreateChallengeInput } from '@/utils/validation';

export class ChallengeService {
  async createChallenge(challengeData: CreateChallengeInput): Promise<Challenge> {
    // Placeholder implementation - returns mock challenge
    const mockChallenge: Challenge = {
      id: '00000000-0000-0000-0000-000000000000',
      title: 'Cyberpunk City',
      description: 'Guess the AI prompt used to generate this futuristic cityscape image.',
      imageUrl: 'https://picsum.photos/400/400?random=3',
      generationPrompt: 'cyberpunk city, neon lights, futuristic, digital art, highly detailed',
      hint: 'Think about futuristic themes and artistic styles',
      difficulty: 'medium',
      category: 'digital art',
      maxGuesses: 8,
      timeLimit: 300,
      scoring: {
        baseScore: 100,
        correctBonus: 100,
        completionBonus: 200,
        timeBonus: 50,
        wrongPenalty: 10,
        hintPenalty: 25
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return mockChallenge;
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    // Return mock challenges for now
    const mockChallenges: Challenge[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Cyberpunk City',
        description: 'Guess the AI prompt used to generate this futuristic cityscape image.',
        imageUrl: 'https://picsum.photos/400/400?random=1',
        generationPrompt: 'cyberpunk city, neon lights, futuristic, digital art, highly detailed',
        hint: 'Think about futuristic themes and artistic styles',
        difficulty: 'medium',
        category: 'digital art',
        maxGuesses: 8,
        timeLimit: 300,
        scoring: {
          baseScore: 100,
          correctBonus: 100,
          completionBonus: 200,
          timeBonus: 50,
          wrongPenalty: 10,
          hintPenalty: 25
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        title: 'Fantasy Dragon',
        description: 'What prompt created this majestic dragon artwork?',
        imageUrl: 'https://picsum.photos/400/400?random=2',
        generationPrompt: 'fantasy dragon, epic, fire breathing, mountain landscape, fantasy art',
        hint: 'Consider mythical creatures and fantasy elements',
        difficulty: 'easy',
        category: 'fantasy',
        maxGuesses: 8,
        timeLimit: 300,
        scoring: {
          baseScore: 100,
          correctBonus: 100,
          completionBonus: 200,
          timeBonus: 50,
          wrongPenalty: 10,
          hintPenalty: 25
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    return mockChallenges;
  }
}