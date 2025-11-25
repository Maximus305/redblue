import React from 'react';
import { ResultScreenProps } from '@/types/clone';
import { typography } from '@/styles/clone-theme';

export function ResultScreen({ currentRound, myVote, isSpeaker }: ResultScreenProps) {
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
      return fooledMajority ? 'You fooled them!' : 'You were wrong';
    } else {
      return wasCorrect ? 'You were right!' : 'You were wrong';
    }
  };

  const getPoints = () => {
    if (isSpeaker) {
      return fooledMajority ? '+1 points' : '+0 points';
    } else {
      return wasCorrect ? '+1 points' : '+0 points';
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto">
        {/* Result Message */}
        <h1
          className="text-center mb-4"
          style={{
            fontSize: '96px',
            fontWeight: 900,
            color: '#000000',
            fontFamily: typography.fontFamily,
            lineHeight: 1,
          }}
        >
          {getMessage()}
        </h1>

        {/* Subtext */}
        <p
          className="text-center mb-8"
          style={{
            fontSize: '20px',
            fontWeight: 400,
            color: '#000000',
            fontFamily: typography.fontFamily,
          }}
        >
          {getSubtext()}
        </p>

        {/* Points */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: '#000000',
            fontFamily: typography.fontFamily,
          }}
        >
          {getPoints()}
        </div>
      </div>
    </div>
  );
}
