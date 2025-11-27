'use client';

import { WTSVotingUI } from '@/components/wts/WTSVotingUI';

export default function WTSVotingDemo() {
  // Mock data for demonstration
  const mockPlayers = [
    { id: 'player1', name: 'Alice' },
    { id: 'player2', name: 'Bob' },
    { id: 'player3', name: 'Charlie' },
    { id: 'player4', name: 'Diana' },
    { id: 'player5', name: 'Eve' },
  ];

  const handleVote = (playerId: string) => {
    const player = mockPlayers.find(p => p.id === playerId);
    console.log('Voted for:', player?.name);
    // In the real implementation, this would submit the vote to Firebase
  };

  return (
    <WTSVotingUI
      players={mockPlayers}
      currentPlayerId="player1" // Alice can't vote for herself
      hasVoted={false}
      onVote={handleVote}
    />
  );
}
