import { query } from '@/database/connection';
import { AIService } from '@/services/aiService';
import {
  Challenge,
  ChallengeKeyword,
  PromptelGameSession,
  PromptelGuess,
  ChallengeScoring
} from '@/types';

export class PromptelEngine {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  async startChallenge(userId: string, challengeId: string, roundId?: string): Promise<PromptelGameSession> {
    // Get challenge details
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (!challenge.isActive) {
      throw new Error('Challenge is not active');
    }

    // Check if user already has an active session for this challenge
    const existingSession = await this.getActiveSession(userId, challengeId, roundId);
    if (existingSession) {
      return existingSession;
    }

    // Create new game session
    const sessionData = {
      userId,
      challengeId,
      roundId: roundId || null,
      status: 'active' as const,
      discoveredKeywords: [],
      remainingGuesses: challenge.maxGuesses,
      score: 0,
      hintUsed: false,
      timeRemaining: challenge.timeLimit,
    };

    const result = await query(
      `INSERT INTO promptle_sessions 
       (user_id, challenge_id, round_id, status, discovered_keywords, remaining_guesses, score, hint_used, time_remaining)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        sessionData.userId,
        sessionData.challengeId,
        sessionData.roundId,
        sessionData.status,
        JSON.stringify(sessionData.discoveredKeywords),
        sessionData.remainingGuesses,
        sessionData.score,
        sessionData.hintUsed,
        sessionData.timeRemaining,
      ]
    );

    return this.formatSession(result.rows[0]);
  }

  async submitGuess(sessionId: string, guess: string): Promise<{
    guess: PromptelGuess;
    session: PromptelGameSession;
    isGameComplete: boolean;
  }> {
    // Get current session
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    if (session.remainingGuesses <= 0) {
      throw new Error('No guesses remaining');
    }

    // Get challenge and keywords
    const challenge = await this.getChallenge(session.challengeId);
    const keywords = await this.getChallengeKeywords(session.challengeId);

    // Check if guess is a duplicate
    const previousGuesses = await this.getSessionGuesses(sessionId);
    const isDuplicate = previousGuesses.some(g => 
      g.guess.toLowerCase().trim() === guess.toLowerCase().trim()
    );

    if (isDuplicate) {
      throw new Error('You already guessed that word');
    }

    // Check if guess matches any keyword
    const guessResult = await this.evaluateGuess(guess, keywords, session.discoveredKeywords);
    
    // Calculate score change
    const scoreChange = this.calculateScoreChange(guessResult, challenge!.scoring);

    // Create guess record
    const guessData = {
      sessionId,
      guess: guess.trim(),
      isCorrect: guessResult.isCorrect,
      isSoClose: guessResult.isSoClose,
      matchedKeyword: guessResult.matchedKeyword,
      scoreChange,
    };

    const guessResult_db = await query(
      `INSERT INTO promptle_guesses 
       (session_id, guess, is_correct, is_so_close, matched_keyword, score_change)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        guessData.sessionId,
        guessData.guess,
        guessData.isCorrect,
        guessData.isSoClose,
        guessData.matchedKeyword,
        guessData.scoreChange,
      ]
    );

    // Update session
    const updatedSession = await this.updateSessionAfterGuess(session, guessResult, scoreChange);
    
    // Check if game is complete
    const isGameComplete = this.checkGameCompletion(updatedSession, keywords);
    if (isGameComplete) {
      await this.completeSession(sessionId, updatedSession.score);
    }

