import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { AISurvivalResponse, aiSurvivalResponseSchema } from '@/utils/validation';
import { SurvivalGameSession, Scenario, SurvivalEvent } from '@/types';
import { aiQueue, getNextGroqKey, getGroqKeyCount } from '@/utils/aiQueue';

let openaiInstance: OpenAI | null = null;

// Use Groq if GROQ_API_KEY is set (free), otherwise fall back to OpenAI
function getAIClient(): { client: any; model: string; provider: 'groq' | 'openai' } {
  // Check if Groq keys exist WITHOUT consuming/rotating the key index
  const groqKeyCount = getGroqKeyCount();

  // Debug: log what env vars are set
  console.log(`🔧 ENV check — GROQ_API_KEYS: ${process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`🔧 ENV check — GROQ_API_KEY: ${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`🔧 Key count: ${groqKeyCount}`);

  if (groqKeyCount > 0) {
    const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    console.log(`🔑 AI provider: groq / model: ${groqModel}    (${groqKeyCount} key(s))`);
    return { client: null, model: groqModel, provider: 'groq' };
  }

  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  console.log(`🔑 AI provider: openai / key: ${openaiKey ? 'SET' : 'NOT SET'}`);

  if (openaiKey) {
    if (!openaiInstance) openaiInstance = new OpenAI({ apiKey: openaiKey });
    const model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    return { client: openaiInstance, model, provider: 'openai' };
  }

  throw new Error('No AI API key configured. Set GROQ_API_KEY (free) or OPENAI_API_KEY in .env');
}

export class AIService {
  private readonly maxRetries = 2;
  private readonly timeout = 40000; // 40 seconds for llama-3.3-70b

  async generateImage(prompt: string): Promise<string> {
    try {
      const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
      if (!openaiKey) throw new Error('No OpenAI API key configured');
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });

      return response.data[0].url || '';
    } catch (error) {
      console.error('Image generation failed:', error);
      throw new Error('Failed to generate image');
    }
  }

  async evaluateSurvivalAction(
    session: SurvivalGameSession,
    scenario: Scenario,
    playerAction: string,
    history: SurvivalEvent[]
  ): Promise<AISurvivalResponse> {
    const systemPrompt = this.buildSurvivalSystemPrompt(scenario, session);
    const userPrompt = this.buildSurvivalUserPrompt(session, playerAction, history);

    // Wrap the call in the queue to manage concurrent requests for 40 students
    return aiQueue.enqueue(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`AI evaluation attempt ${attempt}/${this.maxRetries} (queue: ${JSON.stringify(aiQueue.getStatus())})`);

          const response = await Promise.race([
            this.callOpenAI(systemPrompt, userPrompt),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI request timeout')), this.timeout)
            )
          ]) as any;

          const content = response.choices[0]?.message?.content;
          if (!content) throw new Error('No response content from AI');

          const parsedResponse = this.parseAIResponse(content);
          const validatedResponse = this.sanitizeAIResponse(parsedResponse);
          return validatedResponse;

        } catch (error) {
          lastError = error as Error;
          console.error(`AI evaluation attempt ${attempt} failed:`, (error as Error).message);
          if (attempt < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
      }

      console.error('All AI evaluation attempts failed, using fallback');
      return this.getFallbackResponse(playerAction, lastError);
    });
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
    const { model, provider } = getAIClient();
    console.log(`🤖 Using AI provider: ${provider} / model: ${model}`);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    if (provider === 'groq') {
      // Get ONE key for this request (don't call getNextGroqKey twice)
      const key = getNextGroqKey();
      console.log(`🔑 Using Groq key: ${key.substring(0, 15)}...`);

      return new Promise((resolve, reject) => {
        const https = require('https');
        const payload = JSON.stringify({
          model,
          messages,
          max_tokens: 800,
          temperature: 0.9,
        });

        const options = {
          hostname: 'api.groq.com',
          path: '/openai/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 35000,
        };

        const req = https.request(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                console.error('Groq API error:', JSON.stringify(parsed.error));
                reject(new Error(`Groq error: ${JSON.stringify(parsed.error)}`));
              } else {
                resolve(parsed);
              }
            } catch (e) {
              reject(new Error(`Failed to parse Groq response: ${data.substring(0, 300)}`));
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Groq request timed out after 35s'));
        });

        req.on('error', (err: any) => {
          console.error('Groq request error:', err.message);
          reject(err);
        });

        req.write(payload);
        req.end();
      });
    }

    // OpenAI fallback
    const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error('No OpenAI API key configured');
    if (!openaiInstance) openaiInstance = new OpenAI({ apiKey: openaiKey });
    return openaiInstance.chat.completions.create({
      model,
      messages,
      temperature: 0.9,
      max_tokens: 800,
    });
  }

  private buildSurvivalSystemPrompt(scenario: Scenario, session: SurvivalGameSession): string {
    const scenarioIndex = (session as any).scenarioIndex ?? 0;

    return `You are a darkly comedic, cinematic survival game master. Respond with JSON only — no other text.

SCENARIO ${scenarioIndex + 1}/5: ${scenario.title}
SITUATION: ${scenario.description}
ENVIRONMENT: ${scenario.environment}
WIN CONDITION: ${(scenario as any).winCondition || 'Survive this scenario'}

═══════════════════════════════════════════
MOST IMPORTANT RULE — READ CAREFULLY:
The player's action is the ENTIRE story. Your narration must be a DIRECT consequence of EXACTLY what they typed — not a generic survival story. If they said they used a banana peel, the banana peel must be in the story. If they said they screamed at the sun, the screaming must matter. Never narrate something the player didn't do.
═══════════════════════════════════════════

OUTCOME RULES:

✅ SURVIVAL — the action, however weird or logical, could plausibly lead to escaping this specific scenario:
   - Logical smart action (use the rope, find cover, etc.) → success
   - Whacky/creative action that COULD work within physics and the scenario (ride a shark, befriend the fire, etc.) → critical_success with humorous triumphant narration
   - The win condition does NOT have to be met literally — creative solutions that achieve the SPIRIT of the win condition count

☠️ DEATH — the action cannot possibly work in this specific situation:
   - Action that makes no physical sense even comedically (e.g. "I drink the lava")
   - Action that directly makes things worse (e.g. in a flood: "I open the floodgates")
   - Completely doing nothing meaningful

NARRATION RULES:
- DEATH: Name EXACTLY what the player did, describe how it specifically leads to death in THIS environment. Short punchy sentences. End with one haunting final line. Each death should feel unique to their specific choice.
- SURVIVAL: Name EXACTLY what the player did, describe how it specifically works — even if absurd, narrate it with full commitment like it's a movie scene.
- NEVER use generic filler like "you try your best" or "things go wrong" — always tie to their exact action.
- Lean into humour for creative/whacky answers. A player who tries something silly and it works should feel rewarded, not punished.

JSON format (ONLY output this, nothing else):
{
  "outcome": "critical_success|success|critical_failure",
  "damage": 0,
  "scoreChange": 0,
  "reason": "4-6 sentences directly about what the player specifically did and its exact consequence",
  "stateChanges": {},
  "resourceChanges": [],
  "objectiveProgress": {},
  "nextEvent": "One sentence — triumphant teaser if survived, haunting epitaph if dead",
  "continueGame": false
}

CRITICAL: continueGame is ALWAYS false. Every action ends the scenario.`;
  }

  private buildSurvivalUserPrompt(
    session: SurvivalGameSession,
    playerAction: string,
    history: SurvivalEvent[]
  ): string {
    const scenarioIndex = (session as any).scenarioIndex ?? 0;
    const totalScenarios = 5;

    return `SCENARIO ${scenarioIndex + 1}/${totalScenarios} — render a final verdict on this exact action.

THE PLAYER TYPED THIS EXACT ACTION: "${playerAction}"

Your entire narration MUST be about what they specifically did. Do not invent actions they didn't take. Do not narrate something generic. Make the reason field read like a movie scene where "${playerAction}" is literally the thing that happens.

If it's creative or whacky, COMMIT to it with humour and flair — reward the creativity if it could plausibly work in this environment. If it truly cannot work, describe the exact consequence of that specific mistake.

Respond with JSON only.`;
  }

  private sanitizeAIResponse(raw: any): AISurvivalResponse {
    const validOutcomes = ['success', 'partial_success', 'failure', 'critical_success', 'critical_failure'] as const;
    const outcome = validOutcomes.includes(raw?.outcome) ? raw.outcome : 'partial_success';

    const toNum = (v: any, fallback = 0): number => {
      const n = Number(v);
      return isNaN(n) ? fallback : Math.max(-100, Math.min(500, n));
    };

    // Sanitize objectiveProgress — convert any non-numeric values to 0
    const objectiveProgress: Record<string, number> = {};
    if (raw?.objectiveProgress && typeof raw.objectiveProgress === 'object') {
      for (const [key, val] of Object.entries(raw.objectiveProgress)) {
        const n = Number(val);
        objectiveProgress[key] = isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
      }
    }

    return {
      outcome,
      damage: toNum(raw?.damage, 0),
      scoreChange: toNum(raw?.scoreChange, 10),
      reason: typeof raw?.reason === 'string' && raw.reason.length > 0
        ? raw.reason.substring(0, 1000)
        : 'Your action had consequences.',
      stateChanges: raw?.stateChanges && typeof raw.stateChanges === 'object' ? raw.stateChanges : {},
      resourceChanges: Array.isArray(raw?.resourceChanges) ? raw.resourceChanges : [],
      objectiveProgress,
      nextEvent: typeof raw?.nextEvent === 'string' && raw.nextEvent.length > 0
        ? raw.nextEvent.substring(0, 1000)
        : 'Continue your journey.',
      continueGame: raw?.continueGame !== false,
    };
  }

  private parseAIResponse(content: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, try parsing the whole content
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Invalid JSON response from AI');
    }
  }

  private getFallbackResponse(playerAction: string, error: Error | null): AISurvivalResponse {
    console.log('Using fallback response for action:', playerAction);

    const action = playerAction.toLowerCase();

    // Generate a contextual fallback based on keywords in the action
    let reason = '';
    let nextEvent = '';
    let outcome: AISurvivalResponse['outcome'] = 'partial_success';
    let scoreChange = 15;

    if (action.includes('compass') || action.includes('direction') || action.includes('north') || action.includes('navigate')) {
      reason = `You take out your compass and study the needle carefully. It points steadily north, revealing that civilization likely lies in that direction. You mark your bearings and begin moving with renewed purpose, though the terrain ahead looks challenging.`;
      nextEvent = 'The sun is getting higher and your water supply is dwindling. You must find a water source soon.';
      outcome = 'success';
      scoreChange = 50;
    } else if (action.includes('water') || action.includes('dig') || action.includes('find water') || action.includes('drink')) {
      reason = `You scan the terrain for signs of water — dry riverbeds, green vegetation, or animal tracks. After some searching, you spot a cluster of desert plants suggesting moisture underground. You dig carefully but the ground is dry. You'll need to search further.`;
      nextEvent = 'Dehydration is setting in. You have about 2-3 hours before your condition worsens significantly.';
      outcome = 'partial_success';
      scoreChange = 20;
    } else if (action.includes('shelter') || action.includes('shade') || action.includes('rest') || action.includes('hide')) {
      reason = `You find a rocky overhang that provides shade from the brutal sun. Crawling underneath, you feel the temperature drop by several degrees. You rest and conserve energy, allowing your body to recover slightly. The break was needed.`;
      nextEvent = 'The afternoon heat is at its peak. You can move again in about an hour when it cools down.';
      outcome = 'success';
      scoreChange = 35;
    } else if (action.includes('signal') || action.includes('help') || action.includes('shout') || action.includes('fire') || action.includes('smoke')) {
      reason = `You attempt to signal for help using whatever is available. The signal might be visible from a distance, but out here in the wilderness there's no guarantee anyone is watching. You wait for a response, scanning the horizon anxiously.`;
      nextEvent = 'A distant glint catches your eye — it could be a vehicle, a building, or just a rock. You need to investigate.';
      outcome = 'partial_success';
      scoreChange = 25;
    } else if (action.includes('climb') || action.includes('hill') || action.includes('high') || action.includes('survey') || action.includes('look')) {
      reason = `You scramble up the nearest elevated ground to get a better view. From the top, you can see for miles in every direction. To the northeast, there's a darker patch of vegetation that could mean water. To the west, dust trails suggest a road.`;
      nextEvent = 'You now have a better sense of your surroundings. Choose your next direction wisely.';
      outcome = 'success';
      scoreChange = 55;
    } else if (action.includes('knife') || action.includes('cut') || action.includes('cactus') || action.includes('plant') || action.includes('food')) {
      reason = `You use your knife to investigate nearby plants and cacti for signs of food or water. You carefully cut into a cactus and find some moisture inside — not much, but enough to wet your parched lips and provide a tiny relief.`;
      nextEvent = 'Every little bit of hydration helps. But you need a proper water source before nightfall.';
      outcome = 'success';
      scoreChange = 40;
    } else {
      reason = `You carry out your plan with careful determination. The desert environment makes every action feel laborious, but you push through the discomfort and make what progress you can given the harsh conditions around you.`;
      nextEvent = 'The situation demands your next move. What will you do?';
      outcome = 'partial_success';
      scoreChange = 15;
    }

    return {
      outcome,
      damage: 0,
      scoreChange,
      reason,
      stateChanges: {},
      resourceChanges: [],
      objectiveProgress: {},
      nextEvent,
      continueGame: true,
    };
  }

  async checkSimilarity(guess: string, keywords: string[]): Promise<{ isSoClose: boolean; closestKeyword?: string }> {
    try {
      // Simple similarity check - in production you might use a more sophisticated method
      const lowerGuess = guess.toLowerCase().trim();
      
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        
        // Check for partial matches
        if (lowerKeyword.includes(lowerGuess) || lowerGuess.includes(lowerKeyword)) {
          // Check if it's not an exact match (which would be handled elsewhere)
          if (lowerGuess !== lowerKeyword) {
            return { isSoClose: true, closestKeyword: keyword };
          }
        }
        
        // Check for similar words (very basic implementation)
        if (this.calculateSimilarity(lowerGuess, lowerKeyword) > 0.7) {
          return { isSoClose: true, closestKeyword: keyword };
        }
      }
      
      return { isSoClose: false };
    } catch (error) {
      console.error('Similarity check failed:', error);
      return { isSoClose: false };
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}