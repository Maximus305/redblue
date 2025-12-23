import React from 'react';
import { ResultScreenProps } from '@/types/clone';
import { typography } from '@/styles/clone-theme';

export function ResultScreen({ currentRound, myVote, isSpeaker, players, me }: ResultScreenProps) {
  const wasCorrect = myVote === currentRound?.speakerChoice;
  const fooledMajority = currentRound?.result?.fooledMajority || false;

  // Get message
  const getMessage = () => {
    if (isSpeaker) {
      return fooledMajority ? 'YES!' : 'NOPE';
    } else {
      return wasCorrect ? 'YES!' : 'NOPE';
    }
  };

  const getSubtext = () => {
    if (isSpeaker) {
      return fooledMajority ? 'You fooled them!' : 'They got it right';
    } else {
      return wasCorrect ? 'You were right!' : 'You were wrong';
    }
  };

  const getPoints = () => {
    if (isSpeaker) {
      return fooledMajority ? '+1' : '+0';
    } else {
      return wasCorrect ? '+1' : '+0';
    }
  };

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div
      className="min-h-screen flex flex-col p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      {/* Main Result */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Points */}
        <p
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#000000',
            fontFamily: typography.fontFamily,
            marginBottom: '16px',
          }}
        >
          {getPoints()}
        </p>

        {/* Result Message */}
        <h1
          style={{
            fontSize: '120px',
            fontWeight: 900,
            color: '#0000FF',
            fontFamily: typography.fontFamily,
            lineHeight: 1,
            marginBottom: '16px',
          }}
        >
          {getMessage()}
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: '#6B7280',
            fontFamily: typography.fontFamily,
          }}
        >
          {getSubtext()}
        </p>
      </div>

      {/* Scores at Bottom - Horizontal Scroll */}
      <div style={{ width: '100%' }}>
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#6B7280',
            fontFamily: typography.fontFamily,
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          Current Scores
        </p>
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '8px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              paddingLeft: '24px',
              paddingRight: '24px',
              width: 'max-content',
            }}
          >
          {sortedPlayers.map((player) => {
            const isMe = player.id === me?.id;
            return (
              <div
                key={player.id}
                style={{
                  backgroundColor: isMe ? '#0000FF' : '#FFFFFF',
                  border: isMe ? 'none' : '2px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isMe ? '#FFFFFF' : '#000000',
                    fontFamily: typography.fontFamily,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {player.name}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: isMe ? '#FFFFFF' : '#000000',
                    fontFamily: typography.fontFamily,
                  }}
                >
                  {player.score || 0}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
