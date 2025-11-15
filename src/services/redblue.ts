import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs
} from 'firebase/firestore';
import LobbyService from './lobby';

// ============================================================================
// TYPE DEFINITIONS - RedBlue Spec
// ============================================================================

export type GamePhase =
  | 'LOBBY'
  | 'CALIBRATE'
  | 'ROUND_INTRO'
  | 'SPEAKER_DECIDE'
  | 'VOTING'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'END';

export type SpeakerChoice = 'AI' | 'Self' | null;
export type VoteGuess = 'AI' | 'Self';

export interface RedBluePlayer {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  traits: string[];
  persona?: {
    style?: string;
    avoid?: string;
  };
  aiAnswers?: Record<string, string>;  // Pre-generated AI answers keyed by question ID
  aiAnswersGeneratedAt?: Timestamp;    // When AI answers were generated
  score: number;
  isHost: boolean;
  platform: 'web' | 'ios' | 'rn';
  joinedAt: Timestamp;
  hasCompletedCalibration: boolean;
}

export interface RoomSettings {
  roundsPerCycle: number;        // Default: 1
  prepSeconds: number;            // Default: 15
  votingSeconds: number;          // Default: 25
  revealSeconds: number;          // Default: 8
  aiSpice: number;                // 0-3, Default: 2
  personaWeight: number;          // 0-1, Default: 0.8
  minPlayers: number;             // Default: 3
  maxPlayers?: number;            // Optional max
}

export interface RoomStatus {
  phase: GamePhase;
  roundIndex: number;
  voteDeadline?: Timestamp | null;
  currentRoundId?: string | null;
}

export interface PreassignedQuestion {
  id: string;
  text: string;
  tags: string[];
  difficulty: string;
}

export interface RedBlueRoom {
  roomId: string;
  hostId: string;
  settings: RoomSettings;
  status: RoomStatus;
  topicPack?: string;
  speakerOrder?: string[];                 // Pre-generated speaker order (player IDs)
  preassignedQuestions?: PreassignedQuestion[]; // Pre-assigned questions for rounds
  questionsVersion?: string;               // Version of question bank used
  createdAt: Timestamp;
  active: boolean;
}

export interface Round {
  id: string;
  index: number;
  speakerId: string;
  questionId: string;
  questionText?: string;
  speakerChoice: SpeakerChoice;
  aiAnswerPrivateFor?: string | null;  // Only speaker can read pre-reveal
  aiAnswer?: string | null;             // Copied on reveal for all
  selfAnswer?: string | null;           // Human typed answer
  voteDeadline?: Timestamp | null;
  tally?: {
    AI: number;
    Self: number;
  } | null;
  result?: {
    majority: 'AI' | 'Self' | 'Tie';
    fooledMajority: boolean;
    correct?: boolean;
  } | null;
}

export interface Vote {
  playerId: string;
  guess: VoteGuess;
  createdAt: Timestamp;
}

// ============================================================================
// REDBLUE GAME SERVICE
// ============================================================================

