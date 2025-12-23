export * from './types';
export * as Setup from './setup';
export * as Join from './join';
export * as Question from './question';
export * as Response from './response';
export * as Voting from './voting';
export * as Rounds from './rounds';

import { CloneGameState } from './types';
import { initializeGame, balanceTeams } from './setup';
import { saveProfile, updateStatus } from './join';
import { submit as submitQuestion } from './question';
import { submit as submitResponse } from './response';
import { submit as submitVote, calculateResults } from './voting';
import { start, next, listen } from './rounds';

export default class CloneGameService {
  static async initializeCloneGame(roomId: string, hostId: string): Promise<void> {
    return initializeGame(roomId, hostId);
  }

  static autoBalanceTeams = balanceTeams;

  static async saveCloneData(roomId: string, playerId: string, personalityText: string) {
    return saveProfile(roomId, playerId, personalityText);
  }

  static async updatePlayerStatus(roomId: string, playerId: string, updates: {
    platform?: 'mobile' | 'web' | 'cloneplay';
    lastSeen?: string;
    isOnline?: boolean;
  }): Promise<void> {
    return updateStatus(roomId, playerId, updates);
  }

  static async startCloneGame(roomId: string): Promise<void> {
    return start(roomId);
  }

  static async submitQuestion(roomId: string, question: string): Promise<void> {
    return submitQuestion(roomId, question);
  }

  static async submitPlayerResponse(roomId: string, playerId: string, choice: 'human' | 'clone', humanAnswer?: string, aiResponse?: string): Promise<void> {
    return submitResponse(roomId, playerId, choice, humanAnswer, aiResponse);
  }

  static async submitVote(roomId: string, playerId: string, vote: 'human' | 'clone'): Promise<void> {
    return submitVote(roomId, playerId, vote);
  }

  static async calculateVotingResults(roomId: string): Promise<void> {
    return calculateResults(roomId);
  }

  static async nextRound(roomId: string): Promise<void> {
    return next(roomId);
  }

  static listenToCloneGame(roomId: string, callback: (gameState: CloneGameState | null) => void): () => void {
    return listen(roomId, callback);
  }
}
