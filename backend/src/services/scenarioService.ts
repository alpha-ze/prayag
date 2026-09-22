import { supabase } from '@/database/supabase';
import { Scenario } from '@/types';
import { CreateScenarioInput } from '@/utils/validation';

export class ScenarioService {
  async createScenario(scenarioData: CreateScenarioInput): Promise<Scenario> {
    // Placeholder implementation - returns mock scenario
    const mockScenario: Scenario = {
      id: '00000000-0000-0000-0000-000000000000',
      title: 'Desert Survival',
      description: 'You are stranded in a vast desert with limited supplies.',
      environment: 'Desert',
      difficulty: 'medium',
      category: 'survival',
      startingLocation: 'Desert Outpost',
      startingHealth: 5,
      maxHealth: 5,
      startingInventory: ['water bottle', 'compass'],
      objectives: ['Find water source', 'Reach civilization'],
      maxTurns: 15,
      timeLimit: null,
      scoring: {
        baseScore: 100,
        successBonus: 50,
        survivalBonus: 300
      },
      rules: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return mockScenario;
  }

  async getActiveScenarios(): Promise<Scenario[]> {
    // Return mock scenarios for now
    const mockScenario: Scenario = {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Desert Survival',
      description: 'You are stranded in a vast desert with limited supplies. Find water and reach safety.',
      environment: 'Desert',
      difficulty: 'medium',
      category: 'survival',
      startingLocation: 'Desert Outpost',
      startingHealth: 5,
      maxHealth: 5,
      startingInventory: ['water bottle', 'compass', 'knife'],
      objectives: ['Find water source', 'Reach civilization', 'Survive 10 turns'],
      maxTurns: 15,
      timeLimit: 1800, // 30 minutes
      scoring: {
        baseScore: 100,
        successBonus: 50,
        objectiveBonus: 200,
        survivalBonus: 300,
        timeBonus: 50
      },
      rules: ['You lose 1 health per turn without water', 'Some actions may have consequences'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return [mockScenario];
  }
}