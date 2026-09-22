import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Name-only login — no email or password required
export const loginByNameSchema = z.object({
  username: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be 30 characters or less')
    .regex(/^[a-zA-Z0-9_ \-]+$/, 'Name can only contain letters, numbers, spaces, underscores, and hyphens')
    .transform((v) => v.trim()),
});

// Promptle schemas
export const promptleGuessSchema = z.object({
  guess: z.string().min(1, 'Guess cannot be empty').max(100, 'Guess too long'),
});

export const promptleStartSchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
});

// Survival schemas
export const survivalActionSchema = z.object({
  action: z.string().min(1, 'Action cannot be empty').max(500, 'Action too long'),
});

export const survivalStartSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
});

// Admin schemas
export const createChallengeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL'),
  generationPrompt: z.string().min(1, 'Generation prompt is required'),
  keywords: z.array(z.object({
    keyword: z.string().min(1, 'Keyword cannot be empty'),
    aliases: z.array(z.string()).default([]),
    isRequired: z.boolean().default(true),
    points: z.number().min(0, 'Points cannot be negative').default(100),
  })).min(1, 'At least one keyword is required'),
  hint: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).default('medium'),
  category: z.string().min(1, 'Category is required'),
  maxGuesses: z.number().min(1, 'Must allow at least 1 guess').max(20, 'Too many guesses').default(8),
  timeLimit: z.number().min(30, 'Time limit too short').max(1800, 'Time limit too long').default(300),
  scoring: z.object({
    baseScore: z.number().min(0).default(100),
    correctBonus: z.number().min(0).default(100),
    completionBonus: z.number().min(0).default(200),
    timeBonus: z.number().min(0).default(50),
    wrongPenalty: z.number().min(0).default(10),
    hintPenalty: z.number().min(0).default(25),
  }).default({}),
});

export const createScenarioSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  environment: z.string().min(1, 'Environment is required'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).default('medium'),
  category: z.string().min(1, 'Category is required'),
  startingLocation: z.string().min(1, 'Starting location is required'),
  startingHealth: z.number().min(1, 'Starting health must be at least 1').max(20, 'Starting health too high').default(5),
  maxHealth: z.number().min(1, 'Max health must be at least 1').max(20, 'Max health too high').default(5),
  startingInventory: z.array(z.object({
    name: z.string().min(1, 'Item name is required'),
    quantity: z.number().min(0, 'Quantity cannot be negative').default(1),
    condition: z.number().min(0).max(100).optional(),
    properties: z.record(z.any()).optional(),
  })).default([]),
  objectives: z.array(z.object({
    id: z.string().min(1, 'Objective ID is required'),
    title: z.string().min(1, 'Objective title is required'),
    description: z.string().min(1, 'Objective description is required'),
    isRequired: z.boolean().default(true),
    points: z.number().min(0, 'Points cannot be negative').default(200),
  })).min(1, 'At least one objective is required'),
  maxTurns: z.number().min(5, 'Must allow at least 5 turns').max(50, 'Too many turns').default(15),
  timeLimit: z.number().min(60).max(3600).optional(), // 1 minute to 1 hour
  scoring: z.object({
    baseScore: z.number().min(0).default(100),
    successBonus: z.number().min(0).default(50),
    partialSuccessBonus: z.number().min(0).default(25),
    failurePenalty: z.number().min(0).default(20),
    objectiveBonus: z.number().min(0).default(200),
    survivalBonus: z.number().min(0).default(300),
    timeBonus: z.number().min(0).default(50),
  }).default({}),
  rules: z.array(z.object({
    id: z.string().min(1, 'Rule ID is required'),
    type: z.string().min(1, 'Rule type is required'),
    description: z.string().min(1, 'Rule description is required'),
    parameters: z.record(z.any()).default({}),
  })).default([]),
});

export const createRoundSchema = z.object({
  name: z.string().min(1, 'Round name is required').max(255, 'Round name too long'),
  type: z.enum(['promptle', 'survival']),
  maxParticipants: z.number().min(1, 'Must allow at least 1 participant').max(1000, 'Too many participants').default(50),
  settings: z.object({
    timeLimit: z.number().min(60).max(7200).optional(), // 1 minute to 2 hours
    maxChallenges: z.number().min(1).max(100).optional(),
    scoringMultiplier: z.number().min(0.1).max(10).default(1),
  }).default({}),
});

// AI Response validation schemas
export const aiSurvivalResponseSchema = z.object({
  outcome: z.enum(['success', 'partial_success', 'failure', 'critical_success', 'critical_failure']),
  damage: z.coerce.number().min(0).max(10).default(0),
  scoreChange: z.coerce.number().min(-100).max(200).default(0),
  reason: z.string().min(1).max(1000).default('Your action had consequences.'),
  stateChanges: z.record(z.any()).default({}),
  resourceChanges: z.array(z.object({
    resource: z.string(),
    change: z.coerce.number(),
  })).default([]),
  objectiveProgress: z.record(
    z.union([z.coerce.number().min(0).max(100), z.nan()])
      .transform(v => (isNaN(v as number) ? 0 : v as number))
  ).default({}),
  nextEvent: z.string().min(1).max(1000).default('Continue your journey.'),
  continueGame: z.boolean().default(true),
});

// Utility function to validate UUID
export const validateUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Utility function to sanitize user input
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '');
};

// Rate limiting helpers
export const createRateLimitKey = (userId: string, action: string): string => {
  return `rate_limit:${userId}:${action}`;
};

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginByNameInput = z.infer<typeof loginByNameSchema>;
export type PromptelGuessInput = z.infer<typeof promptleGuessSchema>;
export type PromptelStartInput = z.infer<typeof promptleStartSchema>;
export type SurvivalActionInput = z.infer<typeof survivalActionSchema>;
export type SurvivalStartInput = z.infer<typeof survivalStartSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type AISurvivalResponse = z.infer<typeof aiSurvivalResponseSchema>;