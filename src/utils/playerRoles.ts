/**
 * Player Role & Identity System - Universal Game State
 * Core Principle: Every screen must ALWAYS know WHO you are, WHAT your role is, WHAT you can do
 */

import { CloneGameState } from '@/services/clone';

// Player role types
export type PlayerRole = 'QUESTIONER' | 'RESPONDER' | 'VOTER' | 'SPECTATOR';

// Platform types
export type Platform = 'cloneplay' | 'redblue';

/**
 * Determine if a player is a team leader
 */
export function isTeamLeader(gameState: CloneGameState, playerId: string): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;

  // Get all players in the same team
  const teamPlayers = gameState.players.filter(p => p.teamId === player.teamId);

  // If only one player in team, they are the leader
  if (teamPlayers.length === 1) {
    return true;
  }

  // Sort by join time to find the first person in each team (team leader)
  const sortedTeamPlayers = [...teamPlayers]
    .filter(p => p.joinedAt) // Only players with join time
    .sort((a, b) => {
      // Handle Firebase Timestamp objects
      const aTime = a.joinedAt && typeof a.joinedAt === 'object' && 'toMillis' in a.joinedAt
        ? a.joinedAt.toMillis()
        : new Date(a.joinedAt!).getTime();
      const bTime = b.joinedAt && typeof b.joinedAt === 'object' && 'toMillis' in b.joinedAt
        ? b.joinedAt.toMillis()
        : new Date(b.joinedAt!).getTime();
      return aTime - bTime;
    });

  // First person to join the team is the leader
  if (sortedTeamPlayers.length > 0 && sortedTeamPlayers[0].id === playerId) {
    return true;
  }

  // Fallback: If no join times, consider first player alphabetically as leader
  if (sortedTeamPlayers.length === 0) {
    const alphabeticalTeamPlayers = [...teamPlayers].sort((a, b) => a.id.localeCompare(b.id));
    return alphabeticalTeamPlayers[0].id === playerId;
  }

  return false;
}

/**
 * Determine a player's current role based on game state with team leadership
 */
export function determinePlayerRole(gameState: CloneGameState, myPlayerId: string): PlayerRole {
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  
  if (!myPlayer) {
    console.error(`Player ${myPlayerId} not found in game`);
    return 'SPECTATOR';
  }
  
  const isCurrentPlayer = gameState.currentPlayer === myPlayerId;
  const isMyTeamQuestioning = myPlayer.teamId === gameState.questioningTeam;
  const amITeamLeader = isTeamLeader(gameState, myPlayerId);
  const totalPlayers = gameState.players.length;
  
  // Role determination based on game phase with team leadership
  switch (gameState.gamePhase) {
    case 'questioning':
      if (isCurrentPlayer) {
        return 'RESPONDER';           // Being questioned (random rotation)
      } else if (isMyTeamQuestioning && !gameState.currentQuestion) {
        // Team leadership logic for questioning
        if (totalPlayers === 2) {
          return 'QUESTIONER';        // 2 players: both are active
        } else if (amITeamLeader) {
          return 'QUESTIONER';        // Team leader asks questions
        } else {
          return 'SPECTATOR';         // Non-leaders watch
        }
      } else {
        return 'SPECTATOR';           // Watching
      }
      
    case 'waiting_for_response':
      if (isCurrentPlayer) {
        return 'RESPONDER';           // Choosing response
      } else {
        return 'SPECTATOR';           // Waiting for response
      }
      
    case 'voting':
      if (isMyTeamQuestioning && !isCurrentPlayer) {
        // All questioning team members can vote (except current player)
        return 'VOTER';
      } else {
        return 'SPECTATOR';           // Watching voting
      }
      
    case 'results':
      return 'SPECTATOR';             // Everyone watches results
      
    default:
      return 'SPECTATOR';
  }
}

/**
 * Get spectator message based on current game state
 */
