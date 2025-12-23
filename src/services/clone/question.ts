import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import LobbyService from '../lobby';
import { CloneGameState, getTeamColor } from './types';

export async function submit(roomId: string, question: string): Promise<void> {
  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameDoc = await getDoc(cloneGameRef);

  if (!gameDoc.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameDoc.data() as CloneGameState;
  const currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayer);

  if (!currentPlayer) {
    throw new Error('Current player not found');
  }

  if (currentPlayer.teamId === gameData.questioningTeam) {
    throw new Error(`Invalid game state: Team ${getTeamColor(gameData.questioningTeam)} cannot question their own player`);
  }

  if (!currentPlayer.cloneInfo) {
    const members = await LobbyService.getRoomMembers(roomId);
    const memberData = members.find(m => m.memberId === gameData.currentPlayer);

    if (memberData && memberData.cloneInfo) {
      currentPlayer.cloneInfo = memberData.cloneInfo;

      const updatedPlayers = gameData.players.map(p =>
        p.id === gameData.currentPlayer
          ? { ...p, cloneInfo: memberData.cloneInfo, hasCloneProfile: true }
          : p
      );

      await updateDoc(cloneGameRef, { players: updatedPlayers });
    } else {
      throw new Error('Player clone info not found');
    }
  }

  await updateDoc(cloneGameRef, {
    currentQuestion: question,
    gamePhase: 'waiting_for_response',
    awaitingResponse: true,
    questionAskedAt: serverTimestamp(),
    lastUpdated: serverTimestamp()
  });
}
