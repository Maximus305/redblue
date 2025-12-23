import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CloneGameState } from './types';

export async function submit(roomId: string, playerId: string, choice: 'human' | 'clone', humanAnswer?: string, aiResponse?: string): Promise<void> {
  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameDoc = await getDoc(cloneGameRef);

  if (!gameDoc.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameDoc.data() as CloneGameState;

  if (gameData.currentPlayer !== playerId) {
    throw new Error('Not your turn');
  }

  const playerResponse = choice === 'human' ? (humanAnswer || '') : (aiResponse || '');

  await updateDoc(cloneGameRef, {
    playerResponse,
    usedClone: choice === 'clone',
    awaitingResponse: false,
    responseSubmittedAt: serverTimestamp(),
    gamePhase: 'voting',
    lastUpdated: serverTimestamp()
  });
}
