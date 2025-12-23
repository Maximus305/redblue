import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import LobbyService from '../lobby';
import { CloneGameState } from './types';

export async function start(roomId: string): Promise<void> {
  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameDoc = await getDoc(cloneGameRef);

  if (!gameDoc.exists()) {
    throw new Error('Clone game not found');
  }

  const gameData = gameDoc.data() as CloneGameState;

  const playersWithoutProfiles = gameData.players.filter(p => !p.hasCloneProfile || !p.cloneInfo);
  if (playersWithoutProfiles.length > 0) {
    const playerNames = playersWithoutProfiles.map(p => p.name).join(', ');
    throw new Error(`The following players haven't created their clone profiles yet: ${playerNames}`);
  }

  const firstTeamBPlayer = gameData.players.find(p => p.teamId === 'B');

  if (!firstTeamBPlayer) {
    throw new Error('No Team B players found to be questioned');
  }

  await updateDoc(cloneGameRef, {
    gamePhase: 'questioning',
    currentPlayer: firstTeamBPlayer.id,
    questioningTeam: 'A',
    playersAnswered: [],
    lastUpdated: serverTimestamp()
  });

  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    gameState: 'playing',
    lastActivity: serverTimestamp()
  });
}

export async function next(roomId: string): Promise<void> {
  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameDoc = await getDoc(cloneGameRef);

  if (!gameDoc.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameDoc.data() as CloneGameState;

  const nextQuestioningTeam = gameData.questioningTeam === 'A' ? 'B' : 'A';
  const teamBeingQuestioned = nextQuestioningTeam === 'A' ? 'B' : 'A';
  const playersFromTeamBeingQuestioned = gameData.players.filter(p => p.teamId === teamBeingQuestioned);

  if (playersFromTeamBeingQuestioned.length === 0) {
    throw new Error(`No players found in team ${teamBeingQuestioned} to be questioned`);
  }

  const playersAnswered = gameData.playersAnswered || [];
  const availablePlayers = playersFromTeamBeingQuestioned.filter(p => !playersAnswered.includes(p.id));

  let nextPlayer;
  if (availablePlayers.length > 0) {
    nextPlayer = availablePlayers[0];
  } else {
    nextPlayer = playersFromTeamBeingQuestioned[0];
    playersAnswered.length = 0;
  }

  await updateDoc(cloneGameRef, {
    gamePhase: 'questioning',
    currentPlayer: nextPlayer.id,
    questioningTeam: nextQuestioningTeam,
    playersAnswered: [...playersAnswered, nextPlayer.id],
    currentQuestion: null,
    playerResponse: null,
    usedClone: null,
    roundNumber: gameData.roundNumber + 1,
    players: gameData.players,
    lastUpdated: serverTimestamp()
  });
}

export function listen(roomId: string, callback: (gameState: CloneGameState | null) => void): () => void {
  const cloneGameRef = doc(db, 'clone_games', roomId);

  const unsubscribe = onSnapshot(
    cloneGameRef,
    async (doc) => {
      if (doc.exists()) {
        const gameState = doc.data() as CloneGameState;

        if (gameState.gamePhase !== 'team_assignment' && gameState.gamePhase !== 'clone_creation') {
          const playersWithoutTeams = gameState.players.filter(p => !p.teamId);
          if (playersWithoutTeams.length > 0) {
            await syncMembers(roomId);
            return;
          }
        }

        callback(gameState);
      } else {
        callback(null);
      }
    },
    () => {
      callback(null);
    }
  );

  return unsubscribe;
}

async function syncMembers(roomId: string): Promise<void> {
  try {
    const members = await LobbyService.getRoomMembers(roomId);
    const cloneGameRef = doc(db, 'clone_games', roomId);
    const gameDoc = await getDoc(cloneGameRef);

    if (!gameDoc.exists()) return;

    const gameData = gameDoc.data() as CloneGameState;
    const existingPlayers = gameData.players || [];

    const memberIds = new Set(members.map(m => m.memberId));
    const playersToKeep = existingPlayers.filter(p => memberIds.has(p.id));

    const playersMap = new Map(playersToKeep.map(p => [p.id, p]));

    const syncedPlayers = members.map(member => {
      const existingPlayer = playersMap.get(member.memberId);

      if (existingPlayer) {
        return {
          ...existingPlayer,
          name: member.displayName,
          isHost: member.role === 'host',
          platform: member.platform,
          hasCloneProfile: member.hasCloneProfile || existingPlayer.hasCloneProfile,
          cloneInfo: member.cloneInfo || existingPlayer.cloneInfo
        };
      } else {
        return {
          id: member.memberId,
          name: member.displayName,
          teamId: playersToKeep.length % 2 === 0 ? 'A' : 'B',
          hasCloneProfile: member.hasCloneProfile || false,
          cloneInfo: member.cloneInfo,
          isHost: member.role === 'host',
          platform: member.platform,
          joinedAt: member.joinedAt || serverTimestamp()
        };
      }
    });

    await updateDoc(cloneGameRef, {
      players: syncedPlayers,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
}
