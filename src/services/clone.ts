import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import LobbyService, { Member } from './lobby';

// Type definitions
export interface ClonePlayer {
  id: string;
  name: string;
  teamId: 'A' | 'B';
  hasCloneProfile: boolean;
  cloneInfo?: string;
  isHost: boolean;
  platform: 'web' | 'ios';
  joinedAt: Timestamp;
}

export interface CloneGameState {
  gamePhase: 'team_assignment' | 'clone_creation' | 'questioning' | 'waiting_for_response' | 'master_review' | 'voting' | 'results';
  topic: string;
  currentPlayer?: string;
  playersAnswered?: string[];     // Track which players have already been questioned
  questioningTeam?: 'A' | 'B';    // Which team is asking questions this round
  currentQuestion?: string;
  questionAskedAt?: Timestamp;
  awaitingResponse?: boolean;     // Master waiting for player response
  responseReady?: boolean;        // Player response ready for master
  playerResponse?: string;        // Player's chosen response
  humanResponse?: string;         // Player's typed response (if chosen)
  cloneResponse?: string;         // AI generated response  
  usedClone?: boolean;           // What player actually chose
  responseSubmittedAt?: Timestamp; // When player responded
  teamAScore: number;
  teamBScore: number;
  players: ClonePlayer[];
  roundNumber: number;
  masterGuess?: 'human' | 'clone';
  // Voting system fields
  votes?: {
    human?: string[];           // Array of player IDs who voted human
    clone?: string[];           // Array of player IDs who voted clone
  };
  playerVotes?: { [playerId: string]: 'human' | 'clone' }; // Individual player votes
  votesSubmitted?: number;      // Number of votes submitted
  totalVoters?: number;         // Total number of players who should vote
  roundResult?: {
    guess: 'human' | 'clone';   // Team's majority guess
    actual: 'human' | 'clone';  // What it actually was
    correct: boolean;           // Whether the guess was correct
    humanVotes: number;         // Number of human votes
    cloneVotes: number;         // Number of clone votes
  };
  lastUpdated: Timestamp;
}

// Team color mapping
export const getTeamColor = (team: 'A' | 'B'): string => team === 'A' ? 'Red' : 'Blue';
export const getTeamColorCode = (team: 'A' | 'B'): string => team === 'A' ? '#DC2626' : '#2563EB';
export const getTeamColorClass = (team: 'A' | 'B'): string => team === 'A' ? 'text-red-600' : 'text-blue-600';
export const getTeamBgClass = (team: 'A' | 'B'): string => team === 'A' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
export const getTeamEmoji = (team: 'A' | 'B'): string => team === 'A' ? '🔴' : '🔵';

export interface JoinRoomResponse {
  success: boolean;
  playerId: string;
  roomData?: CloneGameState;
}

export interface CreateCloneResponse {
  success: boolean;
  message?: string;
}

// AI Response Generation using ChatGPT
export async function generateCloneResponse(cloneData: string, question: string, topic?: string): Promise<string> {
  try {
    // Try to use ChatGPT API
    const response = await fetch('/api/generate-clone-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cloneData,
        question,
        topic: topic || 'General'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.response;
    }

    // Fallback to simple generator if API fails
    console.warn('API call failed, using fallback generator');
    return generateFallbackResponse(cloneData, question);
    
  } catch (error) {
    console.error('Error generating clone response:', error);
    return generateFallbackResponse(cloneData, question);
  }
}

// Fallback response generator
// Enhanced fallback response generator - matches API version
function generateFallbackResponse(cloneData: string, question: string): string {
  const lowerData = cloneData.toLowerCase();
  
  // Base responses by personality type
  const responses = {
    sarcastic: [
      "Oh, what a totally original question...",
      "Well, that's definitely something I haven't heard before.",
      "Let me consult my crystal ball... nope, still unclear.",
      "Wow, really making me think outside the box here.",
    ],
    funny: [
      "That's like asking me to pick my favorite child!",
      "Ha! You really want to open that can of worms?",
      "Oh boy, where do I even start with that one?",
      "That's a question that could start a whole debate!",
    ],
    thoughtful: [
      "That's a really deep question... I'd need to think about it.",
      "Hmm, there are so many layers to consider with that.",
      "You know, that touches on something I've been pondering lately.",
      "That's the kind of question that keeps me up at night.",
    ],
    energetic: [
      "Oh wow! That's such a great question!",
      "I LOVE questions like this! So many possibilities!",
      "Ooh, that's exciting to think about!",
      "Yes! Finally someone asking the good questions!",
    ],
    serious: [
      "That's a very important question to consider.",
      "I think that deserves a thoughtful response.",
      "That's something I take quite seriously.",
      "That requires careful consideration.",
    ]
  };
  
  // Default responses
  const defaultResponses = [
    "That's an interesting question... I'd say it depends.",
    "Hmm, I have mixed feelings about that.",
    "You know, that's actually pretty intriguing.",
    "I'd probably approach it differently than most people.",
  ];
  
  // Determine personality type and select appropriate response
  let selectedResponses = defaultResponses;
  
  if (lowerData.includes('sarcastic') || lowerData.includes('sarcasm')) {
    selectedResponses = responses.sarcastic;
  } else if (lowerData.includes('funny') || lowerData.includes('humor') || lowerData.includes('comedian')) {
    selectedResponses = responses.funny;
  } else if (lowerData.includes('thoughtful') || lowerData.includes('philosophical') || lowerData.includes('deep')) {
    selectedResponses = responses.thoughtful;
  } else if (lowerData.includes('energetic') || lowerData.includes('outgoing') || lowerData.includes('enthusiastic')) {
    selectedResponses = responses.energetic;
  } else if (lowerData.includes('serious') || lowerData.includes('professional') || lowerData.includes('formal')) {
    selectedResponses = responses.serious;
  }
  
  return selectedResponses[Math.floor(Math.random() * selectedResponses.length)];
}

