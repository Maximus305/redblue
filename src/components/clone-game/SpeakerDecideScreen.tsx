import React, { useState } from 'react';
import { SpeakerDecideScreenProps } from '@/types/clone';
import { getErrorMessage } from '@/utils/errorMessages';

export function SpeakerDecideScreen({
  currentRound,
  onChoice,
  onOpenVoting,
  loading,
  error
}: SpeakerDecideScreenProps) {
  const [speakStep, setSpeakStep] = useState<'question' | 'response'>('question');
  const isChoiceLocked = currentRound?.speakerChoice !== null;
  const questionText = currentRound?.questionText || currentRound?.question || '';

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-6"
      style={{ backgroundColor: '#0000FF' }}
    >
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center">
        {!isChoiceLocked ? (
          <>
            {/* Title */}
            <h1
              className="mb-4"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              You&apos;re up.
            </h1>

            {/* Instructions */}
            <p
              className="mb-8"
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Read the question out loud, then pick a response.
            </p>

            {/* Question Text */}
            <p
              className="mb-12"
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: 1.4,
              }}
            >
              {questionText}
            </p>

            {/* Choice Buttons - Stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => onChoice('Self')}
                disabled={loading}
                className="w-full transition-all flex flex-col items-center justify-center"
                style={{
                  padding: '24px',
                  backgroundColor: loading ? '#666' : '#FFFFFF',
                  color: '#0000FF',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {loading ? (
                  <span style={{ fontSize: '24px', fontWeight: 700 }}>Loading...</span>
                ) : (
                  <>
                    <span style={{ fontSize: '32px', fontWeight: 900 }}>Self Made</span>
                    <span style={{ fontSize: '20px', fontWeight: 600 }}>Response</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onChoice('AI')}
                disabled={loading}
                className="w-full transition-all flex flex-col items-center justify-center"
                style={{
                  padding: '24px',
                  backgroundColor: '#FFFFFF',
                  color: '#0000FF',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {loading ? (
                  <span style={{ fontSize: '24px', fontWeight: 700 }}>Loading...</span>
                ) : (
                  <>
                    <span style={{ fontSize: '32px', fontWeight: 900 }}>AI</span>
                    <span style={{ fontSize: '20px', fontWeight: 600 }}>Response</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 1: Read the question */}
            {speakStep === 'question' && (
              <div className="flex flex-col justify-center">
                <h1
                  style={{
                    fontSize: '48px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: 1.1,
                    marginBottom: '32px',
                  }}
                >
                  READ THE QUESTION.
                </h1>

                <div
                  className="mb-8 p-6"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    borderRadius: '20px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '24px',
                      fontWeight: 500,
                      color: '#000000',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      lineHeight: 1.4,
                    }}
                  >
                    {questionText}
                  </p>
                </div>

                <button
                  onClick={() => setSpeakStep('response')}
                  className="w-full transition-all"
                  style={{
                    height: '70px',
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '35px',
                    fontSize: '22px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  Next
                </button>
              </div>
            )}

            {/* Step 2: Give the response */}
            {speakStep === 'response' && (
              <div className="flex flex-col justify-center">
                <h1
                  style={{
                    fontSize: '48px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: 1.1,
                    marginBottom: '32px',
                  }}
                >
                  {currentRound?.speakerChoice === 'AI' ? 'SAY THIS ANSWER.' : 'MAKE UP YOUR ANSWER.'}
                </h1>

                {currentRound?.speakerChoice === 'AI' && currentRound?.aiAnswerPrivate && (
                  <div
                    className="mb-8 p-6"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: 'none',
                      borderRadius: '20px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '24px',
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

                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    textAlign: 'center',
                    marginBottom: '24px',
                  }}
                >
                  When you&apos;re done speaking, open voting.
                </p>

                <button
                  onClick={onOpenVoting}
                  disabled={loading}
                  className="w-full transition-all"
                  style={{
                    height: '70px',
                    backgroundColor: loading ? '#666' : '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '35px',
                    fontSize: '22px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {loading ? 'Opening...' : 'Open Voting'}
                </button>
              </div>
            )}
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
