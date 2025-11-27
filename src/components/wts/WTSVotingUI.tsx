'use client';

import React, { useState } from 'react';
import { Check } from '@phosphor-icons/react';

interface Player {
  id: string;
  name: string;
}

interface WTSVotingUIProps {
  players: Player[];
  currentPlayerId?: string;
  hasVoted?: boolean;
  onVote?: (playerId: string) => void;
}

export function WTSVotingUI({ players, currentPlayerId, hasVoted = false, onVote }: WTSVotingUIProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handlePlayerClick = (playerId: string) => {
    if (!hasVoted) {
      setSelectedPlayerId(playerId);
    }
  };

  const handleSubmit = () => {
    if (selectedPlayerId && onVote) {
      onVote(selectedPlayerId);
    }
  };

  // Filter out current player from the list
  const votablePlayers = players.filter(p => p.id !== currentPlayerId);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#FDD804' }}
    >
      <div className="w-full max-w-md">
        {!hasVoted ? (
          <>
            {/* Title Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.5px',
                }}>
                  VOTING-{Math.floor(Math.random() * 9000 + 1000)}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.5px',
                }}>
                  MISSION-CRITICAL
                </span>
              </div>
              <h1
                className="text-center"
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  marginBottom: '8px',
                }}
              >
                WHO IS THE SPY?
              </h1>
              <p
                className="text-center"
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                Select a player to vote
              </p>
            </div>

            {/* Player Cards */}
            <div className="space-y-3 mb-6">
              {votablePlayers.map((player) => {
                const isSelected = selectedPlayerId === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    className="w-full p-6 transition-all"
                    style={{
                      backgroundColor: isSelected ? '#FDD804' : '#000000',
                      border: isSelected ? '3px solid #000000' : 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: isSelected ? '#000000' : '#FDD804',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
                    >
                      {player.name}
                    </span>
                    {isSelected && (
                      <Check
                        size={32}
                        weight="bold"
                        color="#000000"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedPlayerId}
              className="w-full transition-all"
              style={{
                backgroundColor: selectedPlayerId ? '#000000' : '#666666',
                color: '#FDD804',
                border: 'none',
                borderRadius: '100px',
                fontSize: '24px',
                fontWeight: 900,
                cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                padding: '20px 0',
                opacity: selectedPlayerId ? 1 : 0.5,
              }}
            >
              SUBMIT VOTE
            </button>
          </>
        ) : (
          <>
            {/* Voted Confirmation */}
            <div className="text-center">
              <div className="flex justify-between items-center mb-4">
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.5px',
                }}>
                  CONFIRMED-{Math.floor(Math.random() * 9000 + 1000)}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.5px',
                }}>
                  STANDBY
                </span>
              </div>
              <h1
                className="mb-4"
                style={{
                  fontSize: '72px',
                  fontWeight: 900,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                VOTED!
              </h1>
              <p
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#000000',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                Waiting for others...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
