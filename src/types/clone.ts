import { Timestamp } from 'firebase/firestore';

// Game phase types
export type GamePhase =
  | 'LOBBY'
  | 'CALIBRATE'
  | 'ROUND_INTRO'
  | 'SPEAKER_DECIDE'
  | 'VOTING'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'END';

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_CLOSED'
  | 'ROOM_FULL'
  | 'PERMISSION_DENIED'
  | 'PHASE_INVALID'
  | 'DEADLINE_PASSED'
  | 'ALREADY_SET'
  | 'VERSION_MISMATCH';

// Calibration types
export interface CalibrationQuestion {
  id: string;
  text: string;
  choices: string[];
  choiceTraits: string[][];
  tags: string[];
  difficulty: string;
}

// Room types
export interface RoomStatus {
  phase: GamePhase;
  roundIndex: number;
  voteDeadline?: Timestamp | null;
  currentRoundId?: string | null;
}

export interface RoomSettings {
  maxPlayers?: number;
  votingSeconds?: number;
  prepSeconds?: number;
}

export interface Room {
  roomCode?: string;
  roomId?: string;
  status: RoomStatus;
  settings: RoomSettings;
  active?: boolean;
  topicPack?: string;
}

// Player types
export interface PlayerPersona {
  style: string;
  avoid: string;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  traits: string[];
  score: number;
  joinedAt: Timestamp;
  hasCompletedCalibration?: boolean;
  persona?: PlayerPersona;
}

// Round types
export interface RoundResult {
  majority: 'AI' | 'Self' | 'Tie';
  fooledMajority: boolean;
}

export interface RoundTally {
  AI: number;
  Self: number;
}

export interface Round {
  id: string;
  speakerId: string;
  question?: string; // Support both field names
  questionText?: string; // Support both field names
  speakerChoice: 'AI' | 'Self' | null;
  speakerChoiceTime?: Timestamp | null;
  aiAnswerPrivate?: string | null;
  aiAnswerPrivateFor?: string | null;
  aiAnswer?: string | null;
  selfAnswer?: string | null;
  voteDeadline?: Timestamp | null;
  tally?: RoundTally | null;
  result?: RoundResult | null;
}

// Screen types
export type ScreenType =
  | 'VERIFYING'
  | 'ERROR'
  | 'RB-A' // Join
  | 'RB-B' // Calibration
  | 'RB-C' // Wait/Status
  | 'RB-D' // Speaker Decide
  | 'RB-E' // Voting
  | 'RB-F' // Result
  | 'RB-G'; // Leaderboard

// Component props types
export interface BaseScreenProps {
  room: Room | null;
  me: Player | null;
  players: Player[];
  currentRound: Round | null;
  loading: boolean;
  error: ErrorCode | string;
}

export interface JoinScreenProps extends BaseScreenProps {
  roomCode: string;
  name: string;
  setName: (name: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  onJoin: () => void;
}

export interface CalibrationScreenProps extends BaseScreenProps {
  questions: CalibrationQuestion[];
  answers: Record<number, number>;
  setAnswers: (answers: Record<number, number>) => void;
  onSubmit: () => void;
}

export interface SpeakerDecideScreenProps extends BaseScreenProps {
  speakerChoice: 'AI' | 'Self' | null;
  onChoice: (choice: 'AI' | 'Self') => void;
  prepTimeRemaining: number;
}

export interface VotingScreenProps extends BaseScreenProps {
  hasVoted: boolean;
  myVote: 'AI' | 'Self' | null;
  timeRemaining: number;
  isVotingOpen: boolean;
  onVote: (guess: 'AI' | 'Self') => void;
}

export interface ResultScreenProps extends BaseScreenProps {
  myVote: 'AI' | 'Self' | null;
  isSpeaker: boolean;
}

// Utility types
export const COLOR_OPTIONS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#A8E6CF',
  '#FF8B94',
  '#C7CEEA'
] as const;

export type PlayerColor = typeof COLOR_OPTIONS[number];
