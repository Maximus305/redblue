"use client"
import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Target } from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
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
  isHost?: boolean;
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

// Firebase functions compatible with iOS app
const firebaseApi = {
  joinRoom: async (roomId: string, playerName: string): Promise<JoinRoomResponse> => {
    try {
      console.log(`Joining room ${roomId} as ${playerName}`);
      
      // Check if room exists
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomDoc.data();
      if (!roomData?.active) {
        throw new Error('This room is no longer active');
      }
      
      // Generate player ID matching iOS app format
      const playerId = `${playerName}_${Date.now()}`;
      
      // Create player document in agents collection (matches iOS app expectation)
      const playerKey = `${roomId}_${playerId}`;
      const playerRef = doc(db, 'agents', playerKey);
      await setDoc(playerRef, {
        agentId: playerId,
        agentName: playerName,
        playerName: playerName, // Add both for compatibility
        roomId: roomId,
        teamId: null, // Will be auto-assigned by iOS app
        hasCloneProfile: false,
        platform: 'web',
        gameType: 'clone',
        joinedAt: serverTimestamp()
      });
      
      // Update room's last activity (triggers iOS app to sync this player)
      await updateDoc(roomRef, {
        lastActivity: serverTimestamp(),
        lastPlayerJoined: playerName
      });
      
      console.log(`✅ Player ${playerName} added to agents collection`);
      
      return { success: true, playerId };
    } catch (error: unknown) {
      console.error('Error joining room:', error);
      
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
      
      // Update player document with clone information
      const playerKey = `${roomId}_${playerId}`;
      const playerRef = doc(db, 'agents', playerKey);
      await updateDoc(playerRef, {
        cloneInfo: combinedCloneInfo,
        hasCloneProfile: true,
        cloneCreatedAt: serverTimestamp()
      });
      
      // ALSO update the clonePlayers collection if it exists (for iOS app compatibility)
      try {
        const clonePlayerRef = doc(db, 'rooms', roomId, 'clonePlayers', playerId);
        const clonePlayerDoc = await getDoc(clonePlayerRef);
        
        if (clonePlayerDoc.exists()) {
          await updateDoc(clonePlayerRef, {
            cloneInfo: combinedCloneInfo,
            hasCloneProfile: true,
            cloneCreatedAt: serverTimestamp()
          });
          console.log(`✅ Updated clonePlayers collection for ${playerId}`);
        }
      } catch {
        // It's okay if clonePlayers doesn't exist yet
        console.log('ClonePlayers collection not found, will be synced by iOS app');
      }
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Error creating clone profile:', error);
      
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
      // Listen to room document for game state
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
        }
      );
      unsubscribers.push(roomUnsubscribe);
      
      // Listen to clonePlayers collection FIRST (primary source for iOS app)
      const clonePlayersRef = collection(db, 'rooms', roomId, 'clonePlayers');
      const clonePlayersUnsubscribe = onSnapshot(
        clonePlayersRef, 
        async (snapshot) => {
          if (!isActive) return;
          
          try {
            const playersFromClone: Player[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              const playerId = data.playerId || doc.id;
              const playerName = data.playerName || data.agentName || playerId;
              
              playersFromClone.push({
                id: playerId,
                name: playerName,
                teamId: data.teamId || null,
                hasCloneProfile: data.hasCloneProfile || false,
                isHost: data.isHost || false
              });
            });
            
            console.log(`📊 ClonePlayers: Found ${playersFromClone.length} players`);
            
            // Get room data for game state and category
            const roomDoc = await getDoc(roomRef);
            const roomData = roomDoc.data();
            
            callback({
              gameState: roomData?.gameState || 'waiting',
              category: roomData?.category || 'Food',
              players: playersFromClone,
              teamAScore: roomData?.teamAScore || 0,
              teamBScore: roomData?.teamBScore || 0
            });
          } catch (error) {
            console.error('Error processing clonePlayers update:', error);
          }
        },
        (error) => {
          console.error('ClonePlayers listener error:', error);
        }
      );
      unsubscribers.push(clonePlayersUnsubscribe);
      
      // FALLBACK: Listen to agents collection if clonePlayers is empty
      const agentsQuery = query(
        collection(db, 'agents'),
        where('roomId', '==', roomId),
        where('gameType', '==', 'clone')
      );
      
      const agentsUnsubscribe = onSnapshot(
        agentsQuery, 
        async (snapshot) => {
          if (!isActive) return;
          
          try {
            // Only use agents as fallback if clonePlayers is empty
            const clonePlayersQuery = collection(db, 'rooms', roomId, 'clonePlayers');
            const clonePlayersSnapshot = await getDocs(clonePlayersQuery);
            
            if (!clonePlayersSnapshot.empty) {
              console.log('📊 ClonePlayers exists, ignoring agents fallback');
              return; // Don't use agents if clonePlayers has data
            }
            
            const playersFromAgents: Player[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.roomId === roomId && data.gameType === 'clone') {
                playersFromAgents.push({
                  id: data.agentId || doc.id,
                  name: data.agentName || data.playerName || data.agentId || doc.id,
                  teamId: data.teamId || null,
                  hasCloneProfile: data.hasCloneProfile || false,
                  isHost: false
                });
              }
            });
            
            console.log(`📊 Agents fallback: Found ${playersFromAgents.length} players`);
            
            // Only use this if we actually have players and no clonePlayers
            if (playersFromAgents.length > 0) {
              const roomDoc = await getDoc(roomRef);
              const roomData = roomDoc.data();
              
              callback({
                gameState: roomData?.gameState || 'waiting',
                category: roomData?.category || 'Food',
                players: playersFromAgents,
                teamAScore: roomData?.teamAScore || 0,
                teamBScore: roomData?.teamBScore || 0
              });
            }
          } catch (error) {
            console.error('Error processing agents update:', error);
          }
        },
        (error) => {
          console.error('Agents listener error:', error);
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
        console.log('📊 Room data updated:', data);
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
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'rgba(0, 69, 255, 0.1)'}}>
          <UserPlus className="w-8 h-8" style={{color: '#0045FF'}} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{color: 'black'}}>
          Join Clone Game
        </h1>
        <p style={{color: 'black'}}>
          Enter the room ID to join the identity challenge
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium mb-2" style={{color: 'black'}}>
            Room ID
          </label>
          <input
            type="text"
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
            placeholder="Enter room ID..."
            className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: 'black'
            }}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="playerName" className="block text-sm font-medium mb-2" style={{color: 'black'}}>
            Your Name
          </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: 'black'
            }}
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
          className="w-full text-white py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: isLoading || !roomId.trim() || !playerName.trim() ? 'rgba(0, 69, 255, 0.5)' : '#0045FF'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && roomId.trim() && playerName.trim()) {
              e.currentTarget.style.backgroundColor = '#0038CC';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && roomId.trim() && playerName.trim()) {
              e.currentTarget.style.backgroundColor = '#0045FF';
            }
          }}
        >
          {isLoading ? 'Joining...' : 'Join Game'}
        </button>
      </div>
    </div>
  );

  const renderCloneCreation = (): React.ReactElement => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'rgba(0, 69, 255, 0.1)'}}>
          <Shield className="w-8 h-8" style={{color: '#0045FF'}} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{color: 'black'}}>
          Create Your Clone
        </h1>
        <p style={{color: 'black'}}>
          Provide information that will help AI create your digital twin
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="personalityTraits" className="block text-sm font-medium mb-2" style={{color: 'black'}}>
            Personality Traits
          </label>
          <textarea
            id="personalityTraits"
            value={cloneInfo.personalityTraits}
            onChange={(e) => setCloneInfo(prev => ({...prev, personalityTraits: e.target.value}))}
            placeholder="Describe your personality (e.g., outgoing, thoughtful, sarcastic, optimistic...)"
            rows={3}
            className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none disabled:opacity-50"
            style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', color: 'black'}}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="favoriteThings" className="block text-sm font-medium mb-2" style={{color: 'black'}}>
            Favorite Things
          </label>
          <textarea
            id="favoriteThings"
            value={cloneInfo.favoriteThings}
            onChange={(e) => setCloneInfo(prev => ({...prev, favoriteThings: e.target.value}))}
            placeholder="Your favorite foods, movies, hobbies, places, etc."
            rows={3}
            className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none disabled:opacity-50"
            style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', color: 'black'}}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="backgroundInfo" className="block text-sm font-medium mb-2" style={{color: 'black'}}>
            Background &amp; Experiences
          </label>
          <textarea
            id="backgroundInfo"
            value={cloneInfo.backgroundInfo}
            onChange={(e) => setCloneInfo(prev => ({...prev, backgroundInfo: e.target.value}))}
            placeholder="Your background, memorable experiences, places you've lived, etc."
            rows={3}
            className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none disabled:opacity-50"
            style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', color: 'black'}}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="speechPatterns" className="block text-sm font-medium mb-2" style={{color: 'black'}}>
            How You Speak
          </label>
          <textarea
            id="speechPatterns"
            value={cloneInfo.speechPatterns}
            onChange={(e) => setCloneInfo(prev => ({...prev, speechPatterns: e.target.value}))}
            placeholder="Common phrases you use, how you express yourself, your speaking style..."
            rows={3}
            className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-offset-2 resize-none disabled:opacity-50"
            style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', color: 'black'}}
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
          className="w-full text-white py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{backgroundColor: isLoading ? 'rgba(0, 69, 255, 0.5)' : '#0045FF'}}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#0038CC';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#0045FF';
            }
          }}
        >
          {isLoading ? 'Creating Clone...' : 'Create My Clone'}
        </button>
      </div>
    </div>
  );

  const renderWaitingRoom = (): React.ReactElement => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center" style={{ padding: '80px 40px' }}>
          <div className="flex justify-center mb-12">
            <div className="animate-spin rounded-full h-28 w-28 border-6" style={{
              border: '6px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white'
            }}></div>
          </div>

          <p className="font-semibold" style={{
            fontSize: '32px',
            color: 'white',
            lineHeight: '1.4'
          }}>
            Waiting for the other players to get it together.
          </p>
        </div>
      </div>
    );
  };

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
    <div className="min-h-screen py-8 px-4" style={{backgroundColor: '#F5F5F5'}}>
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