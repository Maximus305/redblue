/**
 * RedBlue Player Role System
 * Determines player roles based on game phase and speaker assignment
 */

import type { GamePhase, RedBluePlayer, Round } from '@/services/redblue';

// RedBlue role types
export type RedBlueRole = 'SPEAKER' | 'VOTER' | 'SPECTATOR' | 'HOST';

// Platform types
export type Platform = 'host' | 'player';

/**
 * Determine a player's current role based on game phase and round
 */
export function determineRedBlueRole(
  phase: GamePhase,
  playerId: string,
  currentRound?: Round | null,
  isHost: boolean = false
): RedBlueRole {
  // Host always has HOST role on host device
  if (isHost) {
    return 'HOST';
  }

  switch (phase) {
    case 'LOBBY':
    case 'CALIBRATE':
    case 'LEADERBOARD':
    case 'END':
      return 'SPECTATOR';

    case 'ROUND_INTRO':
      return 'SPECTATOR';

    case 'SPEAKER_DECIDE':
      if (currentRound && currentRound.speakerId === playerId) {
        return 'SPEAKER';
      }
      return 'SPECTATOR';

    case 'VOTING':
      // Speaker cannot vote
      if (currentRound && currentRound.speakerId === playerId) {
        return 'SPECTATOR';
      }
      return 'VOTER';

    case 'REVEAL':
      return 'SPECTATOR';

    default:
      return 'SPECTATOR';
  }
}

/**
 * Get role-specific action text for players
 */
export function getRoleActionText(
  role: RedBlueRole,
  phase: GamePhase,
  speakerName?: string
): string {
  switch (role) {
    case 'SPEAKER':
      if (phase === 'SPEAKER_DECIDE') {
        return 'Choose AI or Self, then get ready to read';
      }
      return 'You are the speaker this round';

    case 'VOTER':
      if (phase === 'VOTING') {
        return 'Vote: Was that AI or Self?';
      }
      return 'Get ready to vote';

    case 'SPECTATOR':
      if (phase === 'ROUND_INTRO' && speakerName) {
        return `Up next: ${speakerName}`;
      }
      if (phase === 'SPEAKER_DECIDE' && speakerName) {
        return `${speakerName} is choosing...`;
      }
      if (phase === 'VOTING') {
        return 'Others are voting...';
      }
      return 'Watching...';

    case 'HOST':
      return 'You are the host';

    default:
      return '';
  }
}

/**
 * Get phase description for display
 */
export function getPhaseDescription(phase: GamePhase, speakerName?: string): string {
  switch (phase) {
    case 'LOBBY':
      return 'Waiting for players to join';

    case 'CALIBRATE':
      return 'Choose a few traits that sound like you';

    case 'ROUND_INTRO':
      return speakerName ? `Up next: ${speakerName}` : 'Starting round...';

    case 'SPEAKER_DECIDE':
      return speakerName ? `${speakerName} is choosing AI or Self` : 'Speaker is choosing...';

    case 'VOTING':
      return 'Vote: AI or Self?';

    case 'REVEAL':
      return 'Revealing results...';

    case 'LEADERBOARD':
      return 'Leaderboard';

    case 'END':
      return 'Game over!';

    default:
      return 'In progress...';
  }
}

/**
 * Check if player can perform a specific action
 */
export function canPlayerAct(
  role: RedBlueRole,
  phase: GamePhase,
  action: 'choose' | 'vote' | 'advance'
): boolean {
  switch (action) {
    case 'choose':
      return role === 'SPEAKER' && phase === 'SPEAKER_DECIDE';

    case 'vote':
      return role === 'VOTER' && phase === 'VOTING';

    case 'advance':
      return role === 'HOST';

    default:
      return false;
  }
}

/**
 * Get status message for player based on current state
 */
export function getPlayerStatusMessage(
  role: RedBlueRole,
  phase: GamePhase,
  hasVoted?: boolean,
  hasChosenResponse?: boolean
): string {
  switch (role) {
    case 'SPEAKER':
      if (phase === 'SPEAKER_DECIDE') {
        if (hasChosenResponse) {
          return 'Choice locked - get ready';
        }
        return 'Make your choice';
      }
      if (phase === 'VOTING') {
        return 'You cannot vote';
      }
      return 'You are up';

    case 'VOTER':
      if (phase === 'VOTING') {
        if (hasVoted) {
          return 'Vote locked';
        }
        return 'Tap to vote';
      }
      return 'Get ready to vote';

    case 'SPECTATOR':
      if (phase === 'SPEAKER_DECIDE') {
        return 'Waiting for speaker';
      }
      if (phase === 'VOTING') {
        return 'Watch-only';
      }
      return 'Watching';

    case 'HOST':
      return 'Admin controls';

    default:
      return '';
  }
}

/**
 * Validate player can view AI answer
 * Only speaker can see AI answer before reveal
 */
export function canViewAIAnswer(
  playerId: string,
  phase: GamePhase,
  currentRound?: Round | null
): boolean {
  if (phase === 'REVEAL' || phase === 'LEADERBOARD' || phase === 'END') {
    // After reveal, everyone can see
    return true;
  }

  if (phase === 'SPEAKER_DECIDE' && currentRound) {
    // Only speaker can see before reveal
    return currentRound.speakerId === playerId && currentRound.speakerChoice === 'AI';
  }

  return false;
}

/**
 * Get countdown message for voting
 */
export function getCountdownMessage(secondsRemaining: number): string {
  if (secondsRemaining <= 0) {
    return 'Voting closed';
  }

  if (secondsRemaining <= 5) {
    return `${secondsRemaining}s left!`;
  }

  return `${secondsRemaining}s remaining`;
}

/**
 * Get player score delta message
 */
export function getScoreDeltaMessage(delta: number): string {
  if (delta === 0) {
    return 'No points';
  }

  if (delta > 0) {
    return `+${delta} point${delta === 1 ? '' : 's'}`;
  }

  return `${delta} points`;
}

/**
 * Format player list for display with roles
 */
export function formatPlayerList(
  players: RedBluePlayer[],
  currentRound?: Round | null,
  phase?: GamePhase
): Array<{
  player: RedBluePlayer;
  role: RedBlueRole;
  isSpeaker: boolean;
  canVote: boolean;
}> {
  return players.map(player => {
    const role = determineRedBlueRole(
      phase || 'LOBBY',
      player.id,
      currentRound,
      player.isHost
    );

    const isSpeaker = currentRound?.speakerId === player.id;
    const canVote = role === 'VOTER' && phase === 'VOTING';

    return {
      player,
      role,
      isSpeaker,
      canVote
    };
  });
}

/**
 * Get reveal message based on result
 */
export function getRevealMessage(
  wasCorrect: boolean,
  fooledMajority: boolean,
  isSpeaker: boolean
): string {
  if (isSpeaker) {
    if (fooledMajority) {
      return "You fooled them! +1 point";
    }
    return "They guessed it! No points";
  }

  if (wasCorrect) {
    return "You were right! +1 point";
  }

  return "Close! No points";
}