export function getSpectatorMessage(gameState: CloneGameState): string {
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
  const questioningTeamName = gameState.questioningTeam === 'A' ? 'Team A' : 'Team B';
  const respondingTeamName = currentPlayer?.teamId === 'A' ? 'Team A' : 'Team B';
  
  switch (gameState.gamePhase) {
    case 'questioning':
      if (!gameState.currentQuestion) {
        return `${questioningTeamName} is preparing a question for ${currentPlayer?.name} (${respondingTeamName})`;
      } else {
        return `Waiting for ${currentPlayer?.name} to respond to: "${gameState.currentQuestion}"`;
      }
      
    case 'waiting_for_response':
      return `Waiting for ${currentPlayer?.name} to choose their response...`;
      
    case 'voting':
      return `${questioningTeamName} is voting on ${currentPlayer?.name}'s response`;
      
    case 'results':
      const result = gameState.roundResult;
      if (result) {
        return `Round ${gameState.roundNumber} results: ${result.correct ? 'Correct guess!' : 'Wrong guess!'}`;
      }
      return `Viewing round ${gameState.roundNumber} results`;
      
    default:
      return `Game in ${gameState.gamePhase} phase`;
  }
}

/**
 * Get description of current action happening in the game
 */
export function getCurrentActionDescription(gameState: CloneGameState): string {
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
  
  switch (gameState.gamePhase) {
    case 'team_assignment':
      return 'Teams are being assigned...';
      
    case 'clone_creation':
      return 'Players are creating their AI clones...';
      
    case 'questioning':
      if (!gameState.currentQuestion) {
        return `Waiting for question to ${currentPlayer?.name}`;
      }
      return `Question asked: "${gameState.currentQuestion}"`;
      
    case 'waiting_for_response':
      return `${currentPlayer?.name} is crafting their response...`;
      
    case 'master_review':
      return 'Master is reviewing the response...';
      
    case 'voting':
      if (gameState.playerResponse) {
        return `Response: "${gameState.playerResponse}"`;
      }
      return 'Team is voting on the response...';
      
    case 'results':
      if (gameState.roundResult) {
        const { guess, actual, correct } = gameState.roundResult;
        return `Guess: ${guess.toUpperCase()} | Actual: ${actual.toUpperCase()} | ${correct ? '✅ Correct!' : '❌ Wrong'}`;
      }
      return 'Calculating results...';
      
    default:
      return '';
  }
}

/**
 * Validate complete game state
 */
export function validateGameState(gameState: CloneGameState, myPlayerId: string): string[] {
  const errors: string[] = [];
  
  // Check player exists
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  if (!myPlayer) {
    errors.push(`Player ${myPlayerId} not found in game`);
  }
  
  // Check current player exists if set
  if (gameState.currentPlayer) {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
    if (!currentPlayer) {
      errors.push(`Current player ${gameState.currentPlayer} not found`);
    }
    
    // Check team consistency
    if (currentPlayer && currentPlayer.teamId === gameState.questioningTeam) {
      errors.push(`Team ${gameState.questioningTeam} cannot question their own player ${currentPlayer.name}`);
    }
  }
  
  // Check questioning team is valid
  if (gameState.questioningTeam && !['A', 'B'].includes(gameState.questioningTeam)) {
    errors.push(`Invalid questioning team: ${gameState.questioningTeam}`);
  }
  
  // Check phase is valid
  const validPhases = ['team_assignment', 'clone_creation', 'questioning', 'waiting_for_response', 'master_review', 'voting', 'results'];
  if (!validPhases.includes(gameState.gamePhase)) {
    errors.push(`Invalid game phase: ${gameState.gamePhase}`);
  }
  
  return errors;
}

/**
 * Get role-specific action text
 */
export function getRoleActionText(role: PlayerRole, gameState: CloneGameState): string {
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
  
  switch (role) {
    case 'QUESTIONER':
      return `Ask ${currentPlayer?.name} a question about ${gameState.topic || 'the topic'}`;
      
    case 'RESPONDER':
      if (gameState.currentQuestion) {
        return 'Choose your response: Human or Clone?';
      }
      return 'Waiting for a question from the opposing team...';
      
    case 'VOTER':
      return 'Vote: Is this response Human or Clone?';
      
    case 'SPECTATOR':
      return 'Watching and waiting...';
      
    default:
      return '';
  }
}

/**
 * Check if player should be able to perform an action
 */
export function canPlayerAct(gameState: CloneGameState, myPlayerId: string, action: 'question' | 'respond' | 'vote'): boolean {
  const role = determinePlayerRole(gameState, myPlayerId);
  
  switch (action) {
    case 'question':
      return role === 'QUESTIONER' && !gameState.currentQuestion;
      
    case 'respond':
      return role === 'RESPONDER' && !!gameState.currentQuestion && !gameState.playerResponse;

    case 'vote':
      return role === 'VOTER' && !!gameState.playerResponse && !gameState.playerVotes?.[myPlayerId];
      
    default:
      return false;
  }
}