    return {
      guess: this.formatGuess(guessResult_db.rows[0]),
      session: updatedSession,
      isGameComplete,
    };
  }

  async useHint(sessionId: string): Promise<{ hint: string; session: PromptelGameSession }> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    if (session.hintUsed) {
      throw new Error('Hint already used');
    }

    const challenge = await this.getChallenge(session.challengeId);
    if (!challenge?.hint) {
      throw new Error('No hint available for this challenge');
    }

    // Apply hint penalty
    const hintPenalty = challenge.scoring.hintPenalty;
    const newScore = Math.max(0, session.score - hintPenalty);

    // Update session
    await query(
      'UPDATE promptle_sessions SET hint_used = true, score = $1 WHERE id = $2',
      [newScore, sessionId]
    );

    const updatedSession = { ...session, hintUsed: true, score: newScore };

    return {
      hint: this.processHint(challenge.hint),
      session: updatedSession,
    };
  }

  async getSessionState(sessionId: string): Promise<{
    session: PromptelGameSession;
    challenge: Partial<Challenge>;
    guesses: PromptelGuess[];
  }> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const challenge = await this.getChallenge(session.challengeId);
    const guesses = await this.getSessionGuesses(sessionId);

    // Only return safe challenge data (no hidden keywords)
    const safeChallenge = {
      id: challenge!.id,
      title: challenge!.title,
      description: challenge!.description,
      imageUrl: challenge!.imageUrl,
      difficulty: challenge!.difficulty,
      category: challenge!.category,
      maxGuesses: challenge!.maxGuesses,
      timeLimit: challenge!.timeLimit,
      // Don't include: generationPrompt, keywords
    };

    return {
      session,
      challenge: safeChallenge,
      guesses,
    };
  }

  private async evaluateGuess(
    guess: string, 
    keywords: ChallengeKeyword[], 
    discoveredKeywords: string[]
  ): Promise<{
    isCorrect: boolean;
    isSoClose: boolean;
    matchedKeyword?: string;
  }> {
    const normalizedGuess = guess.toLowerCase().trim();
    
    // Check exact matches and aliases
    for (const keyword of keywords) {
      // Skip if already discovered
      if (discoveredKeywords.includes(keyword.keyword)) {
        continue;
      }

      const normalizedKeyword = keyword.keyword.toLowerCase();
      
      // Exact match
      if (normalizedGuess === normalizedKeyword) {
        return { isCorrect: true, isSoClose: false, matchedKeyword: keyword.keyword };
      }

      // Check aliases
      for (const alias of keyword.aliases) {
        if (normalizedGuess === alias.toLowerCase()) {
          return { isCorrect: true, isSoClose: false, matchedKeyword: keyword.keyword };
        }
      }
    }

    // Check for "so close" matches using AI service
    const undiscoveredKeywords = keywords
      .filter(k => !discoveredKeywords.includes(k.keyword))
      .map(k => k.keyword);

    const similarity = await this.aiService.checkSimilarity(guess, undiscoveredKeywords);
    
    return {
      isCorrect: false,
      isSoClose: similarity.isSoClose,
      matchedKeyword: similarity.closestKeyword,
    };
  }

  private calculateScoreChange(
    guessResult: { isCorrect: boolean; isSoClose: boolean },
    scoring: ChallengeScoring
  ): number {
    if (guessResult.isCorrect) {
      return scoring.correctBonus;
    } else if (guessResult.isSoClose) {
      return 0; // "So close" doesn't give points but doesn't penalize
    } else {
      return -scoring.wrongPenalty;
    }
  }

  private async updateSessionAfterGuess(
    session: PromptelGameSession,
    guessResult: { isCorrect: boolean; isSoClose: boolean; matchedKeyword?: string },
    scoreChange: number
  ): Promise<PromptelGameSession> {
    let newDiscoveredKeywords = [...session.discoveredKeywords];
    let newRemainingGuesses = session.remainingGuesses;
    
    if (guessResult.isCorrect && guessResult.matchedKeyword) {
      newDiscoveredKeywords.push(guessResult.matchedKeyword);
    }

    // Consume guess (unless it's "so close" and configured not to consume)
    if (!guessResult.isSoClose) {
      newRemainingGuesses -= 1;
    }

    const newScore = Math.max(0, session.score + scoreChange);

    await query(
      `UPDATE promptle_sessions 
       SET discovered_keywords = $1, remaining_guesses = $2, score = $3
       WHERE id = $4`,
      [JSON.stringify(newDiscoveredKeywords), newRemainingGuesses, newScore, session.id]
    );

    return {
      ...session,
      discoveredKeywords: newDiscoveredKeywords,
      remainingGuesses: newRemainingGuesses,
      score: newScore,
    };
  }

  private checkGameCompletion(session: PromptelGameSession, keywords: ChallengeKeyword[]): boolean {
    const requiredKeywords = keywords.filter(k => k.isRequired);
    const discoveredRequired = requiredKeywords.filter(k => 
      session.discoveredKeywords.includes(k.keyword)
    );

    return discoveredRequired.length === requiredKeywords.length;
  }

  private async completeSession(sessionId: string, finalScore: number): Promise<void> {
    // Add completion bonus
    const challenge = await query(
      'SELECT scoring FROM challenges c JOIN promptle_sessions ps ON c.id = ps.challenge_id WHERE ps.id = $1',
      [sessionId]
    );

    if (challenge.rows.length > 0) {
      const scoring = challenge.rows[0].scoring;
      const completionBonus = scoring.completionBonus || 0;
      const totalScore = finalScore + completionBonus;

      await query(
        'UPDATE promptle_sessions SET status = $1, score = $2, end_time = CURRENT_TIMESTAMP WHERE id = $3',
        ['completed', totalScore, sessionId]
      );
    } else {
      await query(
        'UPDATE promptle_sessions SET status = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', sessionId]
      );
    }
  }

  private processHint(hint: string): string {
    // Simple hint processing - scramble letters
    const words = hint.split(' ');
    return words.map(word => {
      if (word.length <= 3) return word;
      const chars = word.split('');
      // Scramble middle characters
      for (let i = 1; i < chars.length - 1; i++) {
        if (Math.random() > 0.5) {
          chars[i] = '_';
        }
      }
      return chars.join('');
    }).join(' ');
  }

  // Database helper methods
  private async getChallenge(challengeId: string): Promise<Challenge | null> {
    const result = await query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
    return result.rows[0] || null;
  }

  private async getChallengeKeywords(challengeId: string): Promise<ChallengeKeyword[]> {
    const result = await query(
      'SELECT * FROM challenge_keywords WHERE challenge_id = $1 ORDER BY keyword',
      [challengeId]
    );
    return result.rows;
  }

  private async getActiveSession(userId: string, challengeId: string, roundId?: string): Promise<PromptelGameSession | null> {
    const params = [userId, challengeId];
    let query_str = 'SELECT * FROM promptle_sessions WHERE user_id = $1 AND challenge_id = $2 AND status = \'active\'';
    
    if (roundId) {
      query_str += ' AND round_id = $3';
      params.push(roundId);
    } else {
      query_str += ' AND round_id IS NULL';
    }

    const result = await query(query_str, params);
    return result.rows[0] ? this.formatSession(result.rows[0]) : null;
  }

  private async getSessionById(sessionId: string): Promise<PromptelGameSession | null> {
    const result = await query('SELECT * FROM promptle_sessions WHERE id = $1', [sessionId]);
    return result.rows[0] ? this.formatSession(result.rows[0]) : null;
  }

  private async getSessionGuesses(sessionId: string): Promise<PromptelGuess[]> {
    const result = await query(
      'SELECT * FROM promptle_guesses WHERE session_id = $1 ORDER BY created_at',
      [sessionId]
    );
    return result.rows.map(row => this.formatGuess(row));
  }

  private formatSession(row: any): PromptelGameSession {
    return {
      id: row.id,
      userId: row.user_id,
      challengeId: row.challenge_id,
      roundId: row.round_id,
      status: row.status,
      discoveredKeywords: Array.isArray(row.discovered_keywords) 
        ? row.discovered_keywords 
        : JSON.parse(row.discovered_keywords || '[]'),
      guesses: [], // Will be loaded separately if needed
      remainingGuesses: row.remaining_guesses,
      score: row.score,
      hintUsed: row.hint_used,
      startTime: row.start_time,
      endTime: row.end_time,
      timeRemaining: row.time_remaining,
    };
  }

  private formatGuess(row: any): PromptelGuess {
    return {
      id: row.id,
      sessionId: row.session_id,
      guess: row.guess,
      isCorrect: row.is_correct,
      isSoClose: row.is_so_close,
      matchedKeyword: row.matched_keyword,
      timestamp: row.created_at,
      scoreChange: row.score_change,
    };
  }
}