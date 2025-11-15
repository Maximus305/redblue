"use client"
import React, { useState, useEffect } from 'react';
import { RedBlueGameService, RedBlueRoom, RedBluePlayer, Round, GamePhase } from '@/services/redblue';
import { determineRedBlueRole, getPhaseDescription } from '@/utils/redblueRoles';

/**
 * RedBlue Host App (iPhone)
 * Implements all host screens: Lobby, Calibration Monitor, Round Intro,
 * Speaker Status, Voting Dashboard, Reveal, Leaderboard, End/Recap
 */

const RedBlueHost: React.FC = () => {
  // State management
  const [roomId, setRoomId] = useState<string>('');
  const [room, setRoom] = useState<RedBlueRoom | null>(null);
  const [players, setPlayers] = useState<RedBluePlayer[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get params from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('roomId');

    if (urlRoomId) {
      setRoomId(urlRoomId);
      console.log(`🎮 RedBlue Host loaded: Room ${urlRoomId}`);
    }
  }, []);

  // Listen to room updates
  useEffect(() => {
    if (!roomId) return;

    const unsubscribeRoom = RedBlueGameService.listenToRoom(roomId, (roomData) => {
      setRoom(roomData);
      console.log('📡 Room update:', roomData?.status.phase);
    });

    const unsubscribePlayers = RedBlueGameService.listenToPlayers(roomId, (playerData) => {
      setPlayers(playerData);
      console.log('👥 Players update:', playerData.length, 'players');
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId]);

  // Listen to current round
  useEffect(() => {
    if (!roomId || !room?.status.currentRoundId) return;

    const unsubscribeRound = RedBlueGameService.listenToRound(
      roomId,
      room.status.currentRoundId,
      (roundData) => {
        setCurrentRound(roundData);
        console.log('🎯 Round update:', roundData);
      }
    );

    return unsubscribeRound;
  }, [roomId, room?.status.currentRoundId]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleStartCalibration = async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      await RedBlueGameService.startCalibration(roomId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start calibration';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRound = async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      await RedBlueGameService.startRound(roomId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start round';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSpeakerDecide = async () => {
    if (!roomId || !currentRound) return;
    setIsLoading(true);
    try {
      await RedBlueGameService.openSpeakerDecide(roomId, currentRound.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open speaker decide';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenVoting = async () => {
    if (!roomId || !currentRound) return;
    setIsLoading(true);
    try {
      await RedBlueGameService.openVoting(roomId, currentRound.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open voting';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseVoting = async () => {
    if (!roomId || !currentRound) return;
    setIsLoading(true);
    try {
      await RedBlueGameService.closeVotingAndTally(roomId, currentRound.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close voting';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      await RedBlueGameService.nextOrEnd(roomId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to advance';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // SCREEN RENDERING
  // ============================================================================

  const renderLobby = () => (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-3xl font-bold mb-6">RedBlue - Lobby</h1>

      {/* QR Code placeholder */}
      <div className="bg-gray-100 h-64 mb-6 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">QR Code Here</p>
          <p className="text-sm text-gray-600">Room: {roomId}</p>
        </div>
      </div>

      {/* Player list */}
      <div className="mb-6 flex-1 overflow-auto">
        <h2 className="text-xl font-semibold mb-3">Players ({players.length})</h2>
        {players.map(player => (
          <div key={player.id} className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 shadow-sm">
            <span className="font-medium">{player.name}</span>
            {player.hasCompletedCalibration && <span className="text-green-600">✓</span>}
          </div>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={handleStartCalibration}
        disabled={isLoading || players.length < (room?.settings.minPlayers || 3)}
        className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? 'Starting...' : 'Start Calibration'}
      </button>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
    </div>
  );

  const renderCalibrationMonitor = () => {
    const completedCount = players.filter(p => p.hasCompletedCalibration).length;
    const progress = players.length > 0 ? (completedCount / players.length) * 100 : 0;

    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-3xl font-bold mb-6">Calibration</h1>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Progress</span>
            <span>{completedCount} / {players.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Player status */}
        <div className="flex-1 overflow-auto mb-6">
          {players.map(player => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-white rounded-lg mb-2">
              <span>{player.name}</span>
              <span className={player.hasCompletedCalibration ? 'text-green-600' : 'text-gray-400'}>
                {player.hasCompletedCalibration ? '✓ Done' : 'In progress...'}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleStartRound}
          disabled={isLoading || completedCount < players.length}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Starting...' : 'Start Round'}
        </button>
      </div>
    );
  };

  const renderRoundIntro = () => {
    const speaker = players.find(p => p.id === currentRound?.speakerId);

    return (
      <div className="flex flex-col h-full p-6 justify-center items-center">
        <h1 className="text-4xl font-bold mb-8">Up Next:</h1>
        <p className="text-6xl mb-8">{speaker?.name || '...'}</p>
        <p className="text-2xl text-gray-600 mb-12">{currentRound?.questionText}</p>

        <button
          onClick={handleOpenSpeakerDecide}
          disabled={isLoading}
          className="py-4 px-12 bg-blue-600 text-white rounded-lg font-semibold text-xl"
        >
          {isLoading ? 'Loading...' : 'Send to Speaker'}
        </button>
      </div>
    );
  };

  const renderSpeakerStatus = () => {
    const speaker = players.find(p => p.id === currentRound?.speakerId);

    return (
      <div className="flex flex-col h-full p-6 justify-center items-center">
        <h1 className="text-3xl font-bold mb-6">Waiting for {speaker?.name}</h1>
        <div className="text-xl mb-8">
          {currentRound?.speakerChoice
            ? `Choice: ${currentRound.speakerChoice}`
            : 'Choosing AI or Self...'}
        </div>

        <button
          onClick={handleOpenVoting}
          disabled={isLoading || !currentRound?.speakerChoice}
          className="py-4 px-12 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Opening...' : 'Open Voting'}
        </button>
      </div>
    );
  };

  const renderVotingDashboard = () => {
    // In real app, fetch vote count from subcollection
    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-3xl font-bold mb-6">Voting</h1>

        <div className="text-center text-8xl font-bold mb-6">
          {room?.status.voteDeadline ? '25s' : '0s'}
        </div>

        <div className="mb-6 flex-1">
          <p className="text-xl mb-4">Votes in: 0 / {players.length - 1}</p>
          {/* Voter status list */}
        </div>

        <button
          onClick={handleCloseVoting}
          disabled={isLoading}
          className="w-full py-4 bg-red-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? 'Closing...' : 'Close Voting'}
        </button>
      </div>
    );
  };

  const renderReveal = () => {
    return (
      <div className="flex flex-col h-full p-6 justify-center items-center">
        <h1 className="text-4xl font-bold mb-8">Results</h1>

        <div className="mb-8">
          <p className="text-2xl mb-2">Majority voted:</p>
          <p className="text-6xl font-bold">{currentRound?.result?.majority || 'Tie'}</p>
        </div>

        <div className="mb-8">
          <p className="text-2xl mb-2">It was actually:</p>
          <p className="text-6xl font-bold">{currentRound?.speakerChoice || '...'}</p>
        </div>

        <button
          onClick={handleNext}
          disabled={isLoading}
          className="py-4 px-12 bg-blue-600 text-white rounded-lg font-semibold text-xl"
        >
          {isLoading ? 'Loading...' : 'Next'}
        </button>
      </div>
    );
  };

  const renderLeaderboard = () => {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

        <div className="flex-1 overflow-auto mb-6">
          {sortedPlayers.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-white rounded-lg mb-2 shadow">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-400">{index + 1}</span>
                <span className="text-xl font-semibold">{player.name}</span>
              </div>
              <span className="text-2xl font-bold">{player.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={isLoading}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold"
        >
          {isLoading ? 'Loading...' : 'End Game'}
        </button>
      </div>
    );
  };

  const renderEnd = () => (
    <div className="flex flex-col h-full p-6 justify-center items-center">
      <h1 className="text-5xl font-bold mb-8">Game Over!</h1>
      <p className="text-2xl mb-12">Thanks for playing RedBlue</p>

      <button
        onClick={() => window.location.reload()}
        className="py-4 px-12 bg-blue-600 text-white rounded-lg font-semibold text-xl"
      >
        Play Again
      </button>
    </div>
  );

  // ============================================================================
  // RENDER ROUTER
  // ============================================================================

  const renderCurrentScreen = () => {
    if (!room) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p className="text-xl">Loading room...</p>
        </div>
      );
    }

    const phase = room.status.phase;

    switch (phase) {
      case 'LOBBY':
        return renderLobby();
      case 'CALIBRATE':
        return renderCalibrationMonitor();
      case 'ROUND_INTRO':
        return renderRoundIntro();
      case 'SPEAKER_DECIDE':
        return renderSpeakerStatus();
      case 'VOTING':
        return renderVotingDashboard();
      case 'REVEAL':
        return renderReveal();
      case 'LEADERBOARD':
        return renderLeaderboard();
      case 'END':
        return renderEnd();
      default:
        return <div className="p-6">Unknown phase: {phase}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {renderCurrentScreen()}
    </div>
  );
};

export default RedBlueHost;
