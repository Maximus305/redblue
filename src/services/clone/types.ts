import { Timestamp } from 'firebase/firestore';

export interface ClonePlayer {
  id: string;
  name: string;
  teamId: 'A' | 'B';
  hasCloneProfile: boolean;
  cloneInfo?: string;
  isHost?: boolean;
  platform?: 'mobile' | 'web' | 'cloneplay' | 'rn' | 'ios';
  joinedAt?: Timestamp;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface CloneGameState {
  gamePhase: 'clone_creation' | 'team_assignment' | 'waiting' | 'questioning' | 'waiting_for_response' | 'responding' | 'voting' | 'results' | 'game_over' | 'master_review';
  topic?: string;
  teamAScore: number;
  teamBScore: number;
  players: ClonePlayer[];
  roundNumber: number;
  questioningTeam?: 'A' | 'B';
  currentPlayer?: string;
  playersAnswered?: string[];
  currentQuestion?: string;
  playerResponse?: string;
  usedClone?: boolean;
  awaitingResponse?: boolean;
  responseSubmittedAt?: Timestamp;
  votes?: {
    human?: string[];
    clone?: string[];
  };
  playerVotes?: { [playerId: string]: 'human' | 'clone' };
  votesSubmitted?: number;
  totalVoters?: number;
  roundResult?: {
    guess?: 'human' | 'clone';
    actual?: 'human' | 'clone';
    correct: boolean;
    teamThatGuessed?: 'A' | 'B';
    teamThatResponded?: 'A' | 'B';
    humanVotes?: number;
    cloneVotes?: number;
  };
  lastUpdated?: Timestamp;
}

export interface CreateCloneResponse {
  success: boolean;
  message?: string;
}

export const getTeamColor = (team: 'A' | 'B'): string => team === 'A' ? 'Red' : 'Yellow';
export const getTeamColorCode = (team: 'A' | 'B'): string => team === 'A' ? '#DC2626' : '#EAB308';
export const getTeamColorClass = (team: 'A' | 'B'): string => team === 'A' ? 'text-red-600' : 'text-yellow-600';
export const getTeamBgClass = (team: 'A' | 'B'): string => team === 'A' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
export const getTeamEmoji = (team: 'A' | 'B'): string => team === 'A' ? '🔴' : '🟡';
export const getTeamImage = (team: 'A' | 'B'): string => team === 'A' ? '/teamred.png' : '/teamyellow.png';
