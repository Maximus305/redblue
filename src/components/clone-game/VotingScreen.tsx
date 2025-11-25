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
  const speakerName = speaker?.name || 'the speaker';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="w-full max-w-md">
        {!hasVoted ? (
          <>
            {/* Title */}
            <h1
              className="mb-8"
              style={{
                fontSize: '42px',
                fontWeight: 700,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Who&apos;s response was this?
            </h1>

            {/* Vote Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => onVote('AI')}
                className="w-full transition-all"
                style={{
                  height: '100px',
                  backgroundColor: '#0045FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50px',
                  fontSize: '28px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                AI response
              </button>

              <button
                onClick={() => onVote('Self')}
                className="w-full transition-all"
                style={{
                  height: '100px',
                  backgroundColor: '#0045FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50px',
                  fontSize: '28px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {speakerName}&apos;s
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Voted Confirmation */}
            <h1
              className="text-center mb-4"
              style={{
                fontSize: '52px',
                fontWeight: 700,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Voted!
            </h1>
            <p
              className="text-center"
              style={{
                fontSize: '28px',
                fontWeight: 400,
                color: '#666666',
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
