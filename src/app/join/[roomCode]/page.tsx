"use client"
import React, { useState, useEffect, use } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  collection
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { validateRoomId, formatRoomId, tryJoinRoom } from '@/utils/roomUtils';

// ============================================================================
// TYPES
// ============================================================================

type GamePhase = 'LOBBY' | 'CALIBRATE' | 'ROUND_INTRO' | 'SPEAKER_DECIDE' | 'VOTING' | 'REVEAL' | 'LEADERBOARD' | 'END';
type ErrorCode = 'ROOM_NOT_FOUND' | 'ROOM_CLOSED' | 'ROOM_FULL' | 'PERMISSION_DENIED' | 'PHASE_INVALID' | 'DEADLINE_PASSED' | 'ALREADY_SET' | 'VERSION_MISMATCH';

interface CalibrationQuestion {
  id: string;
  text: string;
  choices: string[];
  choiceTraits: string[][];
  tags: string[];
  difficulty: string;
}

interface Room {
  roomCode: string;
  status: {
    phase: GamePhase;
    roundIndex: number;
    voteDeadline?: Timestamp | null;
    currentRoundId?: string | null;
  };
  settings: {
    maxPlayers?: number;
  };
  active?: boolean;
  topicPack?: string;
}

interface Player {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  traits: string[];
  score: number;
  joinedAt: Timestamp;
}

interface Round {
  id: string;
  speakerId: string;
  questionText: string;
  speakerChoice: 'AI' | 'Self' | null;
  aiAnswerPrivate?: string | null;
  aiAnswerPrivateFor?: string | null;
  aiAnswer?: string | null;
  selfAnswer?: string | null;
  voteDeadline?: Timestamp | null;
  tally?: { AI: number; Self: number } | null;
  result?: {
    majority: 'AI' | 'Self' | 'Tie';
    fooledMajority: boolean;
  } | null;
}

// Color options for RB-A
const COLOR_OPTIONS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface JoinPageProps {
  params: Promise<{ roomCode: string }>;
}

