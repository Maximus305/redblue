import React from 'react';
import { BaseScreenProps } from '@/types/clone';

export interface LeaderboardScreenProps extends BaseScreenProps {
  isSpeaker?: boolean;
}

export function LeaderboardScreen({ players, me }: LeaderboardScreenProps) {
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myPosition = sortedPlayers.findIndex((p) => p.id === me?.id);
  const winner = sortedPlayers[0];

  // Determine if current player won
  const didWin = myPosition === 0 && sortedPlayers.length > 1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#0000FF' }}
    >
      <div className="w-full max-w-md">
        {/* Winner Announcement */}
        <div className="text-center mb-12">
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 900,
              color: '#FFFFFF',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}
          >
            {didWin ? 'YOU WON!' : `${winner?.name || 'Winner'} won!`}
          </h1>
          <p
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {winner?.score || 0} {(winner?.score || 0) === 1 ? 'point' : 'points'}
          </p>
        </div>

        {/* Final Scores */}
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === me?.id;

            return (
              <div
                key={player.id}
                className="flex items-center justify-between"
                style={{
                  backgroundColor: isMe ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: isMe ? '#000000' : '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {index + 1}. {player.name}{isMe ? ' (You)' : ''}
                </span>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: isMe ? '#000000' : '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {player.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
