import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import LobbyService from '../lobby';
import { ClonePlayer, CloneGameState } from './types';

export async function initializeGame(roomId: string, hostId: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  const roomDoc = await getDoc(roomRef);

  if (!roomDoc.exists()) {
    await setDoc(roomRef, {
      roomId: roomId,
      active: true,
      gameMode: 'clone',
      gameState: 'waiting',
      hostId: hostId,
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
  }

  const members = await LobbyService.getRoomMembers(roomId);

  const players: ClonePlayer[] = members.map(member => ({
    id: member.memberId,
    name: member.displayName,
    teamId: 'A',
    hasCloneProfile: member.hasCloneProfile || false,
    cloneInfo: member.cloneInfo,
    isHost: member.role === 'host',
    platform: member.platform,
    joinedAt: member.joinedAt || serverTimestamp() as Timestamp
  }));

  const balancedPlayers = balanceTeams(players);

  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameState: CloneGameState = {
    gamePhase: 'clone_creation',
    topic: 'General',
    teamAScore: 0,
    teamBScore: 0,
    players: balancedPlayers,
    roundNumber: 1,
    lastUpdated: serverTimestamp() as Timestamp
  };

  await setDoc(cloneGameRef, gameState);

  for (const player of balancedPlayers) {
    await LobbyService.updateMember(roomId, player.id, {
      teamId: player.teamId,
      hasCloneProfile: player.hasCloneProfile,
      cloneInfo: player.cloneInfo
    });
  }

  await updateDoc(roomRef, {
    gameState: 'waiting',
    gameMode: 'clone',
    lastActivity: serverTimestamp()
  });
}

export function balanceTeams(players: ClonePlayer[]): ClonePlayer[] {
  const balancedPlayers = [...players];

  for (let i = balancedPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balancedPlayers[i], balancedPlayers[j]] = [balancedPlayers[j], balancedPlayers[i]];
  }

  balancedPlayers.forEach((player, index) => {
    player.teamId = index % 2 === 0 ? 'A' : 'B';
  });

  return balancedPlayers;
}
