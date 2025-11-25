import React, { useState } from 'react';
import { CalibrationScreenProps } from '@/types/clone';
import { getErrorMessage } from '@/utils/errorMessages';

export function CalibrationScreen({
  questions,
  answers,
  setAnswers,
  onSubmit,
  loading,
  error
}: CalibrationScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const allAnswered = Object.keys(answers).length === questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const hasAnsweredCurrent = currentQuestionIndex in answers;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (allAnswered) {
      onSubmit();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="w-full max-w-md" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Question {currentQuestionIndex + 1}/{questions.length}
          </h2>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="flex-1 flex flex-col">
            <p
              className="mb-6"
              style={{
                fontSize: '24px',
                fontWeight: 400,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: 1.5,
              }}
            >
              {currentQuestion.text}
            </p>

            <div className="space-y-3 mb-6">
              {currentQuestion.choices.map((choice: string, choiceIndex: number) => {
                const isSelected = answers[currentQuestionIndex] === choiceIndex;

                return (
                  <button
                    key={choiceIndex}
                    onClick={() => {
                      setAnswers({
                        ...answers,
                        [currentQuestionIndex]: choiceIndex,
                      });
                    }}
                    className="w-full text-center transition-all"
                    style={{
                      backgroundColor: isSelected ? '#0045FF' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#000000',
                      border: isSelected ? '3px solid #0045FF' : '3px solid #E5E7EB',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      fontSize: '24px',
                      fontWeight: 400,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      cursor: 'pointer',
                    }}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-6 p-3"
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

            {/* Next Button */}
            <button
              onClick={handleNext}
              disabled={!hasAnsweredCurrent || loading}
              className="w-full transition-all mt-auto"
              style={{
                height: '80px',
                backgroundColor: hasAnsweredCurrent && !loading ? '#0045FF' : '#A8A8AD',
                color: '#FFFFFF',
                borderRadius: '40px',
                fontSize: '28px',
                fontWeight: 600,
                border: 'none',
                cursor: hasAnsweredCurrent && !loading ? 'pointer' : 'not-allowed',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {loading ? 'Submitting...' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
