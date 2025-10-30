"use client"
import React, { useState, useEffect } from 'react';
import { Send, Eye, CheckCircle, Clock, Shield, Target, Crown, ChevronLeft, HelpCircle } from 'lucide-react';
import CloneGameService, { CloneGameState, ClonePlayer, getTeamColor, getTeamColorClass, getTeamBgClass, getTeamEmoji } from '@/services/clone';
import LobbyService, { LobbyState } from '@/services/lobby';
import { 
  determinePlayerRole, 
  getSpectatorMessage, 
  getCurrentActionDescription,
  validateGameState,
  getRoleActionText,
  canPlayerAct,
  isTeamLeader,
  PlayerRole 
} from '@/utils/playerRoles';

// Type definitions
interface CloneGamePlayerProps {
  // Props from URL or routing
}

type GameState = 'joining' | 'waiting' | 'creating-clone' | 'playing';
type GamePhase = 'team_assignment' | 'clone_creation' | 'questioning' | 'waiting_for_response' | 'master_review' | 'voting' | 'results';

const CloneGamePlay: React.FC<CloneGamePlayerProps> = () => {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [cloneGameData, setCloneGameData] = useState<CloneGameState | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Clone profile states
  const [cloneInfo, setCloneInfo] = useState<string>('');

  // Gameplay states
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [humanAnswer, setHumanAnswer] = useState<string>('');
  const [showAnswerInterface, setShowAnswerInterface] = useState<boolean>(false);
  const [votingChoice, setVotingChoice] = useState<'human' | 'clone' | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'human' | 'clone' | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<PlayerRole>('SPECTATOR');

  // Consistent Layout Template - matches main app exactly
  const renderConsistentScreen = (
    title: string,
    content: React.ReactNode,
    bottomButton?: { text: string; onClick: () => void; disabled?: boolean; loading?: boolean }
  ) => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #96A3AB 0%, #EFA744 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        {/* Header with back and help buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '30px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '30px',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <ChevronLeft style={{ width: '32px', height: '32px', color: '#000000', strokeWidth: 3 }} />
          </div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '1px'
          }}>{title}</h1>

          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '30px',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <HelpCircle style={{ width: '28px', height: '28px', color: '#000000', strokeWidth: 2.5 }} />
          </div>
        </div>

        {/* White content card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '40px 30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          {content}
        </div>

        {/* Bottom button if provided */}
        {bottomButton && (
          <button
            onClick={bottomButton.onClick}
            disabled={bottomButton.disabled || bottomButton.loading}
            style={{
              width: '100%',
              backgroundColor: bottomButton.disabled || bottomButton.loading ? '#A0AEC0' : '#5A8A6F',
              color: 'white',
              padding: '20px',
              borderRadius: '30px',
              border: 'none',
              cursor: bottomButton.disabled || bottomButton.loading ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {bottomButton.loading ? 'Loading...' : bottomButton.text}
          </button>
        )}
      </div>
    </div>
  );

  // Get params from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('roomId');
    const urlPlayerId = urlParams.get('playerId');
    
    if (urlRoomId && urlPlayerId) {
      setRoomId(urlRoomId);
      setPlayerId(urlPlayerId);
      
      // Get player name from localStorage
      const storedPlayerName = localStorage.getItem(`playerName_${urlRoomId}`) || 
                               localStorage.getItem('agentName') || 
                               'Anonymous';
      setPlayerName(storedPlayerName);
      
      console.log(`🎮 Clone game loaded: Room ${urlRoomId}, Player ${storedPlayerName} (${urlPlayerId})`);
    } else {
      // Fallback to joining flow if no URL params
      setGameState('joining');
    }
  }, []);

  // Listen to clone game updates
  useEffect(() => {
    if (roomId) {
      const unsubscribeGame = CloneGameService.listenToCloneGame(roomId, (gameData: CloneGameState | null) => {
        if (gameData) {
          setCloneGameData(gameData);
          console.log('🎮 Game listener fired, phase:', gameData.gamePhase);
          
          // Check if player has team assignment - don't modify, just log
          const myPlayer = gameData.players.find(p => p.id === playerId);
          if (myPlayer && !myPlayer.teamId) {
            console.log('⚠️ Player has no team assignment - this should be handled by the master system');
          }

          // Check for invalid questioning state (team questioning their own player)
          if (gameData.currentPlayer && gameData.questioningTeam) {
            const currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayer);
            if (currentPlayer && currentPlayer.teamId === gameData.questioningTeam) {
              console.log('🔧 Fixing invalid questioning state - team cannot question their own player');
              // Force advance to next round to fix the state
              CloneGameService.nextRound(roomId);
              return; // Wait for next update with fixed state
            }
          }

          // Debug all game state issues
          console.log('🔍 GAME STATE DEBUG:');
          console.log('  - Phase:', gameData.gamePhase);
          console.log('  - Current Player:', gameData.currentPlayer);
          console.log('  - Questioning Team:', gameData.questioningTeam);
          console.log('  - All Players:');
          gameData.players.forEach(p => {
            console.log(`    ${p.name} (${p.id}) - Team: ${p.teamId} - IsHost: ${p.isHost}`);
          });

          // Determine player role based on game state
          if (playerId) {
            const role = determinePlayerRole(gameData, playerId);
            setPlayerRole(role);
            
            // Debug logging for voting issues
            if (gameData.gamePhase === 'voting') {
              const amITeamLeader = isTeamLeader(gameData, playerId);
              const totalPlayers = gameData.players.length;
              
              console.log('🗳️ VOTING PHASE DEBUG:');
              console.log('  - My Player:', myPlayer);
              console.log('  - My Team:', myPlayer?.teamId);
              console.log('  - Questioning Team:', gameData.questioningTeam);
              console.log('  - Is My Team Questioning:', myPlayer?.teamId === gameData.questioningTeam);
              console.log('  - Am I Team Leader:', amITeamLeader);
              console.log('  - Total Players:', totalPlayers);
              console.log('  - Determined Role:', role);
              
              // Show all players and their leadership status
              gameData.players.forEach(p => {
                const isLeader = isTeamLeader(gameData, p.id);
                console.log(`    Player: ${p.name} (${p.id}) | Team: ${p.teamId} | Leader: ${isLeader} | Joined: ${p.joinedAt}`);
              });
            }
            
            console.log('🎭 Player role:', role, '| Action:', getRoleActionText(role, gameData));
            
            // Validate game state
            const errors = validateGameState(gameData, playerId);
            if (errors.length > 0) {
              console.error('❌ Game state errors:', errors);
            }
          }
          
          // Update game state based on clone game phase
          if (gameData.gamePhase === 'clone_creation') {
            // Check if current player has already created their clone
            const currentPlayerData = gameData.players.find(p => p.id === playerId);
            console.log('🎮 Current player data:', currentPlayerData);
            console.log('🎮 Has clone profile:', currentPlayerData?.hasCloneProfile);
            
            if (currentPlayerData?.hasCloneProfile) {
              console.log('🎮 Setting state to waiting (player has clone)');
              setGameState('waiting'); // Show waiting room if already created clone
            } else {
              console.log('🎮 Setting state to creating-clone (player needs clone)');
              setGameState('creating-clone'); // Show creation screen if not created yet
            }
          } else if (gameData.gamePhase === 'team_assignment') {
            console.log('🎮 Setting state to waiting (team assignment)');
            setGameState('waiting');
          } else {
            console.log('🎮 Setting state to playing');
            setGameState('playing');
          }

          // Reset choice when new question comes
          if (gameData.gamePhase === 'waiting_for_response' && gameData.currentPlayer === playerId) {
            setSelectedChoice(null);
            setHumanAnswer('');
            setAiResponse(''); // Clear previous AI response
          }
          
          // Check if it's current player's turn to respond
          if (gameData.currentPlayer === playerId && 
              gameData.currentQuestion && 
              gameData.awaitingResponse) {
            setShowAnswerInterface(true);
            // Generate AI response immediately when question is received
            const currentPlayer = gameData.players.find(p => p.id === playerId);
            if (gameData.currentQuestion && currentPlayer?.cloneInfo && !aiResponse) {
              console.log('🤖 Triggering AI generation for new question');
              generateAIResponse(gameData.currentQuestion, currentPlayer.cloneInfo, gameData.topic);
            }
          } else {
            setShowAnswerInterface(false);
          }
        }
      });

      // Also listen to lobby state for member updates
      const unsubscribeLobby = LobbyService.listenToRoom(roomId, (state: LobbyState) => {
        setLobbyState(state);
      });

      return () => {
        unsubscribeGame();
        unsubscribeLobby();
      };
    }
  }, [roomId, playerId]);

  // Platform tracking and connection monitoring
  useEffect(() => {
    if (!roomId || !playerId) return;

    // Initial status update
    CloneGameService.updatePlayerStatus(roomId, playerId, {
      platform: 'cloneplay',
      lastSeen: new Date().toISOString(),
      isOnline: true
    });

    // Heartbeat to update player online status every 30 seconds
    const heartbeatInterval = setInterval(() => {
      CloneGameService.updatePlayerStatus(roomId, playerId, {
        platform: 'cloneplay',
        lastSeen: new Date().toISOString(),
        isOnline: true
      });
    }, 30000);

    // Cleanup on unmount or before refresh
    const handleBeforeUnload = () => {
      CloneGameService.updatePlayerStatus(roomId, playerId, {
        platform: 'cloneplay',
        lastSeen: new Date().toISOString(),
        isOnline: false
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Mark player as offline when component unmounts
      CloneGameService.updatePlayerStatus(roomId, playerId, {
        platform: 'cloneplay',
        lastSeen: new Date().toISOString(),
        isOnline: false
      });
    };
  }, [roomId, playerId]);

  // Players join via /[roomId] page now, no need for manual joining

  const generateAIResponse = async (question: string, cloneData: string, topic?: string): Promise<void> => {
    console.log('🤖 Generating AI response for:', { question, cloneData: cloneData.substring(0, 50) + '...' });
    
    // Set loading state
    setAiResponse('Generating response...');
    
    try {
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

      console.log('🤖 API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🤖 AI response received:', data.response);
        setAiResponse(data.response);
      } else {
        console.error('🤖 API error:', response.statusText);
        const errorData = await response.text();
        console.error('🤖 Error details:', errorData);
        setAiResponse("I'd have to think about that one...");
      }
    } catch (error) {
      console.error('🤖 Error generating AI response:', error);
      setAiResponse("That's an interesting question to consider.");
    }
  };

  const handleCreateClone = async (): Promise<void> => {
    console.log('handleCreateClone called!', { playerId, roomId, cloneInfo });
    
    if (!playerId || !roomId) {
      setError('Missing player or room information');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Calling CloneGameService.saveCloneData...');
      const result = await CloneGameService.saveCloneData(roomId, playerId, cloneInfo.trim());
      console.log('saveCloneData result:', result);
      
      if (result.success) {
        // Player has successfully created their clone, move to waiting
        setGameState('waiting');
      } else {
        setError(result.message || 'Failed to create clone profile');
      }
    } catch (err: unknown) {
      console.error('Error in handleCreateClone:', err);
      const error = err as { message?: string };
      setError(error.message || 'Failed to create clone profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuestion = async (): Promise<void> => {
    if (!currentQuestion.trim() || !roomId || !playerId) {
      setError('Missing question or player information');
      return;
    }

    setIsLoading(true);
    try {
      await CloneGameService.submitQuestion(roomId, playerId, currentQuestion);
      setCurrentQuestion('');
    } catch (error: any) {
      setError(error.message || 'Failed to submit question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async (): Promise<void> => {
    if (!selectedChoice || !roomId || !playerId) {
      setError('Please select a response option');
      return;
    }

    if (selectedChoice === 'human' && !humanAnswer.trim()) {
      setError('Please enter your human response');
      return;
    }

    setIsLoading(true);
    try {
      // Submit both responses to Firebase for master to see
      await CloneGameService.submitPlayerResponse(
        roomId, 
        playerId, 
        selectedChoice, 
        humanAnswer, 
        aiResponse
      );
      setShowAnswerInterface(false);
      setSelectedChoice(null);
      setHumanAnswer('');
      setAiResponse('');
    } catch (error: any) {
      setError(error.message || 'Failed to submit response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (vote: 'human' | 'clone'): Promise<void> => {
    await handleSubmitVote(vote);
  };

  const handleSubmitVote = async (vote: 'human' | 'clone'): Promise<void> => {
    if (!roomId || !playerId) {
      setError('Missing room or player information');
      return;
    }

    setIsLoading(true);
    try {
      await CloneGameService.submitVote(roomId, playerId, vote);
      setVotingChoice(vote);
    } catch (error: any) {
      setError(error.message || 'Failed to submit vote');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlayer = (): ClonePlayer | undefined => {
    return cloneGameData?.players.find(p => p.id === playerId);
  };

  const getOpposingTeam = (teamId: 'A' | 'B'): ClonePlayer[] => {
    const opposingTeamId = teamId === 'A' ? 'B' : 'A';
    return cloneGameData?.players.filter(p => p.teamId === opposingTeamId) || [];
  };

  // This screen should never show now since we get roomId from URL
  const renderJoinScreen = (): React.ReactElement => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div style={{paddingBottom: '40px'}}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingTop: '60px',
        paddingBottom: '20px'
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
        }}>
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

      {/* Content */}
      <div style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <p style={{
          fontSize: '18px',
          color: 'white',
          textAlign: 'center',
          marginBottom: '16px',
          fontWeight: '500'
        }}>Invalid Access</p>
        
        <p style={{
          fontSize: '16px',
          color: 'white',
          textAlign: 'center',
          marginBottom: '8px'
        }}>Please join the game by scanning the QR code from the host's device.</p>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#5A8A6F',
            paddingTop: '15px',
            paddingBottom: '15px',
            paddingLeft: '30px',
            paddingRight: '30px',
            borderRadius: '25px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px',
            marginLeft: '40px',
            marginRight: '40px'
          }}
        >
          <span style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>Go Home</span>
        </button>
      </div>
        </div>
      </div>
    </div>
  );

  const renderCloneCreation = (): React.ReactElement => {
    const content = (
      <>
        {/* Topic Display */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1A1A1A',
            margin: '0 0 15px 0'
          }}>
            Topic: {cloneGameData?.topic || 'General'}
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#6B6B6B',
            margin: 0,
            lineHeight: '1.5'
          }}>
            Describe yourself based on the topic. The AI will use this to mimic you!
          </p>
        </div>

        {/* Textarea */}
        <textarea
          value={cloneInfo}
          onChange={(e) => setCloneInfo(e.target.value)}
          placeholder={`Example: I love trying new restaurants, my favorite cuisine is Thai...`}
          maxLength={500}
          style={{
            width: '100%',
            minHeight: '180px',
            padding: '15px',
            backgroundColor: '#F7FAFC',
            border: '2px solid #E2E8F0',
            borderRadius: '12px',
            outline: 'none',
            fontSize: '16px',
            color: '#1A1A1A',
            resize: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
          disabled={isLoading}
        />
        <div style={{
          textAlign: 'right',
          fontSize: '14px',
          color: '#A0AEC0',
          marginTop: '10px'
        }}>
          {cloneInfo.length}/500
        </div>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#FEE2E2',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '14px', color: '#DC2626', textAlign: 'center', margin: 0 }}>{error}</p>
          </div>
        )}
      </>
    );

    return renderConsistentScreen(
      'CREATE YOUR CLONE',
      content,
      {
        text: 'Create Clone',
        onClick: handleCreateClone,
        disabled: !cloneInfo.trim(),
        loading: isLoading
      }
    );
  };

  const renderWaitingRoom = (): React.ReactElement => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div style={{paddingTop: '60px'}}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px'
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
        }}>
          <span style={{color: 'white', fontSize: '20px'}}>←</span>
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          margin: 0,
          letterSpacing: '1px'
        }}>WAITING TO START</h1>
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

      <div style={{margin: '20px'}}>
        <div style={{
          backgroundColor: '#F5F1ED',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'rgba(90, 138, 111, 0.15)',
            borderRadius: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 20px auto'
          }}>
            <Clock style={{width: '40px', height: '40px', color: '#5A8A6F'}} />
          </div>
          <h1 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', color: 'black'}}>Waiting for Game to Start</h1>
          <p style={{color: '#6B6B6B', fontSize: '16px'}}>Room ID: <span style={{fontWeight: 'bold'}}>{roomId}</span></p>
        </div>

        {lobbyState && lobbyState.status === 'ready' && (
          <div style={{display: 'grid', gap: '20px'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              {/* Team A */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '15px',
                padding: '20px',
                border: '2px solid #3B885E'
              }}>
                <h3 style={{
                  fontWeight: 'bold',
                  color: '#3B885E',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '18px'
                }}>
                  <Shield style={{width: '16px', height: '16px', marginRight: '8px'}} />
                  Team A ({lobbyState.members.filter(m => m.teamId === 'A').length})
                </h3>
                <div style={{display: 'grid', gap: '8px'}}>
                  {lobbyState.members
                    .filter(m => m.teamId === 'A')
                    .map(member => (
                      <div key={member.memberId} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '10px',
                        borderLeft: '3px solid #dc2626'
                      }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          {member.role === 'host' && <Crown style={{width: '14px', height: '14px', color: '#f59e0b'}} />}
                          <span style={{fontSize: '14px', fontWeight: '500', color: 'black'}}>{member.displayName}</span>
                        </div>
                        {member.hasCloneProfile && (
                          <CheckCircle style={{width: '16px', height: '16px', color: '#5A8A6F'}} />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Team B */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '15px',
                padding: '20px',
                border: '2px solid #3B885E'
              }}>
                <h3 style={{
                  fontWeight: 'bold',
                  color: '#3B885E',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '18px'
                }}>
                  <Shield style={{width: '16px', height: '16px', marginRight: '8px'}} />
                  Team B ({lobbyState.members.filter(m => m.teamId === 'B').length})
                </h3>
                <div style={{display: 'grid', gap: '8px'}}>
                  {lobbyState.members
                    .filter(m => m.teamId === 'B')
                    .map(member => (
                      <div key={member.memberId} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '10px',
                        borderLeft: '3px solid #2563eb'
                      }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          {member.role === 'host' && <Crown style={{width: '14px', height: '14px', color: '#f59e0b'}} />}
                          <span style={{fontSize: '14px', fontWeight: '500', color: 'black'}}>{member.displayName}</span>
                        </div>
                        {member.hasCloneProfile && (
                          <CheckCircle style={{width: '16px', height: '16px', color: '#5A8A6F'}} />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#F5F1ED',
              borderRadius: '15px',
              padding: '30px',
              textAlign: 'center'
            }}>
              <p style={{color: '#6B6B6B', marginBottom: '20px', fontSize: '16px'}}>Waiting for the host to start the game...</p>
              <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #5A8A6F',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%'
                }} className="animate-spin"></div>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );

  const renderGamePlay = (): React.ReactElement => {
    if (!cloneGameData) {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{color: 'rgba(255,255,255,0.7)'}}>Loading game data...</div>
        </div>
      );
    }

    return (
      <>
        {/* QUESTIONER Role - iPhone Width Design */}
        {playerRole === 'QUESTIONER' && cloneGameData && cloneGameData.gamePhase === 'questioning' && !cloneGameData.currentQuestion && (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div style={{paddingBottom: '40px'}}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  paddingTop: '60px',
                  paddingBottom: '20px'
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
                  }}>
                    <span style={{color: 'white', fontSize: '20px'}}>←</span>
                  </div>
                  <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: 'white',
                    textAlign: 'center',
                    margin: 0,
                    letterSpacing: '1px'
                  }}>QUESTIONING</h1>
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
                
                {/* Game Info */}
                <div style={{paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px'}}>
                  <p style={{
                    fontSize: '18px',
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: '600',
                    margin: 0
                  }}>Round {cloneGameData.roundNumber}</p>
                </div>
                
                {/* Content */}
                <div style={{padding: '20px', alignItems: 'center'}}>
                  <p style={{
                    fontSize: '18px',
                    color: 'white',
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>Ask a question</p>
                  
                  <textarea
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="What's your favorite..."
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '10px',
                      padding: '15px',
                      fontSize: '16px',
                      color: 'black',
                      minHeight: '80px',
                      marginBottom: '20px',
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                      textAlignVertical: 'top'
                    }}
                    rows={4}
                  />
                  
                  <button
                    onClick={handleSubmitQuestion}
                    disabled={!currentQuestion.trim() || isLoading}
                    style={{
                      backgroundColor: !currentQuestion.trim() || isLoading ? '#A0AEC0' : '#5A8A6F',
                      paddingTop: '15px',
                      paddingBottom: '15px',
                      paddingLeft: '30px',
                      paddingRight: '30px',
                      borderRadius: '25px',
                      border: 'none',
                      cursor: isLoading || !currentQuestion.trim() ? 'not-allowed' : 'pointer',
                      marginTop: '20px',
                      marginLeft: '40px',
                      marginRight: '40px',
                      width: 'calc(100% - 80px)',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      {isLoading ? 'Sending...' : 'Send'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESPONDER Role - Waiting for Question - Minimal Design */}
        {playerRole === 'RESPONDER' && cloneGameData && !showAnswerInterface && (
          <div style={{paddingBottom: '40px'}}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '60px',
              paddingBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer'
              }}>
                <span style={{color: 'white', fontSize: '18px', fontWeight: 'bold'}}>←</span>
              </div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                textAlign: 'center',
                margin: 0
              }}>YOUR TURN</h1>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer'
              }}>
                <span style={{color: 'white', fontSize: '18px', fontWeight: 'bold'}}>?</span>
              </div>
            </div>
            
            {/* Game Info */}
            <div style={{paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px'}}>
              <p style={{
                fontSize: '18px',
                color: 'white',
                textAlign: 'center',
                fontWeight: '600',
                margin: 0
              }}>Round {cloneGameData.roundNumber}</p>
            </div>
            
            {/* Content */}
            <div style={{padding: '20px', alignItems: 'center'}}>
              {cloneGameData.currentQuestion ? (
                <>
                  <p style={{
                    fontSize: '18px',
                    color: 'white',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginTop: '20px',
                    marginBottom: '20px',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    lineHeight: '24px'
                  }}>
                    "{cloneGameData.currentQuestion}"
                  </p>
                  
                  <button
                    onClick={() => setShowAnswerInterface(true)}
                    style={{
                      backgroundColor: '#5A8A6F',
                      paddingTop: '15px',
                      paddingBottom: '15px',
                      paddingLeft: '30px',
                      paddingRight: '30px',
                      borderRadius: '25px',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '20px',
                      marginLeft: '40px',
                      marginRight: '40px',
                      width: 'calc(100% - 80px)',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      Choose Response
                    </span>
                  </button>
                </>
              ) : (
                <p style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center'
                }}>Waiting for other players...</p>
              )}
            </div>
          </div>
        )}

        {/* RESPONDER Role - Response Selection */}
        {playerRole === 'RESPONDER' && cloneGameData && showAnswerInterface && (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div style={{paddingBottom: '40px'}}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  paddingTop: '60px',
                  paddingBottom: '20px'
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
                  }}>
                    <span style={{color: 'white', fontSize: '20px'}}>←</span>
                  </div>
                  <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: 'white',
                    textAlign: 'center',
                    margin: 0,
                    letterSpacing: '1px'
                  }}>CHOOSE RESPONSE</h1>
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

                <div style={{margin: '20px'}}>
                  <div style={{
                    backgroundColor: '#F5F1ED',
                    borderRadius: '24px',
                    padding: '40px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{textAlign: 'center', marginBottom: '30px'}}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: 'rgba(90, 138, 111, 0.15)',
                        borderRadius: '30px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: '0 auto 20px auto'
                      }}>
                        <span style={{fontSize: '24px'}}>💭</span>
                      </div>
                      <p style={{
                        fontSize: '14px', 
                        color: '#6B6B6B', 
                        marginBottom: '12px',
                        fontWeight: '500'
                      }}>Round {cloneGameData.roundNumber}</p>
                      <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1A1A1A'}}>Choose Your Response</h1>
                      
                      <div style={{
                        backgroundColor: 'rgba(90, 138, 111, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px'
                      }}>
                        <p style={{fontSize: '16px', color: '#1A1A1A', margin: 0, fontWeight: '500'}}>
                          "{cloneGameData.currentQuestion}"
                        </p>
                      </div>
                    </div>

                    <div style={{marginBottom: '20px'}}>
                      {/* Human Response Choice */}
                      <div 
                        style={{
                          backgroundColor: selectedChoice === 'human' ? 'rgba(90, 138, 111, 0.1)' : 'white',
                          border: selectedChoice === 'human' ? '2px solid #5A8A6F' : '1px solid #E5E5E5',
                          borderRadius: '12px',
                          padding: '20px',
                          marginBottom: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setSelectedChoice('human')}
                      >
                        <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#1A1A1A', marginBottom: '10px'}}>Human</h3>
                        <textarea
                          value={humanAnswer}
                          onChange={(e) => setHumanAnswer(e.target.value)}
                          placeholder="Type your response..."
                          style={{
                            width: '100%',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#1A1A1A',
                            fontSize: '16px',
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                          rows={3}
                        />
                      </div>

                      {/* AI Clone Response Choice */}
                      <div 
                        style={{
                          backgroundColor: selectedChoice === 'clone' ? 'rgba(244, 81, 30, 0.1)' : 'white',
                          border: selectedChoice === 'clone' ? '2px solid #f4511e' : '1px solid #E5E5E5',
                          borderRadius: '12px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setSelectedChoice('clone')}
                      >
                        <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#1A1A1A', marginBottom: '10px'}}>AI Clone</h3>
                        <div style={{
                          backgroundColor: 'rgba(244, 81, 30, 0.1)',
                          borderRadius: '8px',
                          padding: '12px',
                          fontSize: '16px',
                          color: '#1A1A1A',
                          fontStyle: 'italic'
                        }}>
                          {aiResponse || 'Generating response...'}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmitResponse}
                      disabled={!selectedChoice || isLoading}
                      style={{
                        width: '100%',
                        backgroundColor: selectedChoice && !isLoading ? '#5A8A6F' : '#CCCCCC',
                        color: 'white',
                        padding: '18px',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: selectedChoice && !isLoading ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {isLoading ? 'Submitting...' : 'Submit Response'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VOTER Role */}
        {playerRole === 'VOTER' && cloneGameData && cloneGameData.gamePhase === 'voting' && (
          <>
            {renderConsistentScreen(
              'VOTE NOW!',
              <>
                {/* Round Info */}
                <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                  <p style={{
                    fontSize: '16px',
                    color: '#6B6B6B',
                    margin: 0,
                    fontWeight: '600'
                  }}>Round {cloneGameData.roundNumber}</p>
                </div>

                {/* Question */}
                {cloneGameData.currentQuestion && (
                  <div style={{ marginBottom: '25px' }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#6B6B6B',
                      textAlign: 'center',
                      marginBottom: '10px',
                      fontWeight: '500'
                    }}>Question:</p>
                    <p style={{
                      fontSize: '16px',
                      color: '#1A1A1A',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      "{cloneGameData.currentQuestion}"
                    </p>
                  </div>
                )}

                {/* Player's Response */}
                <div style={{
                  backgroundColor: '#F7FAFC',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '30px'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#6B6B6B',
                    textAlign: 'center',
                    marginBottom: '10px',
                    fontWeight: '500'
                  }}>Player's Response:</p>
                  <p style={{
                    fontSize: '18px',
                    color: '#1A1A1A',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    lineHeight: '1.5'
                  }}>
                    "{cloneGameData.playerResponse}"
                  </p>
                </div>

                {/* Voting Instructions */}
                <p style={{
                  fontSize: '16px',
                  color: '#1A1A1A',
                  textAlign: 'center',
                  marginBottom: '20px',
                  fontWeight: '600'
                }}>Is this Human or AI Clone?</p>

                {/* Voting Buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px'
                }}>
                  <button
                    onClick={() => handleVote('human')}
                    disabled={isLoading || votingChoice !== null}
                    style={{
                      backgroundColor: votingChoice === 'human' ? '#5A8A6F' : '#F7FAFC',
                      color: votingChoice === 'human' ? 'white' : '#1A1A1A',
                      padding: '18px',
                      borderRadius: '12px',
                      border: `2px solid ${votingChoice === 'human' ? '#5A8A6F' : '#E2E8F0'}`,
                      cursor: isLoading || votingChoice !== null ? 'not-allowed' : 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    HUMAN
                  </button>

                  <button
                    onClick={() => handleVote('clone')}
                    disabled={isLoading || votingChoice !== null}
                    style={{
                      backgroundColor: votingChoice === 'clone' ? '#5A8A6F' : '#F7FAFC',
                      color: votingChoice === 'clone' ? 'white' : '#1A1A1A',
                      padding: '18px',
                      borderRadius: '12px',
                      border: `2px solid ${votingChoice === 'clone' ? '#5A8A6F' : '#E2E8F0'}`,
                      cursor: isLoading || votingChoice !== null ? 'not-allowed' : 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    AI CLONE
                  </button>
                </div>

                {votingChoice && (
                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#D1FAE5',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '14px', color: '#065F46', margin: 0, fontWeight: '500' }}>
                      Vote submitted! Waiting for other players...
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* SPECTATOR Role */}
        {playerRole === 'SPECTATOR' && cloneGameData && (
          <>
            {renderConsistentScreen(
              'WATCHING',
              <>
                {/* Round Info */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <p style={{
                    fontSize: '16px',
                    color: '#6B6B6B',
                    margin: 0,
                    fontWeight: '600'
                  }}>Round {cloneGameData.roundNumber}</p>
                </div>

                {/* Status Icon */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '40px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Eye style={{ width: '40px', height: '40px', color: '#5A8A6F' }} />
                  </div>
                </div>

                {/* Status Message */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: '18px',
                    color: '#1A1A1A',
                    marginBottom: '15px',
                    fontWeight: '600'
                  }}>Waiting for other players...</p>

                  <p style={{
                    fontSize: '16px',
                    color: '#6B6B6B',
                    lineHeight: '1.5'
                  }}>
                    {getSpectatorMessage(cloneGameData, getCurrentPlayer() || {} as ClonePlayer)}
                  </p>
                </div>

                {/* Current Game Phase Info */}
                <div style={{
                  marginTop: '30px',
                  padding: '15px',
                  backgroundColor: '#F7FAFC',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '14px', color: '#6B6B6B', margin: 0 }}>
                    Phase: {cloneGameData.gamePhase.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* Debug Info - Development Only */}
        {process.env.NODE_ENV === 'development' && cloneGameData && (
          <div style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '320px'
          }}>
            <div>Role: {playerRole}</div>
            <div>Phase: {cloneGameData.gamePhase}</div>
            <div>Player: {playerId}</div>
            <div>Team: {getCurrentPlayer()?.teamId || 'unknown'}</div>
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #96A3AB 0%, #EFA744 100%)',
      padding: '24px'
    }}>
      <div style={{
        paddingBottom: '40px'
      }}>
        {gameState === 'joining' && renderJoinScreen()}
        {gameState === 'creating-clone' && renderCloneCreation()}
        {gameState === 'waiting' && renderWaitingRoom()}
        {gameState === 'playing' && renderGamePlay()}
      </div>
    </div>
  );
};

export default CloneGamePlay;
