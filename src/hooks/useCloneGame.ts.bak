import { useState, useEffect, useCallback } from 'react';
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
import { tryJoinRoom } from '@/utils/roomUtils';
import {
  Room,
  Player,
  Round,
  CalibrationQuestion,
  ScreenType,
  ErrorCode,
  COLOR_OPTIONS
} from '@/types/clone';

export function useCloneGame(roomCode: string) {
  // State - Core data
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [me, setMe] = useState<Player | null>(null);

  // State - UI
  const [error, setError] = useState<ErrorCode | string>('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // State - Join screen
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0]);

  // State - Calibration
  const [calibrationQuestions, setCalibrationQuestions] = useState<CalibrationQuestion[]>([]);
  const [calibrationAnswers, setCalibrationAnswers] = useState<Record<number, number>>({});

  // State - Speaker Decide
  const [speakerChoice, setSpeakerChoice] = useState<'AI' | 'Self' | null>(null);

  // State - Voting
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<'AI' | 'Self' | null>(null);
  const [timeRemaining] = useState<number>(0);

  // State - Speaker Preparation
  const [prepTimeRemaining] = useState<number>(0);

  // Derived state
  const isSpeaker = currentRound && me ? currentRound.speakerId === me.id : false;
  const isVotingOpen = Boolean(
    room?.status?.phase === 'VOTING' &&
    currentRound?.voteDeadline &&
    Timestamp.now().toMillis() <= currentRound.voteDeadline.toMillis()
  );

  // Initialize - Check if already joined
  useEffect(() => {
    const storedId = localStorage.getItem(`playerId_${roomCode}`);
    if (storedId) {
      setMyId(storedId);
    }
  }, [roomCode]);

  // Initialize - Verify room exists
  useEffect(() => {
    const verifyRoom = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const { room: roomData } = await tryJoinRoom(roomCode);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isActive = (roomData as any).active ?? ((roomData as any).status?.phase && (roomData as any).status.phase !== 'END');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((roomData as any).active === false || !isActive) {
          setError('ROOM_CLOSED');
          setVerifying(false);
          return;
        }

        setRoom(roomData as unknown as Room);
        setVerifying(false);
      } catch (err) {
        console.error('Error verifying room:', err);
        setError(err instanceof Error ? err.message : 'ROOM_NOT_FOUND');
        setVerifying(false);
      }
    };

    verifyRoom();
  }, [roomCode]);

  // Subscription - Room
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

  // Subscription - Players
  useEffect(() => {
    if (!roomCode || verifying) return;

    const playersRef = collection(db, 'rooms', roomCode, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playersList: Player[] = [];
      snapshot.forEach((doc) => {
        playersList.push(doc.data() as Player);
      });
      setPlayers(playersList);

      if (myId) {
        const myData = playersList.find((p) => p.id === myId);
        setMe(myData || null);
      }
    });

    return unsubscribe;
  }, [roomCode, verifying, myId]);

  // Subscription - Current Round
  useEffect(() => {
    if (!roomCode || !room?.status.currentRoundId) {
      setCurrentRound(null);
      return;
    }

    const roundRef = doc(db, 'rooms', roomCode, 'rounds', room.status.currentRoundId);
    const unsubscribe = onSnapshot(roundRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentRound({ id: snapshot.id, ...snapshot.data() } as Round);
      } else {
        setCurrentRound(null);
      }
    });

    return unsubscribe;
  }, [roomCode, room?.status?.currentRoundId]);

  // Reset vote state when round changes
  useEffect(() => {
    setHasVoted(false);
    setMyVote(null);
  }, [currentRound?.id]);

  // Load calibration questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await import('@/data/questions/calibrationQuestions.json');
        const questions = response.default || response;
        setCalibrationQuestions(questions.slice(0, 3));
      } catch (error) {
        console.error('Error loading calibration questions:', error);
        setCalibrationQuestions([]);
      }
    };

    loadQuestions();
  }, []);


  // Actions
  const handleJoin = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      if (room?.settings.maxPlayers && players.length >= room.settings.maxPlayers) {
        setError('ROOM_FULL');
        setLoading(false);
        return;
      }

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
    } catch (err) {
      console.error('Error joining room:', err);
      setError('PERMISSION_DENIED');
    } finally {
      setLoading(false);
    }
  }, [name, selectedColor, roomCode, room, players]);

  const handleSubmitTraits = useCallback(async () => {
    if (!me) return;

    if (Object.keys(calibrationAnswers).length < 3) {
      setError('Please answer all 3 questions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const traitsSet = new Set<string>();

      calibrationQuestions.forEach((question, questionIndex) => {
        const choiceIndex = calibrationAnswers[questionIndex];
        if (choiceIndex !== undefined && question.choiceTraits && question.choiceTraits[choiceIndex]) {
          const traits = question.choiceTraits[choiceIndex];
          traits.forEach((trait: string) => traitsSet.add(trait));
        }
      });

      const mappedTraits = Array.from(traitsSet);

      await updateDoc(doc(db, 'rooms', roomCode, 'players', me.id), {
        traits: mappedTraits,
        hasCompletedCalibration: true,
        persona: {
          style: `Based on traits: ${mappedTraits.join(', ')}`,
          avoid: 'Generic responses, inconsistency with selected traits'
        }
      });

      console.log(`✅ Submitted traits:`, mappedTraits);
    } catch (err) {
      console.error('Error submitting traits:', err);
      setError('PERMISSION_DENIED');
    } finally {
      setLoading(false);
    }
  }, [me, calibrationAnswers, calibrationQuestions, roomCode]);

  const handleSpeakerChoice = useCallback(
    async (choice: 'AI' | 'Self') => {
      if (!me || !currentRound) return;

      // Check if Firebase is initialized
      if (!db) {
        console.error('❌ Firebase not initialized');
        setError('FIREBASE_NOT_INITIALIZED');
        return;
      }

      // Prevent double submission
      if (currentRound.speakerChoice !== null) {
        console.log('⚠️ Choice already made, ignoring');
        setError('ALREADY_SET');
        return;
      }

      setSpeakerChoice(choice);
      setLoading(true);
      setError('');

      try {
        const updateData: { speakerChoice: 'AI' | 'Self'; aiAnswerPrivate?: string } = {
          speakerChoice: choice
        };

        // If AI choice, generate AI response
        if (choice === 'AI') {
          try {
            const response = await fetch('/api/generate-redblue-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                persona: me.persona,
                traits: me.traits || [],
                question: currentRound.questionText || currentRound.question
              })
            });

            if (response.ok) {
              const data = await response.json();
              updateData.aiAnswerPrivate = data.response;
              console.log('✅ Generated AI response:', data.response);
            } else {
              console.error('Failed to generate AI response');
              updateData.aiAnswerPrivate = "I'd have to think about that one...";
            }
          } catch (error) {
            console.error('Error calling AI API:', error);
            updateData.aiAnswerPrivate = "I'd have to think about that one...";
          }
        }

        await updateDoc(doc(db, 'rooms', roomCode, 'rounds', currentRound.id), updateData);

        console.log(`✅ Speaker chose: ${choice}`);
      } catch (err) {
        console.error('Error submitting speaker choice:', err);
        setError('ALREADY_SET');
      } finally {
        setLoading(false);
      }
    },
    [me, currentRound, roomCode]
  );

  const handleVote = useCallback(
    async (guess: 'AI' | 'Self') => {
      if (!me || !currentRound) return;

      // Check if Firebase is initialized
      if (!db) {
        console.error('❌ Firebase not initialized');
        setError('FIREBASE_NOT_INITIALIZED');
        return;
      }

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
    },
    [me, currentRound, roomCode]
  );

  const determineScreen = useCallback((): ScreenType => {
    if (verifying) return 'VERIFYING';
    if (error) return 'ERROR';
    if (!me) return 'RB-A';
    if (!room || !room.status) return 'VERIFYING';

    const phase = room.status.phase;

    if (phase === 'CALIBRATE' && me.traits.length < 3) return 'RB-B';
    if (phase === 'CALIBRATE' && me.traits.length >= 3) return 'RB-C';
    if (phase === 'SPEAKER_DECIDE' && isSpeaker) return 'RB-D';
    if (phase === 'VOTING' && !isSpeaker) return 'RB-E';
    if (phase === 'REVEAL') return 'RB-F';
    if (phase === 'LEADERBOARD' || phase === 'END') return 'RB-G';

    return 'RB-C';
  }, [verifying, error, me, room, isSpeaker]);

  return {
    // Data
    room,
    players,
    currentRound,
    me,
    // UI State
    error,
    loading,
    verifying,
    // Join
    name,
    setName,
    selectedColor,
    setSelectedColor,
    // Calibration
    calibrationQuestions,
    calibrationAnswers,
    setCalibrationAnswers,
    // Speaker Decide
    speakerChoice,
    prepTimeRemaining,
    // Voting
    hasVoted,
    myVote,
    timeRemaining,
    isVotingOpen,
    // Derived
    isSpeaker,
    // Actions
    handleJoin,
    handleSubmitTraits,
    handleSpeakerChoice,
    handleVote,
    // Screen
    currentScreen: determineScreen()
  };
}
