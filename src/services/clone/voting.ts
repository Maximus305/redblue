import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CloneGameState } from './types';

export async function submit(roomId: string, playerId: string, vote: 'human' | 'clone'): Promise<void> {
  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameDoc = await getDoc(cloneGameRef);

  if (!gameDoc.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameDoc.data() as CloneGameState;

  if (gameData.gamePhase !== 'voting') {
    throw new Error('Voting is not currently active');
  }

  const currentPlayer = gameData.players.find(p => p.id === playerId);
  if (!currentPlayer) {
    throw new Error('Player not found');
  }

  if (currentPlayer.teamId !== gameData.questioningTeam) {
    throw new Error('Only the questioning team can vote');
  }

  if (playerId === gameData.currentPlayer) {
    throw new Error('The player being questioned cannot vote');
  }

  const votes = gameData.votes || { human: [], clone: [] };
  const playerVotes = gameData.playerVotes || {};

  if (votes.human) votes.human = votes.human.filter(id => id !== playerId);
  if (votes.clone) votes.clone = votes.clone.filter(id => id !== playerId);

  if (!votes[vote]) votes[vote] = [];
  votes[vote].push(playerId);
  playerVotes[playerId] = vote;

  const questioningTeamPlayers = gameData.players.filter(p =>
    p.teamId === gameData.questioningTeam &&
    p.id !== gameData.currentPlayer
  );

  const expectedVoters = questioningTeamPlayers;
  const votesSubmitted = expectedVoters.filter(p => playerVotes[p.id]).length;

  await updateDoc(cloneGameRef, {
    votes,
    playerVotes,
    votesSubmitted,
    totalVoters: expectedVoters.length,
    lastUpdated: serverTimestamp()
  });

  if (votesSubmitted >= expectedVoters.length) {
    setTimeout(async () => {
      await calculateResults(roomId);
    }, 1000);
  }
}

export async function calculateResults(roomId: string): Promise<void> {
  const cloneGameRef = doc(db, 'clone_games', roomId);
  const gameDoc = await getDoc(cloneGameRef);

  if (!gameDoc.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameDoc.data() as CloneGameState;
  const votes = gameData.votes || { human: [], clone: [] };

  const humanVotes = votes.human?.length || 0;
  const cloneVotes = votes.clone?.length || 0;
  const majorityGuess = humanVotes > cloneVotes ? 'human' : 'clone';
  const wasCorrect = (majorityGuess === 'clone') === gameData.usedClone;

  let scoreUpdate = {};
  if (wasCorrect && gameData.questioningTeam) {
    if (gameData.questioningTeam === 'A') {
      scoreUpdate = { teamAScore: (gameData.teamAScore || 0) + 1 };
    } else {
      scoreUpdate = { teamBScore: (gameData.teamBScore || 0) + 1 };
    }
  }

  await updateDoc(cloneGameRef, {
    ...scoreUpdate,
    gamePhase: 'results',
    roundResult: {
      correct: wasCorrect
    },
    lastUpdated: serverTimestamp()
  });
}
