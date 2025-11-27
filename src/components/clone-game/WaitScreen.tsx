import React from 'react';
import { Check, X } from '@phosphor-icons/react';
import { BaseScreenProps } from '@/types/clone';

interface WaitScreenProps extends BaseScreenProps {
  isSpeaker: boolean;
  prepTimeRemaining: number;
}

export function WaitScreen({ me, players, currentRound, room }: WaitScreenProps) {
  // Determine who is the next speaker
  const speakerId = currentRound?.speakerId;
  const speaker = speakerId ? players.find(p => p.id === speakerId) : null;
  const questionText = currentRound?.questionText || currentRound?.question || '';
  const isMeSpeaker = me?.id === speakerId;

  // Check if we're waiting for calibration completion
  const showCalibrationStatus = me?.hasCompletedCalibration === true;

  // If game is over, show game over screen
  if (room?.status.phase === 'END') {
    // Sort players by score to find winner
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = sortedPlayers[0];
    const isWinner = me?.id === winner?.id;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: isWinner ? '#0045FF' : '#F9FAFB' }}
      >
        <div className="w-full max-w-md">
          {/* Winner Announcement */}
          <div className="text-center mb-16">
            <h1
              style={{
                fontSize: '120px',
                fontWeight: 900,
                color: isWinner ? '#FFFFFF' : '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                marginBottom: '16px',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {isWinner ? 'YOU' : winner?.name.toUpperCase()}
            </h1>
            <h2
              style={{
                fontSize: '120px',
                fontWeight: 900,
                color: isWinner ? '#FFFFFF' : '#0045FF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                marginBottom: '24px',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              WON!
            </h2>

            {/* Points Display */}
            <div
              style={{
                backgroundColor: isWinner ? '#FFFFFF' : '#0045FF',
                borderRadius: '24px',
                padding: '24px',
                display: 'inline-block',
              }}
            >
              <p
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: isWinner ? '#0045FF' : '#FFFFFF',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  margin: 0,
                }}
              >
                {isWinner ? me?.score || 0 : winner?.score || 0} {((isWinner ? me?.score : winner?.score) || 0) === 1 ? 'point' : 'points'}
              </p>
            </div>
          </div>

          {/* Final Scores */}
          <div>
            <h3
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: isWinner ? '#FFFFFF' : '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              Final Scores
            </h3>
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => {
                const isMe = player.id === me?.id;
                const isFirst = index === 0;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between"
                    style={{
                      backgroundColor: isMe ? (isWinner ? '#FFFFFF' : '#0045FF') : (isWinner ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF'),
                      border: isFirst && !isMe ? `3px solid ${isWinner ? '#FFFFFF' : '#0045FF'}` : (!isMe && !isWinner ? '3px solid #E5E7EB' : 'none'),
                      borderRadius: '20px',
                      padding: isFirst ? '20px 24px' : '16px 24px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: isFirst ? '28px' : '24px',
                        fontWeight: isFirst ? 700 : 600,
                        color: isMe ? (isWinner ? '#0045FF' : '#FFFFFF') : (isWinner ? '#FFFFFF' : '#000000'),
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
                    >
                      {index + 1}. {player.name}{isMe ? ' - You' : ''}
                    </span>
                    <span
                      style={{
                        fontSize: isFirst ? '32px' : '28px',
                        fontWeight: 900,
                        color: isMe ? (isWinner ? '#0045FF' : '#FFFFFF') : (isWinner ? '#FFFFFF' : '#000000'),
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

  // If speaker is waiting for others to vote
  if (room?.status.phase === 'VOTING' && isMeSpeaker) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="w-full max-w-md text-center">
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            They are voting now.
          </h1>
        </div>
      </div>
    );
  }

  // If there's a speaker assigned (during speaking phase), show listening/speaking screen
  const isActiveRoundWithSpeaker = speaker && currentRound && (
    questionText ||
    room?.status.phase === 'SPEAKER_DECIDE' ||
    room?.status.phase === 'ROUND_INTRO' ||
    currentRound.speakerId
  );

  if (isActiveRoundWithSpeaker) {
    const isMeSpeaker = me?.id === speaker.id;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="w-full max-w-md text-center">
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {isMeSpeaker ? "You're about to speak." : `${speaker.name} is about to speak.`}
          </h1>
        </div>
      </div>
    );
  }

  // Otherwise show lobby (waiting to start or waiting for calibration)
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="w-full max-w-md">
        {/* Message */}
        <p
          className="text-center mb-6"
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#000000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {showCalibrationStatus
            ? 'Waiting for others to complete Questions.'
            : 'Waiting for Host to start.'}
        </p>

        {/* Player List */}
        <div className="space-y-3">
          {players.map((player) => {
            const isMe = player.id === me?.id;
            const hasCompleted = player.hasCompletedCalibration;

            return (
              <div
                key={player.id}
                className="flex items-center justify-between"
                style={{
                  backgroundColor: isMe ? '#0045FF' : '#FFFFFF',
                  border: isMe ? 'none' : '3px solid #E5E7EB',
                  borderRadius: '20px',
                  padding: '14px 20px',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 500,
                    color: isMe ? '#FFFFFF' : '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {player.name}{isMe ? ' - You' : ''}
                </span>

                {/* Show checkmark or X if in calibration status mode */}
                {showCalibrationStatus && (
                  hasCompleted ? (
                    <Check
                      size={32}
                      weight="bold"
                      color={isMe ? '#FFFFFF' : '#0045FF'}
                    />
                  ) : (
                    <X
                      size={32}
                      weight="bold"
                      color={isMe ? '#FFFFFF' : '#DC2626'}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
