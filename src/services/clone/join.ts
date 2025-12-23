import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import LobbyService from '../lobby';
import { CloneGameState, ClonePlayer, CreateCloneResponse } from './types';

export async function saveProfile(roomId: string, playerId: string, personalityText: string): Promise<CreateCloneResponse> {
  try {
    await LobbyService.updateMember(roomId, playerId, {
      cloneInfo: personalityText,
      hasCloneProfile: true
    });

    const cloneGameRef = doc(db, 'clone_games', roomId);
    const gameDoc = await getDoc(cloneGameRef);

    if (gameDoc.exists()) {
      const gameData = gameDoc.data() as CloneGameState;
      const updatedPlayers = gameData.players.map(player =>
        player.id === playerId
          ? { ...player, hasCloneProfile: true, cloneInfo: personalityText }
          : player
      );

      const updateData: { players: ClonePlayer[]; lastUpdated: ReturnType<typeof serverTimestamp> } = {
        players: updatedPlayers,
        lastUpdated: serverTimestamp()
      };

      await updateDoc(cloneGameRef, updateData);
    }

    return { success: true, message: 'Clone profile created successfully' };
  } catch {
    return { success: false, message: 'Failed to save clone profile' };
  }
}

export async function updateStatus(roomId: string, playerId: string, updates: {
  platform?: 'mobile' | 'web' | 'cloneplay';
  lastSeen?: string;
  isOnline?: boolean;
}): Promise<void> {
  try {
    const cloneGameRef = doc(db, 'clone_games', roomId);
    const gameDoc = await getDoc(cloneGameRef);

    if (!gameDoc.exists()) return;

    const gameData = gameDoc.data() as CloneGameState;
    const updatedPlayers = gameData.players.map(player =>
      player.id === playerId
        ? { ...player, ...updates }
        : player
    );

    await updateDoc(cloneGameRef, {
      players: updatedPlayers,
      lastUpdated: serverTimestamp()
    });
  } catch {
    throw new Error('Failed to update player status');
  }
}
