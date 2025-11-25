import React from 'react';
import { Robot, Microphone } from '@phosphor-icons/react';
import { SpeakerDecideScreenProps } from '@/types/clone';
import { getErrorMessage } from '@/utils/errorMessages';

export function SpeakerDecideScreen({
  currentRound,
  onChoice,
  loading,
  error
}: SpeakerDecideScreenProps) {
  const isChoiceLocked = currentRound?.speakerChoice !== null;
  const questionText = currentRound?.questionText || currentRound?.question || '';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: isChoiceLocked ? '#0045FF' : '#F9FAFB' }}
    >
      <div className="w-full max-w-md">
        {!isChoiceLocked ? (
          <>
            {/* Title */}
            <h1
              className="mb-12"
              style={{
                fontSize: '48px',
                fontWeight: 700,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              You are the speaker!
            </h1>

            {/* Question Label */}
            <p
              className="mb-4"
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              The question:
            </p>

            {/* Question Box */}
            <div
              className="mb-12 p-6"
              style={{
                backgroundColor: '#FFFFFF',
                border: '3px solid #E5E7EB',
                borderRadius: '16px',
              }}
            >
              <p
                style={{
                  fontSize: '26px',
                  fontWeight: 400,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  lineHeight: 1.5,
                }}
              >
                {questionText}
              </p>
            </div>

            {/* Choice Buttons */}
            <div className="space-y-6">
              <button
                onClick={() => onChoice('AI')}
                disabled={loading}
                className="w-full transition-all flex items-center justify-center gap-4"
                style={{
                  height: '100px',
                  backgroundColor: loading ? '#A8A8AD' : '#0045FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '28px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    <Robot size={40} weight="bold" />
                    AI response
                  </>
                )}
              </button>

              <button
                onClick={() => onChoice('Self')}
                disabled={loading}
                className="w-full transition-all flex items-center justify-center gap-4"
                style={{
                  height: '100px',
                  backgroundColor: loading ? '#A8A8AD' : '#0045FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '28px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    <Microphone size={40} weight="bold" />
                    Make up a response
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Speaking Instructions */}
            <h1
              className="mb-8 text-center"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              Read this question
            </h1>

            {/* Question Box */}
            <div
              className="mb-16 p-8"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '28px',
                  fontWeight: 500,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  lineHeight: 1.4,
                }}
              >
                {questionText}
              </p>
            </div>

            {/* Response instruction */}
            <h1
              className="mb-8 text-center"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              Now say this answer
            </h1>

            {/* AI Response (if applicable) */}
            {currentRound?.speakerChoice === 'AI' && currentRound?.aiAnswerPrivate && (
              <div
                className="p-8"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                }}
              >
                <p
                  style={{
                    fontSize: '28px',
                    fontWeight: 500,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: 1.4,
                  }}
                >
                  {currentRound.aiAnswerPrivate}
                </p>
              </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="mt-6 p-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
            }}
          >
            <p
              className="text-center"
              style={{
                fontWeight: 500,
                fontSize: '20px',
                color: '#FFFFFF',
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
