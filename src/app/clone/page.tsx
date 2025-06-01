"use client"
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Target, Clock, CheckCircle } from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
// Import your existing Firebase setup
import { db } from '@/lib/firebase';

// Type definitions
interface CloneInfo {
  personalityTraits: string;
  favoriteThings: string;
  backgroundInfo: string;
  speechPatterns: string;
}

interface Player {
  id: string;
  name: string;
  teamId: 'A' | 'B' | null;
  hasCloneProfile: boolean;
}

interface RoomData {
  gameState: 'waiting' | 'playing' | 'finished';
  category: string;
  players: Player[];
  teamAScore?: number;
  teamBScore?: number;
}

interface JoinRoomResponse {
  success: boolean;
  playerId: string;
}

interface CreateCloneResponse {
  success: boolean;
}

type GameState = 'joining' | 'waiting' | 'creating-clone' | 'playing';

// Firebase functions using the same patterns as your working agent page
const firebaseApi = {
  joinRoom: async (roomId: string, playerName: string): Promise<JoinRoomResponse> => {
    try {
      console.log(`Joining room ${roomId} as ${playerName}`);
      
      // Check if room exists (using same pattern as agent page)
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomDoc.data();
      if (!roomData?.active) {
        throw new Error('This room is no longer active');
      }
      
      // Generate a unique player ID (matching agent pattern)
      const playerId = `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create player document using the pattern from agent page
      const playerKey = `${roomId}_${playerId}`;
      const playerRef = doc(db, 'agents', playerKey); // Use agents collection like the working code
      await setDoc(playerRef, {
        agentId: playerId,
        agentName: playerName,
        roomId: roomId,
        codeWord: '',
        isSpy: false,
        platform: 'web',
        gameType: 'clone', // Mark as clone game player
        teamId: null,
        hasCloneProfile: false,
        joinedAt: serverTimestamp()
      });
      
      // Update room's last activity (same as agent page)
      await updateDoc(roomRef, {
        lastActivity: serverTimestamp(),
        lastPlayerJoined: playerName
      });
      
      return { success: true, playerId };
    } catch (error: unknown) {
      console.error('Error joining room:', error);
      
      // Handle specific Firebase errors
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'unavailable' || firebaseError.code === 'deadline-exceeded') {
        throw new Error('Connection timeout. Please check your internet connection and try again.');
      } else if (firebaseError.code === 'permission-denied') {
        throw new Error('Permission denied. Please check if the room exists.');
      } else if (firebaseError.message === 'Room not found') {
        throw new Error('Room not found. Please check the room ID.');
      }
      
      throw new Error(firebaseError.message || 'Failed to join room. Please try again.');
    }
  },
  
  createCloneProfile: async (roomId: string, playerId: string, cloneInfo: CloneInfo): Promise<CreateCloneResponse> => {
    try {
      console.log(`Creating clone profile for ${playerId}:`, cloneInfo);
      
      // Combine all clone info into a single string for the AI
      const combinedCloneInfo = `
        Personality: ${cloneInfo.personalityTraits}
        Favorites: ${cloneInfo.favoriteThings}
        Background: ${cloneInfo.backgroundInfo}
        Speech: ${cloneInfo.speechPatterns}
      `.trim();
      
      // Update player document with clone information (using agents collection)
      const playerKey = `${roomId}_${playerId}`;
      const playerRef = doc(db, 'agents', playerKey);
      await updateDoc(playerRef, {
        cloneInfo: combinedCloneInfo,
        hasCloneProfile: true,
        cloneCreatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Error creating clone profile:', error);
      
      // Handle specific Firebase errors
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'unavailable' || firebaseError.code === 'deadline-exceeded') {
        throw new Error('Connection timeout. Please try again.');
      }
      
      throw new Error(firebaseError.message || 'Failed to create clone profile. Please try again.');
    }
  },
  
  listenToRoom: (roomId: string, callback: (data: RoomData) => void): (() => void) => {
    const unsubscribers: (() => void)[] = [];
    let isActive = true;
    
    try {
      // Listen to room document for game state (same as agent page)
      const roomRef = doc(db, 'rooms', roomId);
      const roomUnsubscribe = onSnapshot(
        roomRef, 
        (doc) => {
          if (!isActive) return;
          
          if (doc.exists()) {
            const roomData = doc.data();
            console.log('Room data updated:', roomData);
          }
        },
        (error) => {
          console.error('Room listener error:', error);
          if ((error as { code?: string }).code === 'unavailable') {
            console.log('Firestore temporarily unavailable, will retry...');
          }
        }
      );
      unsubscribers.push(roomUnsubscribe);
      
      // Listen to agents collection for clone players (using same collection as working code)
      const agentsRef = collection(db, 'agents');
      const agentsUnsubscribe = onSnapshot(
        agentsRef, 
        async (snapshot) => {
          if (!isActive) return;
          
          try {
            const players: Player[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              // Only include clone game players from this room
              if (data.roomId === roomId && data.gameType === 'clone') {
                players.push({
                  id: data.agentId || doc.id,
                  name: data.agentName || data.agentId || doc.id,
                  teamId: data.teamId || null,
                  hasCloneProfile: data.hasCloneProfile || false
                });
              }
            });
            
            // Get room data for game state and category
            const roomDoc = await getDoc(roomRef);
            const roomData = roomDoc.data();
            
            callback({
              gameState: roomData?.gameState || 'waiting',
              category: roomData?.category || 'Food',
              players: players,
              teamAScore: roomData?.teamAScore || 0,
              teamBScore: roomData?.teamBScore || 0
            });
          } catch (error) {
            console.error('Error processing players update:', error);
          }
        },
        (error) => {
          console.error('Players listener error:', error);
          if ((error as { code?: string }).code === 'unavailable') {
            console.log('Firestore temporarily unavailable, will retry...');
          }
        }
      );
      unsubscribers.push(agentsUnsubscribe);
      
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
    
    // Return cleanup function
    return () => {
      isActive = false;
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
    };
  }
};

const CloneGamePlayer: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('joining');
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Clone profile states
  const [cloneInfo, setCloneInfo] = useState<CloneInfo>({
    personalityTraits: '',
    favoriteThings: '',
    backgroundInfo: '',
    speechPatterns: ''
  });

  // Listen to room updates when player is in a room
  useEffect(() => {
    if (gameState === 'waiting' && roomId && playerId) {
      const unsubscribe = firebaseApi.listenToRoom(roomId, (data: RoomData) => {
        setRoomData(data);
        
        // Check if game has started
        if (data.gameState === 'playing') {
          setGameState('playing');
        }
      });
      
      return unsubscribe;
    }
  }, [gameState, roomId, playerId]);

  const handleJoinRoom = async (): Promise<void> => {
    if (!roomId.trim() || !playerName.trim()) {
      setError('Please enter both room ID and your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await firebaseApi.joinRoom(roomId.trim().toUpperCase(), playerName.trim());
      if (result.success) {
        setPlayerId(result.playerId);
        setGameState('creating-clone');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to join room. Please check the room ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClone = async (): Promise<void> => {
    if (!playerId || !roomId) {
      setError('Missing player or room information');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await firebaseApi.createCloneProfile(roomId, playerId, cloneInfo);
      if (result.success) {
        setGameState('waiting');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create clone profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void): void => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const renderJoinScreen = (): React.ReactElement => (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Join Clone Game
        </h1>
        <p className="text-gray-600">
          Enter the room ID to join the identity challenge
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
            Room ID
          </label>
          <input
            type="text"
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
            placeholder="Enter room ID..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleJoinRoom}
          disabled={isLoading || !roomId.trim() || !playerName.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Joining...' : 'Join Game'}
        </button>
      </div>
    </div>
  );

  const renderCloneCreation = (): React.ReactElement => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Create Your Clone
        </h1>
        <p className="text-gray-600">
          Provide information that will help AI create your digital twin
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="personalityTraits" className="block text-sm font-medium text-gray-700 mb-2">
            Personality Traits
          </label>
          <textarea
            id="personalityTraits"
            value={cloneInfo.personalityTraits}
            onChange={(e) => setCloneInfo(prev => ({...prev, personalityTraits: e.target.value}))}
            placeholder="Describe your personality (e.g., outgoing, thoughtful, sarcastic, optimistic...)"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="favoriteThings" className="block text-sm font-medium text-gray-700 mb-2">
            Favorite Things
          </label>
          <textarea
            id="favoriteThings"
            value={cloneInfo.favoriteThings}
            onChange={(e) => setCloneInfo(prev => ({...prev, favoriteThings: e.target.value}))}
            placeholder="Your favorite foods, movies, hobbies, places, etc."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="backgroundInfo" className="block text-sm font-medium text-gray-700 mb-2">
            Background &amp; Experiences
          </label>
          <textarea
            id="backgroundInfo"
            value={cloneInfo.backgroundInfo}
            onChange={(e) => setCloneInfo(prev => ({...prev, backgroundInfo: e.target.value}))}
            placeholder="Your background, memorable experiences, places you've lived, etc."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="speechPatterns" className="block text-sm font-medium text-gray-700 mb-2">
            How You Speak
          </label>
          <textarea
            id="speechPatterns"
            value={cloneInfo.speechPatterns}
            onChange={(e) => setCloneInfo(prev => ({...prev, speechPatterns: e.target.value}))}
            placeholder="Common phrases you use, how you express yourself, your speaking style..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleCreateClone}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating Clone...' : 'Create My Clone'}
        </button>
      </div>
    </div>
  );

  const renderWaitingRoom = (): React.ReactElement => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Waiting for Game to Start
        </h1>
        <p className="text-gray-600">
          Room ID: <span className="font-mono font-semibold">{roomId}</span>
        </p>
      </div>

      {roomData && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Game Category</h3>
            <p className="text-blue-700">{roomData.category}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Team A */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Team A
              </h3>
              <div className="space-y-2">
                {roomData.players
                  .filter(player => player.teamId === 'A')
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm font-medium">{player.name}</span>
                      {player.hasCloneProfile && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))}
                {roomData.players.filter(player => player.teamId === 'A').length === 0 && (
                  <div className="text-sm text-gray-500 italic">No players assigned</div>
                )}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Team B
              </h3>
              <div className="space-y-2">
                {roomData.players
                  .filter(player => player.teamId === 'B')
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm font-medium">{player.name}</span>
                      {player.hasCloneProfile && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))}
                {roomData.players.filter(player => player.teamId === 'B').length === 0 && (
                  <div className="text-sm text-gray-500 italic">No players assigned</div>
                )}
              </div>
            </div>

            {/* Unassigned */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Unassigned
              </h3>
              <div className="space-y-2">
                {roomData.players
                  .filter(player => !player.teamId)
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm font-medium">{player.name}</span>
                      {player.hasCloneProfile && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))}
                {roomData.players.filter(player => !player.teamId).length === 0 && (
                  <div className="text-sm text-gray-500 italic">All players assigned</div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Waiting for the host to start the game...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">How to Play</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Teams take turns having a member answer questions</li>
              <li>• You can answer as yourself OR use your AI clone&apos;s response</li>
              <li>• The other team tries to guess if it was you or your clone</li>
              <li>• Points are awarded for correct identifications</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const renderGamePlay = (): React.ReactElement => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Target className="w-8 h-8 text-orange-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Game Started!
      </h1>
      <p className="text-gray-600 mb-8">
        The game has begun. Follow the host&apos;s instructions for your turn.
      </p>
      
      <div className="space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="font-semibold text-orange-900 mb-2">Your Role</h3>
          <p className="text-orange-700">
            When it&apos;s your turn, you&apos;ll be asked a question. You can choose to answer 
            authentically as yourself, or read the AI-generated response from your clone. 
            The opposing team will try to guess which one you chose!
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Current Turn</h3>
          <p className="text-blue-700">
            Waiting for host to manage game flow...
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <h4 className="font-semibold text-red-900 mb-1">Team A</h4>
            <p className="text-2xl font-bold text-red-700">{roomData?.teamAScore || 0}</p>
            <p className="text-sm text-red-600">Points</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <h4 className="font-semibold text-blue-900 mb-1">Team B</h4>
            <p className="text-2xl font-bold text-blue-700">{roomData?.teamBScore || 0}</p>
            <p className="text-sm text-blue-600">Points</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        {gameState === 'joining' && renderJoinScreen()}
        {gameState === 'creating-clone' && renderCloneCreation()}
        {gameState === 'waiting' && renderWaitingRoom()}
        {gameState === 'playing' && renderGamePlay()}
      </div>
    </div>
  );
};

export default CloneGamePlayer;