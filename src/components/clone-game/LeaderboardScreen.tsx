import React, { useState, useEffect } from 'react';
import { BaseScreenProps } from '@/types/clone';

export interface LeaderboardScreenProps extends BaseScreenProps {
  isSpeaker?: boolean;
}

const BACKGROUND_COLORS = [
  '#0045FF', // Blue
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Light Yellow
  '#A8E6CF', // Green
  '#FF8B94', // Pink
  '#C7CEEA', // Lavender
];

export function LeaderboardScreen({ players, me }: LeaderboardScreenProps) {
  const [colorIndex, setColorIndex] = useState(0);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myPosition = sortedPlayers.findIndex((p) => p.id === me?.id);
  const myScore = me?.score || 0;

  // Determine if current player won
  const didWin = myPosition === 0 && sortedPlayers.length > 1;

  // Cycle through colors only if player won
  useEffect(() => {
    if (!didWin) return;

    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % BACKGROUND_COLORS.length);
    }, 800);

    return () => clearInterval(interval);
  }, [didWin]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-700"
      style={{ backgroundColor: didWin ? BACKGROUND_COLORS[colorIndex] : '#0045FF' }}
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Win/Result Message */}
        <h1
          className="text-center"
          style={{
            fontSize: '96px',
            fontWeight: 900,
            color: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {didWin ? 'YOU WON!' : sortedPlayers[0]?.name ? `${sortedPlayers[0].name.toUpperCase()} WON!` : 'GAME OVER'}
        </h1>

        {/* Player's Score */}
        <div
          className="p-6 text-center mx-auto"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '400px',
          }}
        >
          <p
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#0045FF',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {myScore} {myScore === 1 ? 'point' : 'points'}
          </p>
        </div>

        {/* Final Scores Title */}
        <h2
          className="text-center"
          style={{
            fontSize: '40px',
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Final Scores
        </h2>

        {/* Leaderboard */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === me?.id;

            return (
              <div
                key={player.id}
                className="p-6 flex items-center justify-between"
                style={{
                  backgroundColor: isMe ? '#FFFFFF' : 'rgba(100, 116, 255, 0.5)',
                  borderRadius: '24px',
                }}
              >
                {/* Left side: Position + Name */}
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 600,
                    color: isMe ? '#0045FF' : '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {index + 1}. {player.name}
                  {isMe && ' - You'}
                </span>

                {/* Right side: Score */}
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: isMe ? '#0045FF' : '#FFFFFF',
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