export class RedBlueGameService {

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  /**
   * Create a new RedBlue room with default settings
   */
  static async createRoom(hostId: string, settings?: Partial<RoomSettings>): Promise<string> {
    try {
      const defaultSettings: RoomSettings = {
        roundsPerCycle: 1,
        prepSeconds: 15,
        votingSeconds: 25,
        revealSeconds: 8,
        aiSpice: 2,
        personaWeight: 0.8,
        minPlayers: 3,
        ...settings
      };

      const roomRef = doc(collection(db, 'rooms'));
      const roomId = roomRef.id;

      const roomData: RedBlueRoom = {
        roomId,
        hostId,
        settings: defaultSettings,
        status: {
          phase: 'LOBBY',
          roundIndex: 0,
          voteDeadline: null,
          currentRoundId: null
        },
        topicPack: 'Classic',
        createdAt: serverTimestamp() as Timestamp,
        active: true
      };

      await setDoc(roomRef, roomData);
      return roomId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize RedBlue game from existing Clone room
   */
  static async initializeFromClone(roomId: string, hostId: string): Promise<void> {
    try {
      // Get existing room
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      // Get members
      const members = await LobbyService.getRoomMembers(roomId);

      console.log('Initializing RedBlue game with members:', members.map(m => ({
        id: m.memberId,
        name: m.displayName
      })));

      // Create players array
      const players: RedBluePlayer[] = members.map(member => ({
        id: member.memberId,
        name: member.displayName,
        avatar: '',
        color: '#FF6B6B',
        traits: [],
        score: 0,
        isHost: member.role === 'host',
        platform: member.platform as 'web' | 'ios' | 'rn',
        joinedAt: member.joinedAt || serverTimestamp() as Timestamp,
        hasCompletedCalibration: false
      }));

      // Initialize room with RedBlue structure
      const roomData: Partial<RedBlueRoom> = {
        roomId,
        hostId,
        settings: {
          roundsPerCycle: 1,
          prepSeconds: 15,
          votingSeconds: 25,
          revealSeconds: 8,
          aiSpice: 2,
          personaWeight: 0.8,
          minPlayers: 3
        },
        status: {
          phase: 'LOBBY',
          roundIndex: 0,
          voteDeadline: null,
          currentRoundId: null
        },
        topicPack: 'Classic',
        active: true
      };

      await updateDoc(roomRef, {
        ...roomData,
        gameMode: 'redblue',
        gameState: 'waiting',
        lastActivity: serverTimestamp()
      });

      // Store players in subcollection
      for (const player of players) {
        const playerRef = doc(db, 'rooms', roomId, 'players', player.id);
        await setDoc(playerRef, player);
      }

      console.log(`✅ RedBlue game initialized for room ${roomId} with ${players.length} players`);
    } catch (error) {
      console.error('Error initializing RedBlue game:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // CALIBRATION PHASE
  // --------------------------------------------------------------------------

  /**
   * Start calibration phase
   */
  static async startCalibration(roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'status.phase': 'CALIBRATE',
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Started calibration for room ${roomId}`);
    } catch (error) {
      console.error('Error starting calibration:', error);
      throw error;
    }
  }

  /**
   * Submit player traits for calibration
   */
  static async submitTraits(
    roomId: string,
    playerId: string,
    traits: string[]
  ): Promise<void> {
    try {
      if (traits.length < 3 || traits.length > 7) {
        throw new Error('Must select between 3 and 7 traits');
      }

      const persona = {
        style: this.generatePersonaStyle(traits),
        avoid: this.generatePersonaAvoid()
      };

      const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
      await updateDoc(playerRef, {
        traits,
        hasCompletedCalibration: true,
        persona
      });

      // Update lobby member as well
      await LobbyService.updateMember(roomId, playerId, {
        hasCloneProfile: true,
        cloneInfo: traits.join(', ')
      });

      console.log(`✅ Player ${playerId} submitted traits: ${traits.join(', ')}`);

      // Immediately generate AI answers for this player (async, don't wait)
      this.generateAIAnswersForPlayer(roomId, playerId, persona, traits)
        .then(() => console.log(`✅ AI answers generated for player ${playerId}`))
        .catch(err => console.error(`Error generating AI answers for player ${playerId}:`, err));

    } catch (error) {
      console.error('Error submitting traits:', error);
      throw error;
    }
  }

  /**
   * Check if all players have completed calibration
   */
  static async checkCalibrationComplete(roomId: string): Promise<boolean> {
    try {
      const playersRef = collection(db, 'rooms', roomId, 'players');
      const snapshot = await getDocs(playersRef);

      const players = snapshot.docs.map(doc => doc.data() as RedBluePlayer);
      const allComplete = players.every(p => p.hasCompletedCalibration);

      return allComplete;
    } catch (error) {
      console.error('Error checking calibration status:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // ROUND MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Start a new round - pick speaker and question
   */
  static async startRound(roomId: string): Promise<string> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.data() as RedBlueRoom;

      // Get all players
      const playersRef = collection(db, 'rooms', roomId, 'players');
      const playersSnapshot = await getDocs(playersRef);
      const players = playersSnapshot.docs.map(doc => doc.data() as RedBluePlayer);

      if (players.length < roomData.settings.minPlayers) {
        throw new Error(`Need at least ${roomData.settings.minPlayers} players to start`);
      }

      // Get speaker from pre-generated order
      const speakerOrder = roomData.speakerOrder;

      if (!speakerOrder || speakerOrder.length === 0) {
        throw new Error('Speaker order not initialized. Call initializeSpeakerOrder first.');
      }

      // Cycle through speaker order based on round index
      const speakerIndex = roomData.status.roundIndex % speakerOrder.length;
      const speakerId = speakerOrder[speakerIndex];
      const speaker = players.find(p => p.id === speakerId);

      if (!speaker) {
        throw new Error(`Speaker ${speakerId} not found in players`);
      }

      // Get pre-assigned question for this round
      const preassignedQuestions = roomData.preassignedQuestions;

      if (!preassignedQuestions || preassignedQuestions.length === 0) {
        throw new Error('Questions not pre-assigned. Call preassignQuestions first.');
      }

      const questionIndex = roomData.status.roundIndex % preassignedQuestions.length;
      const question = preassignedQuestions[questionIndex];
      const questionId = question.id;
      const questionText = question.text;

      // Create round document
      const roundRef = doc(collection(db, 'rooms', roomId, 'rounds'));
      const roundId = roundRef.id;

      const round: Round = {
        id: roundId,
        index: roomData.status.roundIndex,
        speakerId: speaker.id,
        questionId,
        questionText,
        speakerChoice: null,
        aiAnswerPrivateFor: null,
        aiAnswer: null,
        selfAnswer: null,
        voteDeadline: null,
        tally: null,
        result: null
      };

      await setDoc(roundRef, round);

      // Update room status
      await updateDoc(roomRef, {
        'status.phase': 'ROUND_INTRO',
        'status.currentRoundId': roundId,
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Round ${roomData.status.roundIndex} started - Speaker: ${speaker.name}`);
      return roundId;
    } catch (error) {
      console.error('Error starting round:', error);
      throw error;
    }
  }

  /**
   * Move to speaker decide phase
   */
  static async openSpeakerDecide(roomId: string, roundId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'status.phase': 'SPEAKER_DECIDE',
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Speaker decide phase opened for round ${roundId}`);
    } catch (error) {
      console.error('Error opening speaker decide:', error);
      throw error;
    }
  }

  /**
   * Speaker chooses AI or Self
   */
  static async submitSpeakerChoice(
    roomId: string,
    roundId: string,
    playerId: string,
    choice: 'AI' | 'Self',
    selfAnswer?: string
  ): Promise<void> {
    try {
      const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
      const roundDoc = await getDoc(roundRef);

      if (!roundDoc.exists()) {
        throw new Error('Round not found');
      }

      const round = roundDoc.data() as Round;

      if (round.speakerId !== playerId) {
        throw new Error('Only the speaker can make this choice');
      }

      if (round.speakerChoice !== null) {
        throw new Error('Choice already made');
      }

      const updateData: Partial<Round> = {
        speakerChoice: choice
      };

      if (choice === 'Self' && selfAnswer) {
        updateData.selfAnswer = selfAnswer;
      } else if (choice === 'AI') {
        // Use pre-generated AI answer
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        const playerDoc = await getDoc(playerRef);
        const player = playerDoc.data() as RedBluePlayer;

        // Get pre-generated AI answer for this question
        const aiAnswer = player.aiAnswers?.[round.questionId];

        if (!aiAnswer) {
          throw new Error('AI answer not found. Player may need to recalibrate.');
        }

        updateData.aiAnswer = aiAnswer;
        updateData.aiAnswerPrivateFor = playerId; // Only speaker sees it pre-reveal
      }

      await updateDoc(roundRef, updateData);

      console.log(`✅ Speaker chose: ${choice}`);
    } catch (error) {
      console.error('Error submitting speaker choice:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // VOTING PHASE
  // --------------------------------------------------------------------------

  /**
   * Open voting phase with deadline
   */
  static async openVoting(roomId: string, roundId: string): Promise<Timestamp> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.data() as RedBlueRoom;
      const votingSeconds = roomData.settings.votingSeconds;

      // Calculate deadline
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + votingSeconds);
      const voteDeadline = Timestamp.fromDate(deadline);

      // Update room and round
      await updateDoc(roomRef, {
        'status.phase': 'VOTING',
        'status.voteDeadline': voteDeadline,
        lastActivity: serverTimestamp()
      });

      const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
      await updateDoc(roundRef, {
        voteDeadline
      });

      console.log(`✅ Voting opened - deadline in ${votingSeconds}s`);
      return voteDeadline;
    } catch (error) {
      console.error('Error opening voting:', error);
      throw error;
    }
  }

  /**
   * Submit a vote
   */
  static async submitVote(
    roomId: string,
    roundId: string,
    playerId: string,
    guess: VoteGuess
  ): Promise<void> {
    try {
      const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
      const roundDoc = await getDoc(roundRef);

      if (!roundDoc.exists()) {
        throw new Error('Round not found');
      }

      const round = roundDoc.data() as Round;

      // Speaker cannot vote
      if (round.speakerId === playerId) {
        throw new Error('Speaker cannot vote');
      }

      // Check deadline
      if (round.voteDeadline && Timestamp.now().toMillis() > round.voteDeadline.toMillis()) {
        throw new Error('Voting deadline passed');
      }

      // Create/update vote document
      const voteRef = doc(db, 'rooms', roomId, 'rounds', roundId, 'votes', playerId);
      const vote: Vote = {
        playerId,
        guess,
        createdAt: serverTimestamp() as Timestamp
      };

      await setDoc(voteRef, vote);

      console.log(`✅ Player ${playerId} voted: ${guess}`);
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  }

  /**
   * Close voting and tally results
   */
  static async closeVotingAndTally(roomId: string, roundId: string): Promise<{
    tally: { AI: number; Self: number };
    result: Round['result'];
    scoreDeltas: Record<string, number>;
  }> {
    try {
      const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
      const roundDoc = await getDoc(roundRef);

      if (!roundDoc.exists()) {
        throw new Error('Round not found');
      }

      const round = roundDoc.data() as Round;

      // Get all votes
      const votesRef = collection(db, 'rooms', roomId, 'rounds', roundId, 'votes');
      const votesSnapshot = await getDocs(votesRef);
      const votes = votesSnapshot.docs.map(doc => doc.data() as Vote);

      // Tally votes
      const tally = {
        AI: votes.filter(v => v.guess === 'AI').length,
        Self: votes.filter(v => v.guess === 'Self').length
      };

      // Determine majority
      let majority: 'AI' | 'Self' | 'Tie' = 'Tie';
      if (tally.AI > tally.Self) majority = 'AI';
      else if (tally.Self > tally.AI) majority = 'Self';

      // Calculate if speaker fooled majority
      const fooledMajority = majority !== 'Tie' && majority !== round.speakerChoice;

      const result: Round['result'] = {
        majority,
        fooledMajority
      };

      // Calculate score deltas
      const scoreDeltas: Record<string, number> = {};

      // Speaker gets +1 if they fooled the majority
      if (fooledMajority && round.speakerChoice) {
        scoreDeltas[round.speakerId] = 1;
      }

      // Voters get +1 if they guessed correctly
      if (majority !== 'Tie' && round.speakerChoice) {
        votes.forEach(vote => {
          if (vote.guess === round.speakerChoice) {
            scoreDeltas[vote.playerId] = (scoreDeltas[vote.playerId] || 0) + 1;
          }
        });
      }

      // Update round with results
      await updateDoc(roundRef, {
        tally,
        result
      });

      // Update player scores
      for (const [playerId, delta] of Object.entries(scoreDeltas)) {
        if (delta > 0) {
          const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
          const playerDoc = await getDoc(playerRef);
          if (playerDoc.exists()) {
            const player = playerDoc.data() as RedBluePlayer;
            await updateDoc(playerRef, {
              score: player.score + delta
            });
          }
        }
      }

      // Update room phase to REVEAL
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'status.phase': 'REVEAL',
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Voting tallied - Majority: ${majority}, Fooled: ${fooledMajority}`);
      return { tally, result, scoreDeltas };
    } catch (error) {
      console.error('Error closing voting:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  /**
   * Advance to next phase or end game
   */
  static async nextOrEnd(roomId: string): Promise<GamePhase> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.data() as RedBlueRoom;
      const currentPhase = roomData.status.phase;

      let nextPhase: GamePhase = 'END';

      if (currentPhase === 'REVEAL') {
        // Check if we should do another round or go to leaderboard
        const nextRoundIndex = roomData.status.roundIndex + 1;

        if (nextRoundIndex % roomData.settings.roundsPerCycle === 0) {
          // Cycle complete - go to leaderboard
          nextPhase = 'LEADERBOARD';
        } else {
          // Continue with next round
          await updateDoc(roomRef, {
            'status.roundIndex': nextRoundIndex,
            lastActivity: serverTimestamp()
          });
          await this.startRound(roomId);
          return 'ROUND_INTRO';
        }
      } else if (currentPhase === 'LEADERBOARD') {
        // Could start a new cycle or end
        nextPhase = 'END';
      }

      await updateDoc(roomRef, {
        'status.phase': nextPhase,
        lastActivity: serverTimestamp()
      });

      return nextPhase;
    } catch (error) {
      console.error('Error advancing phase:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // REAL-TIME LISTENERS
  // --------------------------------------------------------------------------

  /**
   * Listen to room status changes
   */
  static listenToRoom(roomId: string, callback: (room: RedBlueRoom | null) => void): () => void {
    const roomRef = doc(db, 'rooms', roomId);

    return onSnapshot(
      roomRef,
      (doc) => {
        if (doc.exists()) {
          callback(doc.data() as RedBlueRoom);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error listening to room:', error);
        callback(null);
      }
    );
  }

  /**
   * Listen to players in a room
   */
  static listenToPlayers(roomId: string, callback: (players: RedBluePlayer[]) => void): () => void {
    const playersRef = collection(db, 'rooms', roomId, 'players');

    return onSnapshot(
      playersRef,
      (snapshot) => {
        const players = snapshot.docs.map(doc => doc.data() as RedBluePlayer);
        callback(players);
      },
      (error) => {
        console.error('Error listening to players:', error);
        callback([]);
      }
    );
  }

  /**
   * Listen to current round
   */
  static listenToRound(roomId: string, roundId: string, callback: (round: Round | null) => void): () => void {
    const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);

    return onSnapshot(
      roundRef,
      (doc) => {
        if (doc.exists()) {
          callback(doc.data() as Round);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error listening to round:', error);
        callback(null);
      }
    );
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Generate deterministic speaker order using seeded shuffle
   * Returns array of player IDs in the order they'll be speakers
   */
  static generateSpeakerOrder(playerIds: string[], seed?: string): string[] {
    // Use room creation timestamp or provided seed for determinism
    const seedValue = seed || Date.now().toString();

    // Simple seeded random number generator (mulberry32)
    const seededRandom = (seed: string) => {
      let h = 1779033703 ^ seed.length;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
      }
      return () => {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
      };
    };

    const rng = seededRandom(seedValue);

    // Fisher-Yates shuffle with seeded random
    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((rng() / 4294967296) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Initialize speaker order after calibration completes
   * Should be called once all players have joined and calibrated
   */
  static async initializeSpeakerOrder(roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.data() as RedBlueRoom;

      // Get all players
      const playersRef = collection(db, 'rooms', roomId, 'players');
      const playersSnapshot = await getDocs(playersRef);
      const players = playersSnapshot.docs.map(doc => doc.data() as RedBluePlayer);

      if (players.length < roomData.settings.minPlayers) {
        throw new Error(`Need at least ${roomData.settings.minPlayers} players`);
      }

      // Generate deterministic speaker order using room ID as seed
      const playerIds = players.map(p => p.id);
      const speakerOrder = this.generateSpeakerOrder(playerIds, roomId);

      // Store speaker order in room
      await updateDoc(roomRef, {
        speakerOrder,
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Speaker order initialized for ${players.length} players`);
    } catch (error) {
      console.error('Error initializing speaker order:', error);
      throw error;
    }
  }

  /**
   * Pre-assign questions to rounds before gameplay starts
   * Uses deterministic shuffling to ensure reproducibility
   */
  static async preassignQuestions(roomId: string, numRounds: number = 10): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      // Load game questions
      const gameQuestions = await this.loadGameQuestions();

      if (gameQuestions.length < numRounds) {
        throw new Error(`Not enough questions (need ${numRounds}, have ${gameQuestions.length})`);
      }

      // Shuffle questions deterministically using room ID as seed
      const shuffledQuestions = this.shuffleArray(gameQuestions, roomId);

      // Pre-assign questions for the specified number of rounds
      const preassignedQuestions = shuffledQuestions.slice(0, numRounds).map(q => ({
        id: q.id,
        text: q.text,
        tags: q.tags,
        difficulty: q.difficulty
      }));

      // Store pre-assigned questions in room
      await updateDoc(roomRef, {
        preassignedQuestions,
        questionsVersion: '1.0',
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Pre-assigned ${numRounds} questions for room ${roomId}`);
    } catch (error) {
      console.error('Error pre-assigning questions:', error);
      throw error;
    }
  }

  /**
   * Load game questions from local JSON file
   */
  private static async loadGameQuestions(): Promise<PreassignedQuestion[]> {
    try {
      // Import questions from local file
      const questions = await import('@/data/questions/gameQuestions.json');
      return questions.default || questions;
    } catch (error) {
      console.error('Error loading game questions:', error);
      return [];
    }
  }

  /**
   * Generic deterministic shuffle using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[], seed: string): T[] {
    // Use the same seeded random as generateSpeakerOrder
    const seededRandom = (seed: string) => {
      let h = 1779033703 ^ seed.length;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
      }
      return () => {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
      };
    };

    const rng = seededRandom(seed + '_questions'); // Different seed suffix for variety
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((rng() / 4294967296) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Generate AI answers for all pre-assigned questions for a specific player
   * Called immediately after calibration completes
   */
  static async generateAIAnswersForPlayer(
    roomId: string,
    playerId: string,
    persona: { style?: string; avoid?: string },
    traits: string[]
  ): Promise<void> {
    try {
      // Get room and pre-assigned questions
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }

      const roomData = roomDoc.data() as RedBlueRoom;
      const preassignedQuestions = roomData.preassignedQuestions;

      if (!preassignedQuestions || preassignedQuestions.length === 0) {
        console.warn('No pre-assigned questions found, skipping AI generation');
        return;
      }

      // Generate AI answers for each question
      const aiAnswers: Record<string, string> = {};

      for (const question of preassignedQuestions) {
        try {
          const aiAnswer = await this.generateAIAnswer(persona, traits, question.text);
          aiAnswers[question.id] = aiAnswer;
        } catch (error) {
          console.error(`Error generating AI answer for question ${question.id}:`, error);
          // Store fallback answer
          aiAnswers[question.id] = `As someone who is ${traits.slice(0, 2).join(' and ')}, I'd say...`;
        }
      }

      // Store AI answers in player document
      const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
      await updateDoc(playerRef, {
        aiAnswers,
        aiAnswersGeneratedAt: serverTimestamp()
      });

      console.log(`✅ Generated ${Object.keys(aiAnswers).length} AI answers for player ${playerId}`);
    } catch (error) {
      console.error('Error generating AI answers for player:', error);
      throw error;
    }
  }

  private static generatePersonaStyle(traits: string[]): string {
    // Simple persona generation based on traits
    return `Based on traits: ${traits.join(', ')}`;
  }

  private static generatePersonaAvoid(): string {
    return 'Generic responses, inconsistency with selected traits';
  }

  private static async generateAIAnswer(
    persona: { style?: string; avoid?: string },
    traits: string[],
    question: string
  ): Promise<string> {
    try {
      const response = await fetch('/api/generate-redblue-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          traits,
          question
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response;
      }

      // Fallback
      return `As someone who is ${traits.slice(0, 2).join(' and ')}, I'd say...`;
    } catch (error) {
      console.error('Error generating AI answer:', error);
      return `As someone who is ${traits.slice(0, 2).join(' and ')}, I'd say...`;
    }
  }
}

export default RedBlueGameService;