// Firebase Functions
export class CloneGameService {
  
  static async initializeCloneGame(roomId: string, hostId: string): Promise<void> {
    try {
      // First ensure the room document exists
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        // Create the room document if it doesn't exist
        await setDoc(roomRef, {
          roomId: roomId,
          active: true,
          gameMode: 'clone',
          gameState: 'waiting',
          hostId: hostId,
          createdAt: serverTimestamp(),
          lastActivity: serverTimestamp()
        });
        console.log(`Created room document: ${roomId}`);
      }

      // Get all members from the room using the new lobby system
      const members = await LobbyService.getRoomMembers(roomId);
      
      console.log('Starting clone game with members:', members.map(m => ({
        id: m.memberId,
        name: m.displayName,
        hasCloneProfile: m.hasCloneProfile,
        hasCloneInfo: !!m.cloneInfo,
        cloneInfoLength: m.cloneInfo?.length || 0
      })));
      
      const players: ClonePlayer[] = members.map(member => ({
        id: member.memberId,
        name: member.displayName,
        teamId: 'A', // Will be balanced later
        hasCloneProfile: member.hasCloneProfile || false,
        cloneInfo: member.cloneInfo,
        isHost: member.role === 'host',
        platform: member.platform,
        joinedAt: member.joinedAt || serverTimestamp() as Timestamp
      }));

      // Auto-balance teams
      const balancedPlayers = this.autoBalanceTeams(players);

      // Create clone game document
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameState: CloneGameState = {
        gamePhase: 'clone_creation',
        topic: 'General',
        teamAScore: 0,
        teamBScore: 0,
        players: balancedPlayers,
        roundNumber: 1,
        lastUpdated: serverTimestamp() as Timestamp
      };

      await setDoc(cloneGameRef, gameState);

      // Update members with team assignments
      for (const player of balancedPlayers) {
        await LobbyService.updateMember(roomId, player.id, {
          teamId: player.teamId,
          hasCloneProfile: player.hasCloneProfile,
          cloneInfo: player.cloneInfo
        });
      }

      // Update room gameState
      await updateDoc(roomRef, {
        gameState: 'waiting',
        gameMode: 'clone',
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Clone game initialized for room ${roomId} with ${players.length} players`);
    } catch (error) {
      console.error('Error initializing clone game:', error);
      throw error;
    }
  }

  static autoBalanceTeams(players: ClonePlayer[]): ClonePlayer[] {
    const balancedPlayers = [...players];
    
    // Shuffle players randomly
    for (let i = balancedPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balancedPlayers[i], balancedPlayers[j]] = [balancedPlayers[j], balancedPlayers[i]];
    }

    // Assign alternating teams
    balancedPlayers.forEach((player, index) => {
      player.teamId = index % 2 === 0 ? 'A' : 'B';
    });

    console.log('Teams balanced:', {
      teamA: balancedPlayers.filter(p => p.teamId === 'A').length,
      teamB: balancedPlayers.filter(p => p.teamId === 'B').length
    });

    return balancedPlayers;
  }

  // Validate and fix inconsistent clone profile states
  static async validateAndFixCloneProfiles(roomId: string, gameData: CloneGameState): Promise<void> {
    console.log('🔍 Validating clone profile consistency...');
    
    let hasInconsistencies = false;
    const fixes: string[] = [];
    const missingProfiles: string[] = [];
    
    // Get all members from lobby to cross-reference
    const members = await LobbyService.getRoomMembers(roomId);
    const memberMap = new Map(members.map(m => [m.memberId, m]));
    
    console.log('Players to validate:', gameData.players.map(p => ({
      id: p.id, 
      name: p.name, 
      hasCloneProfile: p.hasCloneProfile,
      hasCloneInfo: !!p.cloneInfo
    })));
    
    const updatedPlayers = gameData.players.map(player => {
      let memberData = memberMap.get(player.id);
      
      // Handle web player IDs - try different formats
      if (!memberData && player.id.startsWith('web_')) {
        // Try to find by name if ID doesn't match
        memberData = members.find(m => m.displayName === player.name);
        if (memberData) {
          console.log(`🔧 Found member data for ${player.name} by name instead of ID`);
        }
      }
      
      // Check multiple possible clone data fields for compatibility
      const hasActualCloneData = player.cloneInfo || 
                                (memberData && memberData.cloneInfo);
      
      // CASE 1: Player has hasCloneProfile: true but no actual clone data
      if (player.hasCloneProfile && !hasActualCloneData) {
        console.error(`❌ INCONSISTENCY: Player ${player.name} (${player.id}) missing clone profile: {"hasCloneData": ${!!hasActualCloneData}, "hasCloneProfile": ${player.hasCloneProfile}}`);
        
        // Try to restore from member data
        if (memberData && memberData.cloneInfo) {
          console.log(`🔧 FIX: Restoring cloneInfo for ${player.name} from lobby data`);
          fixes.push(`Restored ${player.name}'s clone info from lobby`);
          return { ...player, cloneInfo: memberData.cloneInfo };
        } else {
          console.log(`🔧 FIX: Setting ${player.name}'s hasCloneProfile to false (no data found)`);
          fixes.push(`Reset ${player.name}'s profile flag to match reality`);
          hasInconsistencies = true;
          missingProfiles.push(player.name);
          return { ...player, hasCloneProfile: false, cloneInfo: undefined };
        }
      }
      
      // CASE 2: Player has cloneInfo but hasCloneProfile: false
      if (!player.hasCloneProfile && player.cloneInfo) {
        console.warn(`❌ INCONSISTENCY: ${player.name} has cloneInfo but hasCloneProfile: false`);
        console.log(`🔧 FIX: Setting ${player.name}'s hasCloneProfile to true`);
        fixes.push(`Set ${player.name}'s profile flag to true`);
        return { ...player, hasCloneProfile: true };
      }
      
      // CASE 3: Player has neither flag nor data
      if (!player.hasCloneProfile && !player.cloneInfo) {
        missingProfiles.push(player.name);
      }
      
      return player;
    });
    
    // Update game data if there were inconsistencies
    if (fixes.length > 0) {
      console.log('🔧 Applying fixes:', fixes);
      
      const cloneGameRef = doc(db, 'clone_games', roomId);
      await updateDoc(cloneGameRef, {
        players: updatedPlayers,
        gamePhase: hasInconsistencies ? 'clone_creation' : gameData.gamePhase,
        lastUpdated: serverTimestamp()
      });
      
      // Also fix lobby member data
      for (const player of updatedPlayers) {
        const originalPlayer = gameData.players.find(p => p.id === player.id);
        if (originalPlayer && (originalPlayer.hasCloneProfile !== player.hasCloneProfile || originalPlayer.cloneInfo !== player.cloneInfo)) {
          await LobbyService.updateMember(roomId, player.id, {
            hasCloneProfile: player.hasCloneProfile,
            cloneInfo: player.cloneInfo
          });
        }
      }
      
      console.log('✅ Profile consistency fixes applied');
      
      if (hasInconsistencies || missingProfiles.length > 0) {
        if (missingProfiles.length > 0) {
          console.error(`❌ ERROR  Cannot start questioning phase. Missing clone profiles for: ${missingProfiles.join(', ')}`);
        }
        throw new Error('Inconsistent clone profiles detected and fixed. Game has been returned to clone creation phase. Please ensure all players complete their profiles.');
      }
    } else {
      console.log('✅ All clone profiles are consistent');
      
      // Final check for any remaining missing profiles
      if (missingProfiles.length > 0) {
        console.error(`❌ ERROR  Cannot start questioning phase. Missing clone profiles for: ${missingProfiles.join(', ')}`);
        throw new Error(`Cannot start questioning phase. Missing clone profiles for: ${missingProfiles.join(', ')}`);
      }
    }
  }

  static async saveCloneData(roomId: string, playerId: string, personalityText: string): Promise<CreateCloneResponse> {
    try {
      console.log('saveCloneData called with:', {
        roomId,
        playerId,
        personalityTextLength: personalityText.length,
        personalityTextPreview: personalityText.substring(0, 100)
      });

      // Update member in the room (lobby members collection)
      console.log('Updating lobby members collection...');
      await LobbyService.updateMember(roomId, playerId, {
        cloneInfo: personalityText,
        hasCloneProfile: true
      });
      console.log('✅ Lobby member updated successfully');

      // Update clone game with player's profile status
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (gameDoc.exists()) {
        console.log('Clone game document exists, updating players...');
        const gameData = gameDoc.data() as CloneGameState;
        const updatedPlayers = gameData.players.map(player => 
          player.id === playerId 
            ? { ...player, hasCloneProfile: true, cloneInfo: personalityText }
            : player
        );

        // Check if all players now have clone profiles with actual data
        const allPlayersHaveProfiles = updatedPlayers.every(player => 
          player.hasCloneProfile && (player.cloneInfo || player.cloneData)
        );
        console.log('All players have profiles:', allPlayersHaveProfiles);
        console.log('Player profile status:', updatedPlayers.map(p => ({
          name: p.name,
          hasCloneProfile: p.hasCloneProfile,
          hasCloneData: !!(p.cloneData && p.cloneData.trim()),
          hasCloneInfo: !!(p.cloneInfo && p.cloneInfo.trim()),
          dataLength: (p.cloneInfo || p.cloneData || '').length
        })));

        const updateData: any = {
          players: updatedPlayers,
          lastUpdated: serverTimestamp()
        };

        // If all players have created their clones, stay in clone_creation
        // Let startGame() handle the proper transition to questioning phase
        if (allPlayersHaveProfiles) {
          console.log('All clone profiles complete, ready for game start');
          // Don't auto-transition to questioning - let startGame() handle it properly
        }

        await updateDoc(cloneGameRef, updateData);
        console.log('Clone game updated successfully');
      } else {
        console.log('Clone game document does not exist for room:', roomId);
      }

      return { success: true, message: 'Clone profile created successfully' };
    } catch (error) {
      console.error('Error saving clone data:', error);
      return { success: false, message: 'Failed to save clone profile' };
    }
  }

  static async startCloneGame(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Clone game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      
      // COMPREHENSIVE VALIDATION: Check for inconsistencies and fix them
      await this.validateAndFixCloneProfiles(roomId, gameData);
      
      // Re-fetch game data after potential fixes
      const updatedGameDoc = await getDoc(cloneGameRef);
      const updatedGameData = updatedGameDoc.data() as CloneGameState;
      
      // Check if all players have complete clone profiles (both flag and data)
      const playersWithoutProfiles = updatedGameData.players.filter(p => !p.hasCloneProfile || !p.cloneInfo);
      if (playersWithoutProfiles.length > 0) {
        console.error('Players without complete profiles:', playersWithoutProfiles.map(p => ({
          id: p.id,
          name: p.name,
          hasCloneProfile: p.hasCloneProfile,
          hasCloneInfo: !!p.cloneInfo
        })));
        const playerNames = playersWithoutProfiles.map(p => p.name).join(', ');
        throw new Error(`The following players haven't created their clone profiles yet: ${playerNames}`);
      }

      // Start the questioning phase - Team A (Red) goes first
      // Team A questions → Team B player responds (as per documentation)
      const firstTeamBPlayer = gameData.players.find(p => p.teamId === 'B');
      
      if (!firstTeamBPlayer) {
        throw new Error('No Team B players found to be questioned');
      }
      
      console.log(`Starting game: Red Team questions → Blue Team's ${firstTeamBPlayer.name} responds`);
      
      await updateDoc(cloneGameRef, {
        gamePhase: 'questioning',
        currentPlayer: firstTeamBPlayer.id,
        questioningTeam: 'A', // Team A (Red) asks first question
        playersAnswered: [], // Initialize the tracking array
        lastUpdated: serverTimestamp()
      });

      // Update room state
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        gameState: 'playing',
        lastActivity: serverTimestamp()
      });

      console.log(`✅ Clone game started for room ${roomId}`);
    } catch (error) {
      console.error('Error starting clone game:', error);
      throw error;
    }
  }

  // Master submits question for current player
  static async submitQuestion(roomId: string, question: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      let currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayer);
      
      if (!currentPlayer) {
        throw new Error('Current player not found');
      }
      
      // Validate that the questioning team is not questioning their own player
      if (currentPlayer.teamId === gameData.questioningTeam) {
        console.error(`ERROR: Team ${gameData.questioningTeam} is trying to question their own player ${currentPlayer.name}`);
        throw new Error(`Invalid game state: Team ${getTeamColor(gameData.questioningTeam)} cannot question their own player`);
      }
      
      console.log(`${getTeamColor(gameData.questioningTeam!)} Team submitting question for ${getTeamColor(currentPlayer.teamId)} Team's ${currentPlayer.name}`);

      // If cloneInfo is missing from the game state, try to restore from lobby
      if (!currentPlayer.cloneInfo) {
        console.log('Clone info missing from game state for player:', {
          playerId: gameData.currentPlayer,
          playerName: currentPlayer.name,
          hasCloneProfile: currentPlayer.hasCloneProfile
        });

        // Try to get from lobby members
        const members = await LobbyService.getRoomMembers(roomId);
        const memberData = members.find(m => m.memberId === gameData.currentPlayer);

        if (memberData && memberData.cloneInfo) {
          currentPlayer.cloneInfo = memberData.cloneInfo;

          // Update the game state with the clone info to prevent future issues
          const updatedPlayers = gameData.players.map(p =>
            p.id === gameData.currentPlayer
              ? { ...p, cloneInfo: memberData.cloneInfo, hasCloneProfile: true }
              : p
          );

          await updateDoc(cloneGameRef, {
            players: updatedPlayers
          });

          console.log('Clone info restored from lobby');
        } else {
          // Player marked as having profile but no actual cloneInfo found
          console.error('INCONSISTENCY DETECTED: Player marked as having profile but no clone data found');
          console.error('Room ID:', roomId);
          console.error('Player ID:', gameData.currentPlayer);
          console.error('Player Name:', currentPlayer.name);

          // AUTO-FIX: Set hasCloneProfile to false to match reality
          const updatedPlayers = gameData.players.map(p =>
            p.id === gameData.currentPlayer
              ? { ...p, hasCloneProfile: false, cloneInfo: undefined }
              : p
          );

          // Update game state
          await updateDoc(cloneGameRef, {
            players: updatedPlayers,
            gamePhase: 'clone_creation'
          });

          // Also fix the lobby member data
          await LobbyService.updateMember(roomId, gameData.currentPlayer, {
            hasCloneProfile: false,
            cloneInfo: undefined
          });

          console.log('✅ Fixed inconsistent state and returned to clone creation phase');

          throw new Error(`${currentPlayer.name} needs to complete their clone profile. The game has been returned to clone creation phase.`);
        }
      }

      // Generate AI clone response immediately
      const cloneResponse = await generateCloneResponse(currentPlayer.cloneInfo, question, gameData.topic);

      await updateDoc(cloneGameRef, {
        currentQuestion: question,
        questionAskedAt: serverTimestamp(),
        gamePhase: 'waiting_for_response',  // Stay in waiting_for_response until player responds
        cloneResponse,
        // Clear previous response data
        playerResponse: null,
        humanResponse: null,
        usedClone: null,
        responseSubmittedAt: null,
        masterGuess: null,  // Clear previous master guess
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      throw error;
    }
  }

  // Player submits their response choice
  static async submitPlayerResponse(roomId: string, playerId: string, choice: 'human' | 'clone', humanAnswer?: string, aiResponse?: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      
      if (gameData.currentPlayer !== playerId) {
        throw new Error('Not your turn');
      }

      // Player's chosen response (what will be shown to everyone)
      const playerResponse = choice === 'human' ? (humanAnswer || '') : (aiResponse || gameData.cloneResponse || '');

      await updateDoc(cloneGameRef, {
        playerResponse,
        humanResponse: humanAnswer || '',
        cloneResponse: aiResponse || gameData.cloneResponse || '',
        usedClone: choice === 'clone',
        awaitingResponse: false,        // No longer waiting
        responseReady: true,            // Master can proceed
        responseSubmittedAt: serverTimestamp(),
        gamePhase: 'master_review',
        lastUpdated: serverTimestamp()
      });

    } catch (error) {
      console.error('Error submitting player response:', error);
      throw error;
    }
  }

  // Master reveals the chosen response to everyone
  static async revealResponse(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      
      // Validate that player has responded before revealing
      if (gameData.gamePhase !== 'master_review') {
        throw new Error(`Cannot reveal response during ${gameData.gamePhase} phase. Player must respond first.`);
      }
      
      if (!gameData.playerResponse) {
        throw new Error('No player response to reveal. Player must submit their response first.');
      }
      
      const currentAnswers = gameData.currentAnswers || {};

      await updateDoc(cloneGameRef, {
        currentAnswers: {
          ...currentAnswers,
          responseRevealed: true
        },
        gamePhase: 'voting',
        lastUpdated: serverTimestamp()
      });

    } catch (error) {
      console.error('Error revealing response:', error);
      throw error;
    }
  }

  // Player submits their vote during voting phase
  static async submitVote(roomId: string, playerId: string, vote: 'human' | 'clone'): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      
      if (gameData.gamePhase !== 'voting') {
        throw new Error('Voting is not currently active');
      }

      // Get current player and validate they can vote
      const currentPlayer = gameData.players.find(p => p.id === playerId);
      if (!currentPlayer) {
        throw new Error('Player not found');
      }

      // Only questioning team members can vote
      if (currentPlayer.teamId !== gameData.questioningTeam) {
        throw new Error('Only the questioning team can vote');
      }

      // Record the vote
      const votes = gameData.votes || { human: [], clone: [] };
      const playerVotes = gameData.playerVotes || {};
      
      // Remove player from any previous vote
      if (votes.human) votes.human = votes.human.filter(id => id !== playerId);
      if (votes.clone) votes.clone = votes.clone.filter(id => id !== playerId);
      
      // Add to new vote
      if (!votes[vote]) votes[vote] = [];
      votes[vote].push(playerId);
      playerVotes[playerId] = vote;

      // Count votes from questioning team
      const questioningTeamPlayers = gameData.players.filter(p => p.teamId === gameData.questioningTeam);
      const votesSubmitted = questioningTeamPlayers.filter(p => playerVotes[p.id]).length;

      await updateDoc(cloneGameRef, {
        votes,
        playerVotes,
        votesSubmitted,
        totalVoters: questioningTeamPlayers.length,
        lastUpdated: serverTimestamp()
      });

      // If all team members have voted, calculate results
      if (votesSubmitted >= questioningTeamPlayers.length) {
        setTimeout(async () => {
          await this.calculateVotingResults(roomId);
        }, 1000);
      }

    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  }

  // Calculate voting results and update scores
  static async calculateVotingResults(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      const votes = gameData.votes || { human: [], clone: [] };
      
      const humanVotes = votes.human?.length || 0;
      const cloneVotes = votes.clone?.length || 0;
      const majorityGuess = humanVotes > cloneVotes ? 'human' : 'clone';
      const wasCorrect = (majorityGuess === 'clone') === gameData.usedClone;

      // Update scores if questioning team was correct
      let scoreUpdate = {};
      if (wasCorrect && gameData.questioningTeam) {
        if (gameData.questioningTeam === 'A') {
          scoreUpdate = { teamAScore: (gameData.teamAScore || 0) + 1 };
        } else {
          scoreUpdate = { teamBScore: (gameData.teamBScore || 0) + 1 };
        }
      }

      await updateDoc(cloneGameRef, {
        ...scoreUpdate,
        gamePhase: 'results',
        roundResult: {
          guess: majorityGuess,
          actual: gameData.usedClone ? 'clone' : 'human',
          correct: wasCorrect,
          humanVotes,
          cloneVotes
        },
        lastUpdated: serverTimestamp()
      });

      // Auto-advance to next round after showing results
      setTimeout(async () => {
        await this.nextRound(roomId);
      }, 3000);

    } catch (error) {
      console.error('Error calculating voting results:', error);
      throw error;
    }
  }

  // Master records the team's guess (legacy - kept for compatibility)
  static async submitMasterGuess(roomId: string, guess: 'human' | 'clone'): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      await updateDoc(cloneGameRef, {
        masterGuess: guess,
        gamePhase: 'results',
        lastUpdated: serverTimestamp()
      });

      // Auto-advance to next round after showing results
      setTimeout(async () => {
        await this.calculateRoundResults(roomId);
      }, 3000);

    } catch (error) {
      console.error('Error submitting master guess:', error);
      throw error;
    }
  }

  static async calculateRoundResults(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      const masterGuess = gameData.masterGuess;
      const usedClone = gameData.usedClone;
      
      if (usedClone === undefined || !masterGuess) {
        throw new Error('Missing answer or master guess');
      }

      // Check if the opposing team (master) was correct
      // Master guesses 'human' and player used human response OR master guesses 'clone' and player used clone
      const isCorrect = (masterGuess === 'human' && !usedClone) || (masterGuess === 'clone' && usedClone);
      
      // Award points to the questioning team if they were correct
      let scoreUpdate = {};
      const questioningTeam = gameData.questioningTeam;

      if (isCorrect && questioningTeam) {
        // Questioning team wins points for correct guess
        if (questioningTeam === 'A') {
          scoreUpdate = { teamAScore: gameData.teamAScore + 1 };
        } else {
          scoreUpdate = { teamBScore: gameData.teamBScore + 1 };
        }
      }

      // Update scores and advance to next round
      await updateDoc(cloneGameRef, {
        ...scoreUpdate,
        lastUpdated: serverTimestamp()
      });

      // Auto-advance to next round after a delay
      setTimeout(async () => {
        await this.nextRound(roomId);
      }, 2000);

    } catch (error) {
      console.error('Error calculating results:', error);
      throw error;
    }
  }

  static async nextRound(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as CloneGameState;
      
      // According to the documentation:
      // Round 1: Team A questions → Team B player responds
      // Round 2: Team B questions → Team A player responds
      // Round 3: Team A questions → Team B player responds
      
      // Alternate questioning teams each round
      const nextQuestioningTeam = gameData.questioningTeam === 'A' ? 'B' : 'A';
      
      // The team BEING QUESTIONED is opposite of the questioning team
      const teamBeingQuestioned = nextQuestioningTeam === 'A' ? 'B' : 'A';
      const playersFromTeamBeingQuestioned = gameData.players.filter(p => p.teamId === teamBeingQuestioned);
      
      if (playersFromTeamBeingQuestioned.length === 0) {
        throw new Error(`No players found in team ${teamBeingQuestioned} to be questioned`);
      }
      
      // Track which players have already been questioned
      const playersAnswered = gameData.playersAnswered || [];
      
      // Find players from the team being questioned who haven't answered yet
      const availablePlayers = playersFromTeamBeingQuestioned.filter(p => !playersAnswered.includes(p.id));
      
      let nextPlayer;
      if (availablePlayers.length > 0) {
        // Pick the first available player who hasn't been questioned
        nextPlayer = availablePlayers[0];
      } else {
        // All players from this team have been questioned, might be end of game or reset
        console.log('All players from team have been questioned, resetting...');
        nextPlayer = playersFromTeamBeingQuestioned[0];
        // Clear the playersAnswered array for a new cycle
        playersAnswered.length = 0;
      }
      
      // Ensure we preserve all player data including cloneInfo
      console.log(`Round ${gameData.roundNumber + 1}: ${getTeamColor(nextQuestioningTeam)} Team questions → ${getTeamColor(teamBeingQuestioned)} Team's ${nextPlayer.name} responds`);

      await updateDoc(cloneGameRef, {
        gamePhase: 'questioning',
        currentPlayer: nextPlayer.id,
        questioningTeam: nextQuestioningTeam,
        playersAnswered: [...playersAnswered, nextPlayer.id],
        currentQuestion: null,
        questionAskedAt: null,
        playerResponse: null,
        humanResponse: null,
        cloneResponse: null,
        usedClone: null,
        responseSubmittedAt: null,
        masterGuess: null,
        roundNumber: gameData.roundNumber + 1,
        players: gameData.players, // Explicitly preserve players array with all their data
        lastUpdated: serverTimestamp()
      });

    } catch (error) {
      console.error('Error advancing to next round:', error);
      throw error;
    }
  }

  // Real-time listener setup
  static listenToCloneGame(roomId: string, callback: (gameState: CloneGameState | null) => void): () => void {
    const cloneGameRef = doc(db, 'clone_games', roomId);
    
    const unsubscribe = onSnapshot(
      cloneGameRef,
      async (doc) => {
        if (doc.exists()) {
          const gameState = doc.data() as CloneGameState;
          
          // Check for players without team assignments and sync if needed
          // Only sync if game is past team_assignment phase to avoid interfering with initial setup
          if (gameState.gamePhase !== 'team_assignment' && gameState.gamePhase !== 'clone_creation') {
            const playersWithoutTeams = gameState.players.filter(p => !p.teamId);
            if (playersWithoutTeams.length > 0) {
              console.log('🔧 Detected players without team assignments, syncing members...');
              await this.syncMembersToCloneGame(roomId);
              // Return early - the sync will trigger another snapshot
              return;
            }
          }

          // Auto-validate and fix invalid game states
          if (gameState.gamePhase === 'questioning') {
            const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
            if (currentPlayer && gameState.questioningTeam && 
                currentPlayer.teamId === gameState.questioningTeam) {
              console.log('🔧 Detected invalid game state, auto-correcting...');
              await this.validateAndFixGameState(roomId);
              // Return early - the correction will trigger another snapshot
              return;
            }
          }
          
          callback(gameState);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error listening to clone game:', error);
        callback(null);
      }
    );

    return unsubscribe;
  }

  // Update player status (platform, online, last seen)
  static async updatePlayerStatus(roomId: string, playerId: string, updates: {
    platform?: 'cloneplay' | 'redblue';
    isOnline?: boolean;
    lastSeen?: string;
  }): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        console.error('Game not found for player status update');
        return;
      }
      
      const gameData = gameDoc.data() as CloneGameState;
      const updatedPlayers = gameData.players.map(player =>
        player.id === playerId
          ? { ...player, ...updates }
          : player
      );
      
      await updateDoc(cloneGameRef, {
        players: updatedPlayers,
        lastActivity: new Date().toISOString()
      });
      
      console.log(`✅ Updated player ${playerId} status:`, updates);
    } catch (error) {
      console.error('Error updating player status:', error);
    }
  }

  // Validate and auto-correct invalid game states
  static async validateAndFixGameState(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        console.log('Game not found for validation');
        return;
      }
      
      const gameData = gameDoc.data() as CloneGameState;
      
      // Skip validation if game is not in questioning phase
      if (gameData.gamePhase !== 'questioning') {
        return;
      }
      
      // Check if current player and questioning team are set
      if (!gameData.currentPlayer || !gameData.questioningTeam) {
        console.log('Missing currentPlayer or questioningTeam, cannot validate');
        return;
      }
      
      const currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayer);
      
      if (!currentPlayer) {
        console.error('❌ VALIDATION ERROR: Current player not found');
        return;
      }
      
      // Check if questioning team is trying to question their own player
      if (currentPlayer.teamId === gameData.questioningTeam) {
        console.error(`❌ VALIDATION ERROR: Team ${gameData.questioningTeam} is questioning their own player ${currentPlayer.name}`);
        console.log('🔧 AUTO-CORRECTING: Finding player from opposite team...');
        
        // Find the opposite team
        const oppositeTeam = gameData.questioningTeam === 'A' ? 'B' : 'A';
        const oppositeTeamPlayers = gameData.players.filter(p => p.teamId === oppositeTeam);
        
        if (oppositeTeamPlayers.length === 0) {
          console.error('❌ CRITICAL ERROR: No players found in opposite team');
          return;
        }
        
        // Find a player who hasn't been questioned yet, or use the first one
        const playersAnswered = gameData.playersAnswered || [];
        let nextPlayer = oppositeTeamPlayers.find(p => !playersAnswered.includes(p.id));
        
        if (!nextPlayer) {
          // All players have been questioned, use the first one
          nextPlayer = oppositeTeamPlayers[0];
        }
        
        console.log(`🔧 CORRECTED: Switching to ${nextPlayer.name} (Team ${nextPlayer.teamId})`);
        
        // Update the game state with the correct player
        await updateDoc(cloneGameRef, {
          currentPlayer: nextPlayer.id,
          lastUpdated: serverTimestamp()
        });
        
        console.log('✅ Game state corrected successfully');
      } else {
        console.log('✅ Game state validation passed');
      }
      
    } catch (error) {
      console.error('Error validating game state:', error);
    }
  }

  // Sync new members from lobby to clone game with team assignments
  static async syncMembersToCloneGame(roomId: string): Promise<void> {
    try {
      const cloneGameRef = doc(db, 'clone_games', roomId);
      const gameDoc = await getDoc(cloneGameRef);
      
      if (!gameDoc.exists()) {
        console.log('Clone game not found for member sync');
        return;
      }
      
      const gameData = gameDoc.data() as CloneGameState;
      const existingPlayerIds = gameData.players.map(p => p.id);
      
      // Get all members from lobby
      const members = await LobbyService.getRoomMembers(roomId);
      const newMembers = members.filter(m => !existingPlayerIds.includes(m.memberId));
      
      // Also check for existing players without team assignments
      const playersWithoutTeams = gameData.players.filter(p => !p.teamId);
      
      if (newMembers.length === 0 && playersWithoutTeams.length === 0) {
        console.log('No new members to sync and all existing players have teams');
        return;
      }
      
      console.log('Syncing members to clone game:', {
        newMembers: newMembers.map(m => ({ id: m.memberId, name: m.displayName })),
        playersWithoutTeams: playersWithoutTeams.map(p => ({ id: p.id, name: p.name }))
      });
      
      // Create new players with team assignment
      const allPlayers = [...gameData.players];
      
      // Handle new members
      newMembers.forEach(member => {
        // Assign team based on current team balance
        const teamACount = allPlayers.filter(p => p.teamId === 'A').length;
        const teamBCount = allPlayers.filter(p => p.teamId === 'B').length;
        const assignedTeam = teamACount <= teamBCount ? 'A' : 'B';
        
        const newPlayer: ClonePlayer = {
          id: member.memberId,
          name: member.displayName,
          teamId: assignedTeam,
          hasCloneProfile: member.hasCloneProfile || false,
          cloneInfo: member.cloneInfo,
          isHost: member.role === 'host',
          platform: member.platform === 'ios' ? 'ios' : 'web',
          joinedAt: member.joinedAt || serverTimestamp() as Timestamp
        };
        
        allPlayers.push(newPlayer);
        
        console.log(`✅ Added ${member.displayName} to Team ${assignedTeam}`);
      });
      
      // Handle existing players without teams
      playersWithoutTeams.forEach(player => {
        const playerIndex = allPlayers.findIndex(p => p.id === player.id);
        if (playerIndex !== -1) {
          // Assign team based on current team balance
          const teamACount = allPlayers.filter(p => p.teamId === 'A').length;
          const teamBCount = allPlayers.filter(p => p.teamId === 'B').length;
          const assignedTeam = teamACount <= teamBCount ? 'A' : 'B';
          
          allPlayers[playerIndex] = { ...allPlayers[playerIndex], teamId: assignedTeam };
          console.log(`✅ Assigned ${player.name} to Team ${assignedTeam}`);
        }
      });
      
      // Update the clone game with new players
      await updateDoc(cloneGameRef, {
        players: allPlayers,
        lastUpdated: serverTimestamp()
      });
      
      // Update members in lobby with team assignments
      const membersToUpdate = [...newMembers.map(m => m.memberId), ...playersWithoutTeams.map(p => p.id)];
      for (const memberId of membersToUpdate) {
        const player = allPlayers.find(p => p.id === memberId);
        if (player && player.teamId) {
          await LobbyService.updateMember(roomId, memberId, {
            teamId: player.teamId
          });
        }
      }
      
      console.log('✅ Successfully synced members to clone game');
      
    } catch (error) {
      console.error('Error syncing members to clone game:', error);
    }
  }

}

export default CloneGameService;