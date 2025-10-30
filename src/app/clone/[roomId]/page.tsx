"use client"
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle, Users } from 'lucide-react';
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
  createdAt: any;
  lastActivity: any;
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
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

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
        
      } catch (error: any) {
        console.error('Error verifying room:', error);
        setError(`Failed to verify room: ${error.message}`);
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
        setGameSettings(settings);

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
      
    } catch (error: any) {
      console.error('Error joining Clone room:', error);
      setError(`Failed to join room: ${error.message}`);
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
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(180deg, #96A3AB 0%, #EFA744 100%)'}}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
          <div className="text-white font-mono text-xl font-bold">VERIFYING CLONE ROOM...</div>
          <div className="text-white text-sm mt-2 opacity-80">Room ID: {roomId}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(180deg, #96A3AB 0%, #EFA744 100%)'}}>
        <div style={{
          backgroundColor: '#F5F1ED',
          borderRadius: '24px',
          maxWidth: '400px',
          width: '100%',
          padding: '40px',
          margin: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <div className="text-black font-bold text-xl mb-2">CONNECTION ERROR</div>
            <div className="text-gray-600 text-center mb-6">{error}</div>
            <div className="text-gray-500 text-sm mb-4">Room ID: {roomId}</div>
            <button
              onClick={() => router.push('/')}
              style={{
                backgroundColor: '#5A8A6F',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '30px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4A7A5F'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5A8A6F'}
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
      <div className="min-h-screen flex items-center justify-center p-6" style={{background: 'linear-gradient(180deg, #96A3AB 0%, #EFA744 100%)'}}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingTop: '60px',
            paddingBottom: '40px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '25px',
              backgroundColor: 'rgba(255,255,255,0.3)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }} onClick={() => router.push('/')}>
              <span style={{color: 'white', fontSize: '20px'}}>←</span>
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              margin: 0,
              letterSpacing: '1px'
            }}>JOIN CLONE</h1>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '25px',
              backgroundColor: 'rgba(255,255,255,0.3)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <span style={{color: 'white', fontSize: '24px'}}>?</span>
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#F5F1ED',
            borderRadius: '24px',
            overflow: 'hidden',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>

            {/* Main Content */}
            <div style={{padding: '40px'}}>
              <div style={{textAlign: 'center', marginBottom: '30px'}}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(90, 138, 111, 0.15)',
                  borderRadius: '40px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '0 auto 24px auto'
                }}>
                  <Shield style={{width: '40px', height: '40px', color: '#5A8A6F'}} />
                </div>
                <h1 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '12px', color: '#1A1A1A'}}>Enter Your Name</h1>
                <p style={{color: '#6B6B6B', fontSize: '17px'}}>Join the Clone identity challenge</p>
              </div>

              <div style={{marginBottom: '30px'}}>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Your name..."
                  style={{
                    width: '100%',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #E5E5E5',
                    outline: 'none',
                    fontSize: '20px',
                    color: '#1A1A1A',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <div style={{
                  marginBottom: '30px',
                  padding: '15px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '10px'
                }}>
                  <p style={{fontSize: '14px', color: '#dc2626', textAlign: 'center'}}>{error}</p>
                </div>
              )}

              <button
                onClick={joinCloneGame}
                disabled={loading || !playerName.trim()}
                style={{
                  width: '100%',
                  backgroundColor: loading || !playerName.trim() ? '#D1D1D1' : '#5A8A6F',
                  color: 'white',
                  padding: '18px',
                  borderRadius: '30px',
                  border: 'none',
                  cursor: loading || !playerName.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  letterSpacing: '0.5px'
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
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid #E5E5E5',
              padding: '20px',
              backgroundColor: '#F9F6F3'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#8B8B8B',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                <span>CLONE::{roomId}</span>
                <span>WEB::PLAYER</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for game to start
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{background: 'linear-gradient(180deg, #96A3AB 0%, #EFA744 100%)'}}>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingTop: '60px',
          paddingBottom: '40px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '25px',
            backgroundColor: 'rgba(255,255,255,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => router.push('/')}>
            <span style={{color: 'white', fontSize: '20px'}}>←</span>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '1px'
          }}>CLONE LOBBY</h1>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '25px',
            backgroundColor: 'rgba(255,255,255,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <span style={{color: 'white', fontSize: '24px'}}>?</span>
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#F5F1ED',
          borderRadius: '24px',
          overflow: 'hidden',
          margin: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>

          <div style={{padding: '40px'}}>
            <div style={{textAlign: 'center', marginBottom: '40px'}}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'rgba(90, 138, 111, 0.15)',
                borderRadius: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 auto 24px auto'
              }}>
                <Shield style={{width: '40px', height: '40px', color: '#5A8A6F'}} />
              </div>
              <h1 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '12px', color: '#1A1A1A'}}>
                Welcome to Clone Game, {playerName}!
              </h1>
              <p style={{color: '#6B6B6B', fontSize: '17px'}}>Waiting for the host to start the AI identity challenge...</p>
              
              {gameSettings && (
                <div style={{
                  marginTop: '20px',
                  backgroundColor: 'rgba(90, 138, 111, 0.1)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'inline-block'
                }}>
                  <p style={{fontSize: '16px', color: '#5A8A6F'}}>
                    🤖 Game Mode: <span style={{fontWeight: 'bold'}}>CLONE</span> - Human vs AI Detection
                  </p>
                </div>
              )}
            </div>

            {/* Players List */}
            <div style={{marginBottom: '40px'}}>
              <h3 style={{fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', fontSize: '20px', marginBottom: '20px'}}>
                Players in Clone Room ({members.length})
              </h3>
              
              <div style={{display: 'grid', gap: '10px', maxHeight: '300px', overflowY: 'auto'}}>
                {members.map((member) => (
                  <div
                    key={member.memberId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px',
                      borderRadius: '10px',
                      backgroundColor: member.role === 'host' ? 'rgba(90, 138, 111, 0.1)' : '#FFFFFF'
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '6px',
                        backgroundColor: member.platform === 'rn' ? '#D4A574' : '#5A8A6F'
                      }} />
                      <span style={{fontWeight: '500', color: '#1A1A1A'}}>
                        {member.displayName}
                      </span>
                      {member.role === 'host' && (
                        <span style={{
                          fontSize: '12px',
                          backgroundColor: '#5A8A6F',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '15px'
                        }}>
                          HOST
                        </span>
                      )}
                    </div>
                    <span style={{fontSize: '12px', color: '#666'}}>
                      {member.platform === 'rn' ? 'MOBILE' : 'WEB'}
                    </span>
                  </div>
                ))}
              </div>
              
              {members.length === 0 && (
                <div style={{textAlign: 'center', color: '#666', padding: '40px 0'}}>
                  <Loader2 style={{width: '24px', height: '24px', margin: '0 auto 10px auto'}} className="animate-spin" />
                  Loading players...
                </div>
              )}
            </div>

            <div style={{textAlign: 'center'}}>
              <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #5A8A6F',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%'
                }} className="animate-spin"></div>
              </div>
              <p style={{color: '#666', fontSize: '14px', marginTop: '10px'}}>
                Clone game will start automatically when host is ready
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #E5E5E5',
            padding: '20px',
            backgroundColor: '#F9F6F3'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#666'
            }}>
              <span>PLAYER::{playerName}</span>
              <span>STATUS::WAITING_CLONE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}