"use client"
import React, { useState, useEffect } from 'react';
import { RedBlueGameService, RedBlueRoom, RedBluePlayer, Round, GamePhase } from '@/services/redblue';
import { determineRedBlueRole, getRoleActionText, getPlayerStatusMessage } from '@/utils/redblueRoles';

/**
 * RedBlue Player App (QR Join)
 * Implements player screens: Join, Profile, Wait/Status, Speaker View, Vote, Result
 */

const TRAIT_OPTIONS = [
  'Sarcastic', 'Funny', 'Thoughtful', 'Energetic', 'Serious',
  'Creative', 'Analytical', 'Adventurous', 'Cautious', 'Optimistic',
  'Practical', 'Spontaneous', 'Organized', 'Laid-back'
];

const RedBluePlayer: React.FC = () => {
  // State management
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [room, setRoom] = useState<RedBlueRoom | null>(null);
  const [player, setPlayer] = useState<RedBluePlayer | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Join state
  const [playerName, setPlayerName] = useState('');

  // Calibration state
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);

  // Speaker state
  const [speakerChoice, setSpeakerChoice] = useState<'AI' | 'Self' | null>(null);
  const [selfAnswer, setSelfAnswer] = useState('');

  // Vote state
  const [voteChoice, setVoteChoice] = useState<'AI' | 'Self' | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Get params from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('roomId');
    const urlPlayerId = urlParams.get('playerId');

    if (urlRoomId) {
      setRoomId(urlRoomId);
    }

    if (urlPlayerId) {
      setPlayerId(urlPlayerId);
    }

    console.log(`🎮 RedBlue Player loaded: Room ${urlRoomId}, Player ${urlPlayerId}`);
  }, []);

  // Listen to room updates
  useEffect(() => {
    if (!roomId) return;

    const unsubscribeRoom = RedBlueGameService.listenToRoom(roomId, (roomData) => {
      setRoom(roomData);
      console.log('📡 Room update:', roomData?.status.phase);

      // Reset vote state when phase changes
      if (roomData?.status.phase !== 'VOTING') {
        setHasVoted(false);
        setVoteChoice(null);
      }
    });

    return unsubscribeRoom;
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

  const handleSubmitTraits = async () => {
    if (!roomId || !playerId) return;
    if (selectedTraits.length < 3) {
      setError('Select at least 3 traits');
      return;
    }

    setIsLoading(true);
    try {
      await RedBlueGameService.submitTraits(roomId, playerId, selectedTraits);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit traits';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitChoice = async () => {
    if (!roomId || !currentRound || !playerId || !speakerChoice) return;

    setIsLoading(true);
    try {
      await RedBlueGameService.submitSpeakerChoice(
        roomId,
        currentRound.id,
        playerId,
        speakerChoice,
        speakerChoice === 'Self' ? selfAnswer : undefined
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit choice';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVote = async (guess: 'AI' | 'Self') => {
    if (!roomId || !currentRound || !playerId) return;

    setIsLoading(true);
    setVoteChoice(guess);
    setHasVoted(true);

    try {
      await RedBlueGameService.submitVote(roomId, currentRound.id, playerId, guess);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote';
      setError(errorMessage);
      setHasVoted(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // SCREEN RENDERING
  // ============================================================================

  const renderJoin = () => (
    <div className="flex flex-col h-full p-6 justify-center">
      <h1 className="text-3xl font-bold mb-8 text-center">Join RedBlue</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg"
          maxLength={20}
        />
      </div>

      <button
        onClick={() => {/* Handle join */}}
        disabled={isLoading || !playerName.trim()}
        className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? 'Joining...' : 'Join'}
      </button>

      {error && <p className="mt-4 text-red-600 text-sm text-center">{error}</p>}
    </div>
  );

  const renderProfile = () => {
    const toggleTrait = (trait: string) => {
      if (selectedTraits.includes(trait)) {
        setSelectedTraits(selectedTraits.filter(t => t !== trait));
      } else if (selectedTraits.length < 7) {
        setSelectedTraits([...selectedTraits, trait]);
      }
    };

    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-gray-600 mb-6">Choose a few that sound like you (3-7)</p>

        <div className="flex-1 overflow-auto mb-6">
          <div className="grid grid-cols-2 gap-3">
            {TRAIT_OPTIONS.map(trait => (
              <button
                key={trait}
                onClick={() => toggleTrait(trait)}
                className={`p-4 rounded-lg font-medium transition-all ${
                  selectedTraits.includes(trait)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border-2 border-gray-300 text-gray-700'
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 text-center text-sm text-gray-600">
          Selected: {selectedTraits.length} / 7
        </div>

        <button
          onClick={handleSubmitTraits}
          disabled={isLoading || selectedTraits.length < 3}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>

        {error && <p className="mt-4 text-red-600 text-sm text-center">{error}</p>}
      </div>
    );
  };

  const renderWaitStatus = () => {
    const phase = room?.status.phase || 'LOBBY';
    const role = determineRedBlueRole(phase, playerId, currentRound);

    return (
      <div className="flex flex-col h-full p-6 justify-center items-center">
        <h1 className="text-3xl font-bold mb-6">RedBlue</h1>

        <div className="text-center mb-8">
          <p className="text-xl text-gray-600 mb-2">Phase</p>
          <p className="text-2xl font-semibold">{phase}</p>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-600">
            {getRoleActionText(role, phase)}
          </p>
        </div>
      </div>
    );
  };

  const renderSpeakerView = () => {
    const isSpeaker = currentRound?.speakerId === playerId;

    if (!isSpeaker) {
      return renderWaitStatus();
    }

    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-3xl font-bold mb-4">Your Turn</h1>
        <p className="text-xl text-gray-600 mb-6">{currentRound?.questionText}</p>

        <div className="flex-1 mb-6">
          {/* Choice buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSpeakerChoice('AI')}
              className={`p-6 rounded-lg font-bold text-xl transition-all ${
                speakerChoice === 'AI'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-700'
              }`}
            >
              AI
            </button>
            <button
              onClick={() => setSpeakerChoice('Self')}
              className={`p-6 rounded-lg font-bold text-xl transition-all ${
                speakerChoice === 'Self'
                  ? 'bg-green-600 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-700'
              }`}
            >
              Self
            </button>
          </div>

          {/* Self answer input */}
          {speakerChoice === 'Self' && (
            <div>
              <label className="block text-sm font-medium mb-2">Your Answer</label>
              <textarea
                value={selfAnswer}
                onChange={(e) => setSelfAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg"
                rows={4}
              />
            </div>
          )}

          {/* AI preview */}
          {speakerChoice === 'AI' && currentRound?.aiAnswer && (
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <p className="text-sm font-medium text-purple-900 mb-2">AI Preview (only you see this):</p>
              <p className="text-lg">{currentRound.aiAnswer}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmitChoice}
          disabled={isLoading || !speakerChoice || (speakerChoice === 'Self' && !selfAnswer.trim())}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>

        {error && <p className="mt-4 text-red-600 text-sm text-center">{error}</p>}
      </div>
    );
  };

  const renderVote = () => {
    const isSpeaker = currentRound?.speakerId === playerId;

    if (isSpeaker) {
      return (
        <div className="flex flex-col h-full p-6 justify-center items-center">
          <h1 className="text-3xl font-bold mb-6">You are the speaker</h1>
          <p className="text-xl text-gray-600">Voting disabled</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Vote</h1>

        <p className="text-xl text-center mb-8">Was that AI or Self?</p>

        <div className="flex-1 flex flex-col gap-6 justify-center">
          <button
            onClick={() => handleSubmitVote('AI')}
            disabled={hasVoted}
            className={`py-12 rounded-lg font-bold text-3xl transition-all ${
              hasVoted && voteChoice === 'AI'
                ? 'bg-purple-600 text-white'
                : hasVoted
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            {hasVoted && voteChoice === 'AI' ? '✓ AI' : 'AI'}
          </button>

          <button
            onClick={() => handleSubmitVote('Self')}
            disabled={hasVoted}
            className={`py-12 rounded-lg font-bold text-3xl transition-all ${
              hasVoted && voteChoice === 'Self'
                ? 'bg-green-600 text-white'
                : hasVoted
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {hasVoted && voteChoice === 'Self' ? '✓ Self' : 'Self'}
          </button>
        </div>

        {hasVoted && (
          <p className="text-center text-lg text-gray-600 mt-6">Vote locked</p>
        )}

        {error && <p className="mt-4 text-red-600 text-sm text-center">{error}</p>}
      </div>
    );
  };

  const renderResult = () => {
    const isSpeaker = currentRound?.speakerId === playerId;
    const wasCorrect = voteChoice === currentRound?.speakerChoice;
    const fooledMajority = currentRound?.result?.fooledMajority || false;

    return (
      <div className="flex flex-col h-full p-6 justify-center items-center">
        <h1 className="text-4xl font-bold mb-8">Result</h1>

        <div className="text-center mb-8">
          <p className="text-xl text-gray-600 mb-2">It was</p>
          <p className="text-6xl font-bold mb-6">{currentRound?.speakerChoice}</p>

          {isSpeaker ? (
            <div>
              <p className="text-2xl">
                {fooledMajority ? "You fooled them! ✨" : "They guessed it!"}
              </p>
              <p className="text-3xl font-bold mt-2">
                {fooledMajority ? "+1 point" : "No points"}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-2xl">
                {wasCorrect ? "You were right! ✅" : "Close! ❌"}
              </p>
              <p className="text-3xl font-bold mt-2">
                {wasCorrect ? "+1 point" : "No points"}
              </p>
            </div>
          )}
        </div>

        <p className="text-lg text-gray-600">Waiting for next round...</p>
      </div>
    );
  };

  // ============================================================================
  // RENDER ROUTER
  // ============================================================================

  const renderCurrentScreen = () => {
    if (!room) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p className="text-xl">Loading...</p>
        </div>
      );
    }

    const phase = room.status.phase;

    // If player hasn't completed calibration, show profile
    if (player && !player.hasCompletedCalibration && phase === 'CALIBRATE') {
      return renderProfile();
    }

    switch (phase) {
      case 'LOBBY':
      case 'CALIBRATE':
      case 'ROUND_INTRO':
      case 'LEADERBOARD':
      case 'END':
        return renderWaitStatus();

      case 'SPEAKER_DECIDE':
        return renderSpeakerView();

      case 'VOTING':
        return renderVote();

      case 'REVEAL':
        return renderResult();

      default:
        return <div className="p-6">Unknown phase: {phase}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {renderCurrentScreen()}
    </div>
  );
};

export default RedBluePlayer;
