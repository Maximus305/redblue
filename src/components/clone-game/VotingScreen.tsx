import React from 'react';
import { VotingScreenProps } from '@/types/clone';
import { getErrorMessage } from '@/utils/errorMessages';

export function VotingScreen({
  currentRound,
  hasVoted,
  onVote,
  error,
  players
}: VotingScreenProps) {
  const speakerId = currentRound?.speakerId;
  const speaker = speakerId ? players.find(p => p.id === speakerId) : null;
  const speakerName = speaker?.name || 'Speaker';

  return (
    <div
      className="min-h-screen flex flex-col justify-center p-6"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="w-full max-w-lg mx-auto">
        {!hasVoted ? (
          <>
            {/* Title */}
            <h1
              className="mb-6"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#0000FF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Was that...
            </h1>

            {/* Subtitle */}
            <p
              className="mb-20"
              style={{
                fontSize: '24px',
                fontWeight: 500,
                color: 'rgba(0,0,255,0.7)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {speakerName}&apos;s real answer or AI?
            </p>

            {/* Vote Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => onVote('Self')}
                className="w-full transition-all flex flex-col items-center justify-center"
                style={{
                  height: '160px',
                  backgroundColor: '#0000FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                <span style={{ fontSize: '40px', fontWeight: 900 }}>Self Made</span>
                <span style={{ fontSize: '24px', fontWeight: 600 }}>Response</span>
              </button>

              <button
                onClick={() => onVote('AI')}
                className="w-full transition-all flex flex-col items-center justify-center"
                style={{
                  height: '160px',
                  backgroundColor: 'transparent',
                  color: '#0000FF',
                  border: '3px solid #0000FF',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                <span style={{ fontSize: '40px', fontWeight: 900 }}>AI</span>
                <span style={{ fontSize: '24px', fontWeight: 600 }}>Response</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Voted Confirmation */}
            <h1
              className="mb-4"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#0000FF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Vote locked in.
            </h1>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 500,
                color: 'rgba(0,0,255,0.7)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Waiting for others...
            </p>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="mt-6 p-3"
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: '12px',
            }}
          >
            <p
              className="text-center"
              style={{
                fontWeight: 500,
                fontSize: '20px',
                color: '#DC2626',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {getErrorMessage(error)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
