"use client"
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  serverTimestamp
} from 'firebase/firestore';

interface CloneRoomJoinPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

interface Member {
  memberId: string;
  displayName: string;
  roomId: string;
  role: 'host' | 'player';
  platform: 'rn' | 'web';
}

interface Room {
  roomId: string;
  active: boolean;
  createdAt: unknown;
  lastActivity: unknown;
}

interface GameSettings {
  gameStarted: boolean;
  gameMode: 'spy' | 'clone' | 'complements';
}

export default function CloneRoomJoinPage({ params }: CloneRoomJoinPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { roomId } = resolvedParams;
  
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [roomExists, setRoomExists] = useState<boolean>(false);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);

  // Random funny loading message
  const funnyMessages = [
    "Rounding up the suspects...",
    "Teaching pigs to talk...",
    "Cloning some bacon...",
    "Who's the real pig?...",
    "Gathering the imposters...",
    "Finding the fakes..."
  ];
  const randomMessage = React.useMemo(() =>
    funnyMessages[Math.floor(Math.random() * funnyMessages.length)],
    []
  );

  // Check if player has already joined this room
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`playerId_${roomId}`);
    const storedPlayerName = localStorage.getItem(`playerName_${roomId}`);
    
    if (storedPlayerId && storedPlayerName) {
      setPlayerId(storedPlayerId);
      setPlayerName(storedPlayerName);
      setIsJoined(true);
    }
  }, [roomId]);

  // Verify room exists
  useEffect(() => {
    if (!roomId) return;
    
    const verifyRoom = async () => {
      try {
        console.log(`Verifying Clone room: ${roomId}`);
        
        const roomRef = doc(db, 'rooms', roomId);
        const roomDoc = await getDoc(roomRef);
        
        if (!roomDoc.exists()) {
          setError('Room not found. Please check the room ID.');
          setVerifying(false);
          return;
        }
        
        const roomData = roomDoc.data() as Room;
        if (!roomData.active) {
          setError('This room is no longer active.');
          setVerifying(false);
          return;
        }
        
        setRoomExists(true);
        console.log(`✅ Clone room ${roomId} verified`);
        
      } catch (error) {
        console.error('Error verifying room:', error);
        setError(`Failed to verify room: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setVerifying(false);
      }
    };
    
    verifyRoom();
  }, [roomId]);

  // Listen to game settings AND clone_games for game start
  useEffect(() => {
    if (!roomExists || !isJoined) return;

    const unsubscribers: (() => void)[] = [];

    // Method 1: Listen to settings document (if main app uses it)
    const settingsRef = doc(db, 'settings', roomId);
    const settingsUnsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const settings = doc.data() as GameSettings;

        // If Clone game has started, navigate to Clone gameplay
        if (settings.gameStarted === true && settings.gameMode === 'clone') {
          console.log(`🎮 Clone game started via settings in room ${roomId}!`);
          router.push(`/cloneplay?roomId=${roomId}&playerId=${playerId}`);
        }
      }
    });
    unsubscribers.push(settingsUnsubscribe);

    // Method 2: ALSO listen to clone_games document directly (in case main app doesn't use settings)
    const cloneGameRef = doc(db, 'clone_games', roomId);
    const cloneGameUnsubscribe = onSnapshot(cloneGameRef, (doc) => {
      if (doc.exists()) {
        const gameData = doc.data();
        console.log(`🎮 Clone game document exists with phase: ${gameData.gamePhase}`);

        // If clone game exists and has started (any phase beyond setup), redirect
        if (gameData.gamePhase && gameData.gamePhase !== 'setup') {
          console.log(`🎮 Clone game started via clone_games in room ${roomId}!`);
          router.push(`/cloneplay?roomId=${roomId}&playerId=${playerId}`);
        }
      }
    });
    unsubscribers.push(cloneGameUnsubscribe);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [roomExists, isJoined, roomId, playerId, router]);

  // Listen to members for real-time player list
  useEffect(() => {
    if (!roomExists) return;
    
    const membersRef = collection(db, 'rooms', roomId, 'members');
    const unsubscribe = onSnapshot(membersRef, async (snapshot) => {
      const membersList: Member[] = [];
      
      // Get members from subcollection
      snapshot.forEach((doc) => {
        const data = doc.data();
        membersList.push({
          memberId: data.memberId || doc.id,
          displayName: data.displayName || 'Anonymous',
          roomId: data.roomId,
          role: data.role || 'player',
          platform: data.platform || 'web'
        });
      });

      setMembers(membersList);
      console.log(`📊 Updated member list: ${membersList.length} players`);
    });
    
    return () => unsubscribe();
  }, [roomExists, roomId]);

  const joinCloneGame = async (): Promise<void> => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Generate unique ID for web player
      const newPlayerId = 'web_' + Math.random().toString(36).substr(2, 9);
      
      // Add to members subcollection
      await setDoc(doc(db, 'rooms', roomId, 'members', newPlayerId), {
        memberId: newPlayerId,
        displayName: playerName.trim(),
        roomId,
        role: 'player',
        platform: 'web',
        joinedAt: serverTimestamp()
      });

      // Store player info locally
      localStorage.setItem(`playerId_${roomId}`, newPlayerId);
      localStorage.setItem(`playerName_${roomId}`, playerName.trim());
      localStorage.setItem('agentName', playerName.trim()); // For backward compatibility
      
      setPlayerId(newPlayerId);
      setIsJoined(true);
      
      console.log(`✅ ${playerName} joined Clone room ${roomId} as ${newPlayerId}`);
      
    } catch (error) {
      console.error('Error joining Clone room:', error);
      setError(`Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      joinCloneGame();
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F5F5F5'}}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{color: '#0045FF'}} />
          <div className="font-mono text-xl font-bold" style={{color: 'black'}}>VERIFYING CLONE ROOM...</div>
          <div className="text-sm mt-2" style={{color: 'black', opacity: 0.8}}>Room ID: {roomId}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F5F5F5'}}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          padding: '40px',
          margin: '20px'
        }}>
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <div className="font-bold text-xl mb-2" style={{color: 'black'}}>CONNECTION ERROR</div>
            <div className="text-center mb-6" style={{color: 'black'}}>{error}</div>
            <div className="text-sm mb-4" style={{color: 'black'}}>Room ID: {roomId}</div>
            <button
              onClick={() => router.push('/')}
              style={{
                backgroundColor: '#0045FF',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0038CC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0045FF'}
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '40px',
            paddingBottom: '20px'
          }}>
            {/* Pig image above text */}
            <img
              src="/PigImage.png"
              alt="Pigs"
              style={{
                width: '300px',
                height: 'auto',
                marginBottom: '20px'
              }}
            />
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#0045FF',
              textAlign: 'center',
              margin: 0,
              letterSpacing: '2px',
              fontFamily: 'var(--font-ojuju), sans-serif'
            }}>LET&apos;S PLAY CLONE</h1>
          </div>
          
          <div style={{padding: '20px 40px 40px 40px'}}>
            <div style={{textAlign: 'center', marginBottom: '30px'}}>
              <p style={{
                fontSize: '20px',
                fontWeight: '500',
                color: 'black',
                margin: 0
              }}>Put your name or a fun nickname</p>
            </div>

            <div style={{marginBottom: '30px'}}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Your name..."
                className="clone-input"
                style={{
                  width: '100%',
                  padding: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '12px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '24px',
                  color: 'black',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                autoFocus
                disabled={loading}
              />
              <style jsx>{`
                .clone-input::placeholder {
                  color: #999999;
                  opacity: 1;
                }
                @keyframes slideUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </div>

            {error && (
              <div style={{
                marginBottom: '30px',
                padding: '15px'
              }}>
                <p style={{fontSize: '16px', color: 'black', textAlign: 'center'}}>{error}</p>
              </div>
            )}

            {playerName.trim() && (
              <button
                onClick={joinCloneGame}
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: loading ? 'rgba(0, 69, 255, 0.5)' : '#0045FF',
                  color: 'white',
                  padding: '20px',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  letterSpacing: '0.5px',
                  animation: 'slideUp 0.3s ease-out'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 style={{width: '20px', height: '20px'}} className="animate-spin" />
                    <span>JOINING...</span>
                  </>
                ) : (
                  <span>JOIN CLONE GAME</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Waiting for game to start
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
      <div className="w-full max-w-md">
        <div style={{textAlign: 'center', padding: '60px 20px'}}>
          {/* Funny Dancing Dots */}
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '15px', height: '80px', marginBottom: '50px'}}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#0045FF',
              borderRadius: '50%',
              animation: 'bounce 0.6s ease-in-out infinite'
            }}></div>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#0045FF',
              borderRadius: '50%',
              animation: 'bounce 0.6s ease-in-out 0.2s infinite'
            }}></div>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#0045FF',
              borderRadius: '50%',
              animation: 'bounce 0.6s ease-in-out 0.4s infinite'
            }}></div>
          </div>

          {/* Funny Waiting Message */}
          <p style={{
            color: '#0045FF',
            fontSize: '32px',
            fontWeight: '700',
            margin: 0,
            lineHeight: '1.5',
            fontFamily: 'var(--font-ojuju), sans-serif',
            animation: 'wiggle 1s ease-in-out infinite'
          }}>
            {randomMessage}
          </p>

          {/* Player Count */}
          {members.length > 0 && (
            <p style={{
              color: 'black',
              opacity: 0.7,
              fontSize: '20px',
              marginTop: '25px',
              fontWeight: '500'
            }}>
              {members.length} clone{members.length !== 1 ? 's' : ''} assembled 🐷
            </p>
          )}

          {/* Animation styles */}
          <style jsx>{`
            @keyframes bounce {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-50px);
              }
            }
            @keyframes wiggle {
              0%, 100% {
                transform: rotate(0deg);
              }
              25% {
                transform: rotate(-2deg);
              }
              75% {
                transform: rotate(2deg);
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}