export default function RedBlueJoinPage({ params }: JoinPageProps) {
  const resolvedParams = use(params);
  const roomCodeParam = resolvedParams.roomCode;

  // Normalize room code to lowercase with dash
  const roomCode = formatRoomId(roomCodeParam);

  // State - exactly 3 subscriptions
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);

  // Local player state
  const [myId, setMyId] = useState<string>('');
  const [me, setMe] = useState<Player | null>(null);

  // UI state
  const [error, setError] = useState<ErrorCode | string>('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Join screen (RB-A) state
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  // Profile screen (RB-B) state - NEW: Multiple choice calibration
  const [calibrationQuestions, setCalibrationQuestions] = useState<CalibrationQuestion[]>([]);
  const [calibrationAnswers, setCalibrationAnswers] = useState<Record<number, number>>({});  // questionIndex -> choiceIndex

  // Speaker screen (RB-D) state
  const [speakerChoice, setSpeakerChoice] = useState<'AI' | 'Self' | null>(null);
  const [selfAnswer, setSelfAnswer] = useState('');

  // Vote screen (RB-E) state
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<'AI' | 'Self' | null>(null);

  // Derived flags
  const isSpeaker = currentRound && me ? currentRound.speakerId === me.id : false;
  const isVotingOpen =
    room?.status.phase === 'VOTING' &&
    currentRound?.voteDeadline &&
    Timestamp.now().toMillis() <= currentRound.voteDeadline.toMillis();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Check if already joined
  useEffect(() => {
    const storedId = localStorage.getItem(`playerId_${roomCode}`);
    if (storedId) {
      setMyId(storedId);
    }
  }, [roomCode]);

  // Verify room exists (Repo B spec v3.4 - sign in BEFORE any read)
  useEffect(() => {
    if (!validateRoomId(roomCode)) {
      setError('ROOM_NOT_FOUND');
      setVerifying(false);
      return;
    }

    const verifyRoom = async () => {
      try {
        // Sign in anonymously BEFORE reading (Repo B requirement)
        if (!auth.currentUser) {
          await signInAnonymously(auth);
          console.log('🔐 Signed in anonymously');
        }

        // Use tryJoinRoom helper (Repo B spec - Appendix A)
        const { room: roomData } = await tryJoinRoom(roomCode);

        // Repo B v3.4: Tolerant to missing active field
        // Falls back to checking phase !== 'END'
        const isActive = roomData.active ?? (roomData.status?.phase && roomData.status.phase !== 'END');

        if (roomData.active === false) {
          // Explicitly closed
          setError('ROOM_CLOSED');
          setVerifying(false);
          return;
        }

        if (!isActive) {
          // Game ended or inactive
          setError('ROOM_CLOSED');
          setVerifying(false);
          return;
        }

        setRoom(roomData as Room);
        setVerifying(false);
      } catch (err) {
        console.error('Error verifying room:', err);
        setError(err instanceof Error ? err.message : 'ROOM_NOT_FOUND');
        setVerifying(false);
      }
    };

    verifyRoom();
  }, [roomCode]);

  // ============================================================================
  // SUBSCRIPTIONS (exactly 3)
  // ============================================================================

  // 1. Room subscription (NO room in dependencies to avoid infinite loop!)
  useEffect(() => {
    if (!roomCode || verifying) return;

    const roomRef = doc(db, 'rooms', roomCode);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom(snapshot.data() as Room);
      }
    });

    return unsubscribe;
  }, [roomCode, verifying]);

  // 2. Players subscription (NO room in dependencies!)
  useEffect(() => {
    if (!roomCode || verifying) return;

    const playersRef = collection(db, 'rooms', roomCode, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playersList: Player[] = [];
      snapshot.forEach((doc) => {
        playersList.push(doc.data() as Player);
      });
      setPlayers(playersList);

      // Update me
      if (myId) {
        const myData = playersList.find(p => p.id === myId);
        setMe(myData || null);
      }
    });

    return unsubscribe;
  }, [roomCode, verifying, myId]);

  // 3. Current round subscription (only when currentRoundId is set)
  useEffect(() => {
    if (!roomCode || !room?.status.currentRoundId) {
      setCurrentRound(null);
      return;
    }

    const roundRef = doc(db, 'rooms', roomCode, 'rounds', room.status.currentRoundId);
    const unsubscribe = onSnapshot(roundRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentRound(snapshot.data() as Round);
      } else {
        setCurrentRound(null);
      }
    });

    return unsubscribe;
  }, [roomCode, room?.status.currentRoundId]);

  // Reset vote state when round changes
  useEffect(() => {
    setHasVoted(false);
    setMyVote(null);
  }, [currentRound?.id]);

  // Load calibration questions on mount
  useEffect(() => {
    const loadCalibrationQuestions = async () => {
      try {
        const response = await import('@/data/questions/calibrationQuestions.json');
        const questions = response.default || response;
        // Take first 3 questions for calibration
        setCalibrationQuestions(questions.slice(0, 3));
      } catch (error) {
        console.error('Error loading calibration questions:', error);
        setCalibrationQuestions([]);
      }
    };

    loadCalibrationQuestions();
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Ensure authenticated (Repo B requirement)
      if (!auth.currentUser) {
        await signInAnonymously(auth);
        console.log('🔐 Signed in anonymously for join');
      }

      // Check if room is full
      if (room?.settings.maxPlayers && players.length >= room.settings.maxPlayers) {
        setError('ROOM_FULL');
        setLoading(false);
        return;
      }

      // Use auth UID as player ID (Repo B spec)
      const playerId = auth.currentUser!.uid;

      await setDoc(doc(db, 'rooms', roomCode, 'players', playerId), {
        id: playerId,
        name: name.trim(),
        avatar: '',
        color: selectedColor,
        traits: [],
        score: 0,
        joinedAt: serverTimestamp()
      });

      localStorage.setItem(`playerId_${roomCode}`, playerId);
      setMyId(playerId);

      console.log(`✅ Joined room ${roomCode} as ${playerId}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setError('PERMISSION_DENIED');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTraits = async () => {
    if (!me) return;

    // Check that all 3 questions are answered
    if (Object.keys(calibrationAnswers).length < 3) {
      setError('Please answer all 3 questions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Map answers to traits using choiceTraits
      const traitsSet = new Set<string>();

      calibrationQuestions.forEach((question, questionIndex) => {
        const choiceIndex = calibrationAnswers[questionIndex];
        if (choiceIndex !== undefined && question.choiceTraits && question.choiceTraits[choiceIndex]) {
          const traits = question.choiceTraits[choiceIndex];
          traits.forEach((trait: string) => traitsSet.add(trait));
        }
      });

      const mappedTraits = Array.from(traitsSet);

      // Submit traits using RedBlueGameService
      await updateDoc(doc(db, 'rooms', roomCode, 'players', me.id), {
        traits: mappedTraits,
        hasCompletedCalibration: true,
        persona: {
          style: `Based on traits: ${mappedTraits.join(', ')}`,
          avoid: 'Generic responses, inconsistency with selected traits'
        }
      });

      console.log(`✅ Submitted traits from calibration:`, mappedTraits);
    } catch (err) {
      console.error('Error submitting traits:', err);
      setError('PERMISSION_DENIED');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakerChoice = async (choice: 'AI' | 'Self') => {
    if (!me || !currentRound) return;

    setSpeakerChoice(choice);
    setLoading(true);
    setError('');

    try {
      // Call setSpeakerChoice function
      // For now, write directly (replace with callable function later)
      await updateDoc(doc(db, 'rooms', roomCode, 'rounds', currentRound.id), {
        speakerChoice: choice,
        ...(choice === 'Self' && selfAnswer ? { selfAnswer } : {})
      });

      console.log(`✅ Speaker chose: ${choice}`);
    } catch (err) {
      console.error('Error submitting speaker choice:', err);
      setError('ALREADY_SET');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (guess: 'AI' | 'Self') => {
    if (!me || !currentRound) return;

    setMyVote(guess);
    setHasVoted(true);
    setLoading(true);

    try {
      await setDoc(doc(db, 'rooms', roomCode, 'rounds', currentRound.id, 'votes', me.id), {
        playerId: me.id,
        guess,
        createdAt: serverTimestamp()
      });

      console.log(`✅ Voted: ${guess}`);
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError('DEADLINE_PASSED');
      setHasVoted(false);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SCREEN ROUTING
  // ============================================================================

  const determineScreen = (): string => {
    // Still verifying or loading
    if (verifying) return 'VERIFYING';

    // Error state
    if (error) return 'ERROR';

    // Not joined yet
    if (!me) return 'RB-A'; // Join

    // Wait for room data to fully load
    if (!room || !room.status) return 'VERIFYING';

    const phase = room.status.phase;

    // Repo B v3.4: Show Profile ONLY if uncalibrated (traits < 3)
    if (phase === 'CALIBRATE' && me.traits.length < 3) {
      return 'RB-B'; // Profile
    }

    // Repo B v3.4: Calibrated players wait during CALIBRATE phase
    if (phase === 'CALIBRATE' && me.traits.length >= 3) {
      return 'RB-C'; // Wait
    }

    // Speaker Decide
    if (phase === 'SPEAKER_DECIDE' && isSpeaker) {
      return 'RB-D';
    }

    // Voting
    if (phase === 'VOTING' && !isSpeaker) {
      return 'RB-E';
    }

    // Reveal
    if (phase === 'REVEAL') {
      return 'RB-F';
    }

    // Default to Wait/Status for all other cases
    return 'RB-C';
  };

  const currentScreen = determineScreen();

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getErrorMessage = (code: ErrorCode | string): string => {
    const messages: Record<ErrorCode, string> = {
      ROOM_NOT_FOUND: 'Room not found. Please check the room code.',
      ROOM_CLOSED: 'This room has ended or is no longer active.',
      ROOM_FULL: 'This room is full.',
      PERMISSION_DENIED: 'Permission denied.',
      PHASE_INVALID: 'Invalid game phase.',
      DEADLINE_PASSED: 'Voting closed.',
      ALREADY_SET: 'Choice already made.',
      VERSION_MISMATCH: 'Version mismatch. Please refresh.'
    };

    return messages[code as ErrorCode] || code;
  };

  // ============================================================================
  // SCREEN RENDERERS
  // ============================================================================

  if (currentScreen === 'VERIFYING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Verifying room...</p>
        </div>
      </div>
    );
  }

  if (currentScreen === 'ERROR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Connection Error</h1>
          <p className="text-gray-600 mb-4">{getErrorMessage(error)}</p>
          <p className="text-sm text-gray-500 mb-6">Room code: {roomCode}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // RB-A: Join
  if (currentScreen === 'RB-A') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Join RedBlue</h1>
          <p className="text-center text-gray-600 mb-6">Enter the code and your name.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              disabled
              className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-center text-xl font-mono"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full p-3 border border-gray-300 rounded-lg text-lg"
              maxLength={20}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Pick a Color</label>
            <div className="flex gap-3">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-full transition-all ${
                    selectedColor === color ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {getErrorMessage(error)}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>
    );
  }

  // RB-B: Profile (Calibration) - NEW: Multiple Choice Questions
  if (currentScreen === 'RB-B') {
    const allAnswered = Object.keys(calibrationAnswers).length === 3;

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-2">Calibration</h1>
          <p className="text-gray-600 mb-6">Answer these questions to help us understand you</p>

          <div className="flex-1 overflow-auto mb-6 space-y-6">
            {calibrationQuestions.map((question, questionIndex) => (
              <div key={question.id} className="bg-white rounded-lg p-6 shadow-md">
                <p className="text-lg font-semibold mb-4">
                  {questionIndex + 1}. {question.text}
                </p>

                <div className="space-y-3">
                  {question.choices.map((choice: string, choiceIndex: number) => {
                    const isSelected = calibrationAnswers[questionIndex] === choiceIndex;

                    return (
                      <button
                        key={choiceIndex}
                        onClick={() => {
                          setCalibrationAnswers({
                            ...calibrationAnswers,
                            [questionIndex]: choiceIndex
                          });
                        }}
                        className={`w-full p-4 rounded-lg font-medium text-left transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-2 border-purple-700'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-400'
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-sm text-gray-600 mb-4">
            Answered: {Object.keys(calibrationAnswers).length} / 3
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {getErrorMessage(error)}
            </div>
          )}

          <button
            onClick={handleSubmitTraits}
            disabled={loading || !allAnswered}
            className="w-full py-4 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    );
  }

  // RB-C: Wait/Status
  if (currentScreen === 'RB-C') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">RedBlue</h1>

          {/* Topic Badge (Repo B v3.4) */}
          {room?.topicPack && (
            <div className="mb-6">
              <span className="inline-block px-5 py-2 bg-indigo-100 border-2 border-indigo-500 rounded-full">
                <p className="text-sm font-semibold text-indigo-900">
                  Topic: {room.topicPack}
                </p>
              </span>
            </div>
          )}

          <div className="mb-8">
            <p className="text-lg text-gray-600 mb-2">Phase</p>
            <p className="text-3xl font-bold">{room?.status.phase || 'LOBBY'}</p>
          </div>
          {currentRound && (
            <div>
              <p className="text-gray-600">
                {isSpeaker ? "You're up!" : 'Watch and wait...'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RB-D: Speaker Decide
  if (currentScreen === 'RB-D') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-4">Your Turn</h1>

          {/* Topic Badge (Repo B v3.4) */}
          {room?.topicPack && (
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-indigo-100 border-2 border-indigo-500 rounded-full">
                <p className="text-xs font-semibold text-indigo-900">
                  Topic: {room.topicPack}
                </p>
              </span>
            </div>
          )}

          <p className="text-xl text-gray-700 mb-8">{currentRound?.questionText}</p>

          <div className="flex-1 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleSpeakerChoice('AI')}
                disabled={currentRound?.speakerChoice !== null}
                className={`p-8 rounded-lg font-bold text-2xl transition-all ${
                  speakerChoice === 'AI'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border-2 border-gray-300 text-gray-700'
                } disabled:opacity-50`}
              >
                AI
              </button>
              <button
                onClick={() => handleSpeakerChoice('Self')}
                disabled={currentRound?.speakerChoice !== null}
                className={`p-8 rounded-lg font-bold text-2xl transition-all ${
                  speakerChoice === 'Self'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border-2 border-gray-300 text-gray-700'
                } disabled:opacity-50`}
              >
                Self
              </button>
            </div>

            {speakerChoice === 'Self' && !currentRound?.speakerChoice && (
              <div className="mb-4">
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

            {speakerChoice === 'AI' && currentRound?.aiAnswerPrivate && currentRound.aiAnswerPrivateFor === me?.id && (
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-900 mb-2">AI Preview (only you see this):</p>
                <p className="text-lg">{currentRound.aiAnswerPrivate}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {getErrorMessage(error)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // RB-E: Vote
  if (currentScreen === 'RB-E') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
          <h1 className="text-3xl font-bold text-center mb-6">Vote</h1>
          <p className="text-xl text-center mb-12">Was that AI or Self?</p>

          <div className="flex-1 flex flex-col gap-6 justify-center">
            <button
              onClick={() => handleVote('AI')}
              disabled={hasVoted || !isVotingOpen}
              className={`py-16 rounded-lg font-bold text-4xl transition-all ${
                hasVoted && myVote === 'AI'
                  ? 'bg-purple-600 text-white'
                  : hasVoted || !isVotingOpen
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
              } disabled:cursor-not-allowed`}
            >
              {hasVoted && myVote === 'AI' ? '✓ AI' : 'AI'}
            </button>

            <button
              onClick={() => handleVote('Self')}
              disabled={hasVoted || !isVotingOpen}
              className={`py-16 rounded-lg font-bold text-4xl transition-all ${
                hasVoted && myVote === 'Self'
                  ? 'bg-green-600 text-white'
                  : hasVoted || !isVotingOpen
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-green-500 text-white hover:bg-green-600'
              } disabled:cursor-not-allowed`}
            >
              {hasVoted && myVote === 'Self' ? '✓ Self' : 'Self'}
            </button>
          </div>

          {hasVoted && (
            <p className="text-center text-lg text-gray-600 mt-6">Vote locked</p>
          )}

          {!isVotingOpen && !hasVoted && (
            <p className="text-center text-lg text-red-600 mt-6">Voting closed</p>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              {getErrorMessage(error)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // RB-F: Result
  if (currentScreen === 'RB-F') {
    const wasCorrect = myVote === currentRound?.speakerChoice;
    const fooledMajority = currentRound?.result?.fooledMajority || false;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Result</h1>

          <div className="mb-8">
            <p className="text-xl text-gray-600 mb-2">It was</p>
            <p className="text-7xl font-bold mb-6">{currentRound?.speakerChoice}</p>

            {isSpeaker ? (
              <div>
                <p className="text-2xl mb-4">
                  {fooledMajority ? "You fooled them! ✨" : "They guessed it!"}
                </p>
                <p className="text-4xl font-bold">
                  {fooledMajority ? "+1 point" : "No points"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-4">
                  {wasCorrect ? "You were right! ✅" : "Close! ❌"}
                </p>
                <p className="text-4xl font-bold">
                  {wasCorrect ? "+1 point" : "No points"}
                </p>
              </div>
            )}
          </div>

          <p className="text-lg text-gray-600">Waiting for next round...</p>
        </div>
      </div>
    );
  }

  return null;
}
