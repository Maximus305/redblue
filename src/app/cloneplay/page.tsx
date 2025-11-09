"use client"
import React, { useState, useEffect, useRef } from 'react';
import CloneGameService, { CloneGameState, ClonePlayer, getTeamColor, getTeamImage } from '@/services/clone';
import LobbyService from '@/services/lobby';
import {
  determinePlayerRole,
  validateGameState,
  getRoleActionText,
  isTeamLeader,
  PlayerRole
} from '@/utils/playerRoles';

// Type definitions
type GameState = 'joining' | 'waiting' | 'creating-clone' | 'playing' | 'results' | 'game_over';

const CloneGamePlay: React.FC = () => {
  // Add styles for placeholder
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .clone-textarea::placeholder,
      .clone-response-textarea::placeholder {
        color: #999999 !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [gameState, setGameState] = useState<GameState>('waiting');
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [cloneGameData, setCloneGameData] = useState<CloneGameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Clone profile states
  const [cloneInfo, setCloneInfo] = useState<string>('');

  // Gameplay states
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [showAnswerInterface, setShowAnswerInterface] = useState<boolean>(false);
  const [votingChoice, setVotingChoice] = useState<'human' | 'clone' | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'human' | 'clone' | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<PlayerRole>('SPECTATOR');
  const [hasSubmittedResponse, setHasSubmittedResponse] = useState<boolean>(false);
  const lastGeneratedQuestionRef = useRef<string>('');
  const lastRoundNumberRef = useRef<number>(0);

  // Response flow states
  const [responseStep, setResponseStep] = useState<'selection' | 'speak' | 'type' | 'read'>('selection');
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [generatingAI, setGeneratingAI] = useState<boolean>(false);

  // Helper function to generate clone response from typed answer
  const generateCloneResponse = async (question: string, humanAnswer: string): Promise<string> => {
    try {
      // Get player's clone profile
      const currentPlayer = cloneGameData?.players.find(p => p.id === playerId);
      const cloneProfile = currentPlayer?.cloneInfo || '';

      // Call AI API to generate clone response based on profile + human answer
      const response = await fetch('/api/generate-clone-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cloneData: cloneProfile,
          question: question,
          humanAnswer: humanAnswer,
          topic: cloneGameData?.topic || 'General'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response;
      }

      // Fallback if API fails
      console.warn('AI API call failed, using fallback');
      return `I'd say ${humanAnswer.toLowerCase()}`;

    } catch (error) {
      console.error('Error generating clone response:', error);
      // Fallback transformation
      return `I'd say ${humanAnswer.toLowerCase()}`;
    }
  };

  // Consistent Layout Template - matches main app exactly
  const renderConsistentScreen = (
    title: string,
    content: React.ReactNode,
    bottomButton?: { text: string; onClick: () => void; disabled?: boolean; loading?: boolean }
  ) => (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        {/* Header with title only */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: '30px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'black',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '1px'
          }}>{title}</h1>
        </div>

        {/* Content area - no background */}
        <div style={{
          padding: '20px 0',
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
              backgroundColor: bottomButton.disabled || bottomButton.loading ? 'rgba(0, 69, 255, 0.5)' : '#0045FF',
              color: 'white',
              padding: '20px',
              borderRadius: '50px',
              border: 'none',
              cursor: bottomButton.disabled || bottomButton.loading ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              opacity: bottomButton.disabled || bottomButton.loading ? 0.6 : 1
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

              // Show all players and their leadership status with detailed info
              console.log('  - All Players:');
              gameData.players.forEach(p => {
                const isLeader = isTeamLeader(gameData, p.id);
                const joinedAtType = p.joinedAt ? typeof p.joinedAt : 'undefined';
                const hasToMillis = p.joinedAt && typeof p.joinedAt === 'object' && 'toMillis' in p.joinedAt;
                console.log(`    Player: ${p.name} (${p.id})`);
                console.log(`      Team: ${p.teamId} | Platform: ${p.platform} | Leader: ${isLeader}`);
                console.log(`      Joined: ${p.joinedAt} | Type: ${joinedAtType} | HasToMillis: ${hasToMillis}`);
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
          } else if (gameData.gamePhase === 'results') {
            console.log('🎮 Setting state to results');
            setGameState('results');
          } else if (gameData.gamePhase === 'game_over') {
            console.log('🎮 Setting state to game_over');
            setGameState('game_over');
          } else {
            console.log('🎮 Setting state to playing');
            setGameState('playing');
          }

          // Reset choice when new question comes, but keep AI response if it's for the same question
          if (gameData.gamePhase === 'waiting_for_response' && gameData.currentPlayer === playerId) {
            setSelectedChoice(null);
            setTypedAnswer('');
            setResponseStep('selection');
            // Only clear AI response if it's a NEW question
            if (gameData.currentQuestion !== lastGeneratedQuestionRef.current) {
              setAiResponse('');
              setHasSubmittedResponse(false); // Reset for new question
            }
          }

          // Reset voting choice when not in voting phase or when new round starts
          if (gameData.gamePhase !== 'voting') {
            setVotingChoice(null);
          }

          // Reset voting choice when round changes
          if (gameData.roundNumber !== lastRoundNumberRef.current) {
            console.log('🔄 Round changed, resetting voting choice and response state');
            setVotingChoice(null);
            setHasSubmittedResponse(false);
            lastRoundNumberRef.current = gameData.roundNumber;
          }

          // Check if it's current player's turn to respond
          if (gameData.currentPlayer === playerId &&
              gameData.currentQuestion &&
              gameData.awaitingResponse) {
            setShowAnswerInterface(true);
            // Reset to selection step when new question arrives
            if (gameData.currentQuestion !== lastGeneratedQuestionRef.current) {
              console.log('🎯 New question arrived, resetting to selection step');
              lastGeneratedQuestionRef.current = gameData.currentQuestion;
              setResponseStep('selection');
              setTypedAnswer('');
              setAiResponse('');
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
  // Old generateAIResponse function removed - now using generateCloneResponse with humanAnswer

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
      await CloneGameService.submitQuestion(roomId, currentQuestion);
      setCurrentQuestion('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async (choice?: 'human' | 'clone'): Promise<void> => {
    const finalChoice = choice || selectedChoice;

    if (!finalChoice || !roomId || !playerId) {
      setError('Please select a response option');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      // Submit response based on the choice
      const humanAnswerToSubmit = finalChoice === 'clone' ? typedAnswer : '';
      const aiResponseToSubmit = finalChoice === 'clone' ? aiResponse : '';

      await CloneGameService.submitPlayerResponse(
        roomId,
        playerId,
        finalChoice,
        humanAnswerToSubmit,
        aiResponseToSubmit
      );
      setShowAnswerInterface(false);
      setResponseStep('selection');
      setHasSubmittedResponse(true); // Mark as submitted immediately
      // Don't clear selectedChoice, humanAnswer, or aiResponse - keep them for the same question
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit response');
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit vote');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlayer = (): ClonePlayer | undefined => {
    return cloneGameData?.players.find(p => p.id === playerId);
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
          backgroundColor: '#0045FF',
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
          color: 'black',
          textAlign: 'center',
          margin: 0,
          letterSpacing: '1px'
        }}>JOIN CLONE</h1>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '25px',
          backgroundColor: '#0045FF',
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
          color: 'black',
          textAlign: 'center',
          marginBottom: '16px',
          fontWeight: '500'
        }}>Invalid Access</p>

        <p style={{
          fontSize: '16px',
          color: 'black',
          textAlign: 'center',
          marginBottom: '8px'
        }}>Please join the game by scanning the QR code from the host&apos;s device.</p>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#0045FF',
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
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'black',
            margin: '0 0 15px 0'
          }}>
            Topic: {cloneGameData?.topic || 'General'}
          </h2>
          <p style={{
            fontSize: '20px',
            color: 'black',
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
          className="clone-textarea"
          style={{
            width: '100%',
            minHeight: '180px',
            padding: '15px',
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '12px',
            outline: 'none',
            fontSize: '20px',
            color: 'black',
            resize: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
          disabled={isLoading}
        />
        <div style={{
          textAlign: 'right',
          fontSize: '14px',
          color: 'rgba(0,0,0,0.7)',
          marginTop: '10px'
        }}>
          {cloneInfo.length}/500
        </div>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '14px', color: 'white', textAlign: 'center', margin: 0 }}>{error}</p>
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

  const renderWaitingRoom = (): React.ReactElement => {
    const currentPlayer = getCurrentPlayer();

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
        <div className="w-full max-w-md" style={{textAlign: 'center'}}>
          {/* Round Number */}
          {cloneGameData && cloneGameData.roundNumber > 0 && (
            <h2 style={{
              fontSize: '48px',
              color: 'black',
              fontWeight: 'bold',
              margin: '0 0 40px 0',
              letterSpacing: '2px'
            }}>
              Round {cloneGameData.roundNumber}
            </h2>
          )}

          {/* Team Name - Always show if player has team */}
          {currentPlayer?.teamId && (
            <h1 style={{
              fontSize: '48px',
              color: 'black',
              fontWeight: 'bold',
              margin: '0 0 60px 0',
              letterSpacing: '1px'
            }}>
              Team {getTeamColor(currentPlayer.teamId)}
            </h1>
          )}

          {/* Loading Spinner */}
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '60px'}}>
            <div style={{
              width: '120px',
              height: '120px',
              border: '8px solid rgba(0, 69, 255, 0.2)',
              borderTop: '8px solid #0045FF',
              borderRadius: '50%'
            }} className="animate-spin"></div>
          </div>

          {/* Waiting Message */}
          <p style={{
            color: 'black',
            fontSize: '32px',
            fontWeight: '600',
            margin: 0,
            lineHeight: '1.4',
            maxWidth: '600px',
            paddingLeft: '20px',
            paddingRight: '20px'
          }}>
            Waiting for the other players to get it together.
          </p>
        </div>
      </div>
    );
  };

  const renderResults = (): React.ReactElement => {
    if (!cloneGameData) return <div>Loading...</div>;

    const currentPlayer = getCurrentPlayer();
    const roundResult = cloneGameData.roundResult;
    const wasCorrect = roundResult?.correct || false;
    const usedClone = cloneGameData.usedClone;

    // Determine if current player's team was the one guessing
    const myTeam = currentPlayer?.teamId;
    const questioningTeam = cloneGameData.questioningTeam;
    const wasMyTeamGuessing = myTeam === questioningTeam;

    // Message options for different scenarios
    const myTeamCorrectMessages = ['NICE JOB!', 'NAILED IT!', 'SPOT ON!', 'CRUSHED IT!', 'PERFECT!'];
    const myTeamWrongMessages = ['WAY OFF!', 'MISSED IT!', 'NOT EVEN CLOSE!', 'SWING AND A MISS!', 'BETTER LUCK NEXT TIME!'];
    const otherTeamCorrectMessages = ['THEY GOT YOU!', 'CAUGHT!', 'THEY NAILED IT!', 'BUSTED!', 'THEY SAW THROUGH IT!'];
    const otherTeamWrongMessages = ['THEY\'RE WAY OFF!', 'THEY MISSED!', 'FOOLED THEM!', 'THEY FELL FOR IT!', 'GOT AWAY WITH IT!'];

    // Select random message based on scenario
    let resultMessage = '';
    if (wasMyTeamGuessing) {
      if (wasCorrect) {
        resultMessage = myTeamCorrectMessages[Math.floor(Math.random() * myTeamCorrectMessages.length)];
      } else {
        resultMessage = myTeamWrongMessages[Math.floor(Math.random() * myTeamWrongMessages.length)];
      }
    } else {
      if (wasCorrect) {
        resultMessage = otherTeamCorrectMessages[Math.floor(Math.random() * otherTeamCorrectMessages.length)];
      } else {
        resultMessage = otherTeamWrongMessages[Math.floor(Math.random() * otherTeamWrongMessages.length)];
      }
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
        <div className="w-full max-w-md" style={{textAlign: 'center'}}>
          {/* Result Message */}
          <h1 style={{
            fontSize: '56px',
            fontWeight: 'bold',
            color: 'black',
            margin: '0 0 40px 0',
            letterSpacing: '2px'
          }}>
            {resultMessage}
          </h1>

          {/* Round Number */}
          <p style={{
            fontSize: '28px',
            color: 'black',
            fontWeight: 'bold',
            marginBottom: '30px'
          }}>
            Round {cloneGameData.roundNumber}
          </p>

          {/* Team Display */}
          {currentPlayer?.teamId && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '50px'
            }}>
              <img
                src={getTeamImage(currentPlayer.teamId)}
                alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                style={{
                  height: '80px',
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
              <p style={{
                fontSize: '36px',
                color: 'black',
                fontWeight: 'bold',
                margin: 0
              }}>
                Team {getTeamColor(currentPlayer.teamId)}
              </p>
            </div>
          )}

          {/* Answer Reveal */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '20px',
            marginBottom: '40px'
          }}>
            <p style={{
              fontSize: '22px',
              color: 'black',
              marginBottom: '15px',
              fontWeight: '600'
            }}>
              It was {usedClone ? 'AI Clone' : 'Human'}!
            </p>
          </div>

          {/* Scoreboard */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '20px'
          }}>
            <h2 style={{
              fontSize: '28px',
              color: 'black',
              fontWeight: 'bold',
              marginBottom: '25px',
              letterSpacing: '1px'
            }}>
              SCOREBOARD
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <img src="/teamred.png" alt="Team Red" style={{ height: '40px', width: 'auto' }} />
                  <span style={{ fontSize: '24px', color: 'black', fontWeight: 'bold' }}>Team Red</span>
                </div>
                <span style={{ fontSize: '32px', color: 'black', fontWeight: 'bold' }}>
                  {cloneGameData.teamAScore}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <img src="/teamyellow.png" alt="Team Yellow" style={{ height: '40px', width: 'auto' }} />
                  <span style={{ fontSize: '24px', color: 'black', fontWeight: 'bold' }}>Team Yellow</span>
                </div>
                <span style={{ fontSize: '32px', color: 'black', fontWeight: 'bold' }}>
                  {cloneGameData.teamBScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGameOver = (): React.ReactElement => {
    if (!cloneGameData) return <div>Loading...</div>;

    const teamAScore = cloneGameData.teamAScore;
    const teamBScore = cloneGameData.teamBScore;
    const winner = teamAScore > teamBScore ? 'Red' : teamBScore > teamAScore ? 'Yellow' : 'Tie';
    const winnerTeamId = teamAScore > teamBScore ? 'A' : 'B';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
        <div className="w-full max-w-md" style={{textAlign: 'center'}}>
          {/* Game Over Title */}
          <h1 style={{
            fontSize: '56px',
            fontWeight: 'bold',
            color: 'black',
            margin: '0 0 20px 0',
            letterSpacing: '3px'
          }}>
            GAME OVER
          </h1>

          {/* Winner Announcement */}
          {winner !== 'Tie' ? (
            <>
              <p style={{
                fontSize: '32px',
                color: 'black',
                fontWeight: '600',
                marginBottom: '40px'
              }}>
                Team {winner} Wins!
              </p>

              {/* Winner Team Image */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '50px'
              }}>
                <img
                  src={getTeamImage(winnerTeamId)}
                  alt={`Team ${winner}`}
                  style={{
                    height: '120px',
                    width: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </>
          ) : (
            <p style={{
              fontSize: '32px',
              color: 'black',
              fontWeight: '600',
              marginBottom: '50px'
            }}>
              It&apos;s a Tie!
            </p>
          )}

          {/* Final Scoreboard */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '40px',
            borderRadius: '20px'
          }}>
            <h2 style={{
              fontSize: '32px',
              color: 'black',
              fontWeight: 'bold',
              marginBottom: '30px',
              letterSpacing: '1px'
            }}>
              FINAL SCORE
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <img src="/teamred.png" alt="Team Red" style={{ height: '50px', width: 'auto' }} />
                  <span style={{ fontSize: '28px', color: 'black', fontWeight: 'bold' }}>Team Red</span>
                </div>
                <span style={{ fontSize: '40px', color: 'black', fontWeight: 'bold' }}>
                  {teamAScore}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <img src="/teamyellow.png" alt="Team Yellow" style={{ height: '50px', width: 'auto' }} />
                  <span style={{ fontSize: '28px', color: 'black', fontWeight: 'bold' }}>Team Yellow</span>
                </div>
                <span style={{ fontSize: '40px', color: 'black', fontWeight: 'bold' }}>
                  {teamBScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGamePlay = (): React.ReactElement => {
    if (!cloneGameData) {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{color: 'rgba(0,0,0,0.7)'}}>Loading game data...</div>
        </div>
      );
    }

    return (
      <>
        {/* QUESTIONER Role */}
        {playerRole === 'QUESTIONER' && cloneGameData && cloneGameData.gamePhase === 'questioning' && !cloneGameData.currentQuestion && (
          <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
            <div className="w-full max-w-md" style={{paddingTop: '60px'}}>
              {/* Header */}
              <h1 style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'black',
                textAlign: 'center',
                margin: '0 0 40px 0',
                letterSpacing: '3px'
              }}>QUESTIONING</h1>

              {/* Round Number */}
              <p style={{
                fontSize: '28px',
                color: 'black',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: '0 0 30px 0'
              }}>Round {cloneGameData.roundNumber}</p>

              {/* Team Indicator */}
              {(() => {
                const currentPlayer = getCurrentPlayer();
                if (currentPlayer?.teamId) {
                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '15px',
                      marginBottom: '60px'
                    }}>
                      <img
                        src={getTeamImage(currentPlayer.teamId)}
                        alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                        style={{
                          height: '80px',
                          width: 'auto',
                          objectFit: 'contain'
                        }}
                      />
                      <p style={{
                        fontSize: '36px',
                        color: 'black',
                        fontWeight: 'bold',
                        margin: 0
                      }}>
                        Team {getTeamColor(currentPlayer.teamId)}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Instructions */}
              <p style={{
                fontSize: '22px',
                color: 'black',
                textAlign: 'center',
                marginBottom: '25px',
                fontWeight: '500'
              }}>Ask a question</p>

              {/* Question Input */}
              <textarea
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="What&apos;s your favorite..."
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '12px',
                  padding: '20px',
                  fontSize: '20px',
                  color: 'black',
                  minHeight: '140px',
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  marginBottom: '20px'
                }}
              />

              {error && (
                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: 'rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px'
                }}>
                  <p style={{ fontSize: '14px', color: 'white', textAlign: 'center', margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Button */}
              <button
                onClick={handleSubmitQuestion}
                disabled={!currentQuestion.trim() || isLoading}
                style={{
                  width: '100%',
                  backgroundColor: (!currentQuestion.trim() || isLoading) ? 'rgba(0, 69, 255, 0.5)' : '#0045FF',
                  color: 'white',
                  padding: '20px',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: (!currentQuestion.trim() || isLoading) ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  opacity: (!currentQuestion.trim() || isLoading) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}

        {/* RESPONDER Role - Waiting for Question or After Submitting Response */}
        {playerRole === 'RESPONDER' && cloneGameData && !showAnswerInterface && (
          <>
            {cloneGameData.currentQuestion && !cloneGameData.playerResponse && !hasSubmittedResponse ? (
              // Question asked, haven't responded yet
              renderConsistentScreen(
                'YOUR TURN',
                <>
                  {/* Round and Team Info */}
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <p style={{
                      fontSize: '18px',
                      color: 'black',
                      margin: '0 0 15px 0',
                      fontWeight: '600'
                    }}>Round {cloneGameData.roundNumber}</p>

                    {/* Team Indicator */}
                    {(() => {
                      const currentPlayer = getCurrentPlayer();
                      if (currentPlayer?.teamId) {
                        return (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <img
                              src={getTeamImage(currentPlayer.teamId)}
                              alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                              style={{
                                height: '120px',
                                width: 'auto',
                                objectFit: 'contain'
                              }}
                            />
                            <p style={{
                              fontSize: '24px',
                              color: 'black',
                              fontWeight: 'bold',
                              margin: 0
                            }}>
                              Team {getTeamColor(currentPlayer.teamId)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Question */}
                  <p style={{
                    fontSize: '20px',
                    color: 'black',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginBottom: '20px',
                    lineHeight: '1.4'
                  }}>
                    &ldquo;{cloneGameData.currentQuestion}&rdquo;
                  </p>
                </>,
                {
                  text: 'Choose Response',
                  onClick: () => setShowAnswerInterface(true),
                  disabled: false,
                  loading: false
                }
              )
            ) : (
              // Waiting for question OR already responded - show loading screen
              <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
                <div className="w-full max-w-md" style={{ textAlign: 'center' }}>
                  {/* Round Number */}
                  <h2 style={{
                    fontSize: '48px',
                    color: 'black',
                    fontWeight: 'bold',
                    margin: '0 0 40px 0',
                    letterSpacing: '2px'
                  }}>Round {cloneGameData.roundNumber}</h2>

                  {/* Team Name - Always show if player has team */}
                  {(() => {
                    const currentPlayer = getCurrentPlayer();
                    if (currentPlayer?.teamId) {
                      return (
                        <h1 style={{
                          fontSize: '48px',
                          color: 'black',
                          fontWeight: 'bold',
                          margin: '0 0 60px 0',
                          letterSpacing: '1px'
                        }}>
                          Team {getTeamColor(currentPlayer.teamId)}
                        </h1>
                      );
                    }
                    return null;
                  })()}

                  {/* Loading Spinner and Message - Centered */}
                  <div style={{ padding: '0px 20px' }}>
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '60px'}}>
                      <div style={{
                        width: '120px',
                        height: '120px',
                        border: '8px solid rgba(0, 69, 255, 0.2)',
                        borderTop: '8px solid #0045FF',
                        borderRadius: '50%'
                      }} className="animate-spin"></div>
                    </div>

                    <p style={{
                      fontSize: '32px',
                      color: 'black',
                      fontWeight: '600',
                      margin: 0,
                      lineHeight: '1.4',
                      maxWidth: '600px',
                      paddingLeft: '20px',
                      paddingRight: '20px'
                    }}>
                      Waiting for the other players to get it together.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* RESPONDER Role - Response Selection */}
        {playerRole === 'RESPONDER' && cloneGameData && showAnswerInterface && (
          <div className="min-h-screen flex items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
            <div className="w-full max-w-md">
              {/* Step 1: Selection */}
              {responseStep === 'selection' && (
                <>
                  {renderConsistentScreen(
                    'RESPOND',
                    <>
                      {/* Team Indicator */}
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        {(() => {
                          const currentPlayer = getCurrentPlayer();
                          if (currentPlayer?.teamId) {
                            return (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '20px'
                              }}>
                                <img
                                  src={getTeamImage(currentPlayer.teamId)}
                                  alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                                  style={{
                                    height: '100px',
                                    width: 'auto',
                                    objectFit: 'contain'
                                  }}
                                />
                                <p style={{
                                  fontSize: '24px',
                                  color: 'black',
                                  fontWeight: 'bold',
                                  margin: 0
                                }}>
                                  Team {getTeamColor(currentPlayer.teamId)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Question */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '24px',
                        borderRadius: '20px',
                        marginBottom: '40px'
                      }}>
                        <p style={{
                          fontSize: '24px',
                          color: 'black',
                          margin: 0,
                          lineHeight: '1.4',
                          fontWeight: '600',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          &ldquo;{cloneGameData.currentQuestion}&rdquo;
                        </p>
                      </div>

                      {/* Instructions */}
                      <p style={{
                        fontSize: '24px',
                        color: 'black',
                        textAlign: 'center',
                        marginBottom: '30px',
                        fontWeight: '600'
                      }}>How do you want to respond?</p>

                      {/* Button Container */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                      }}>
                        <button
                          onClick={() => setResponseStep('speak')}
                          style={{
                            width: '100%',
                            backgroundColor: '#0045FF',
                            color: 'white',
                            padding: '24px',
                            borderRadius: '50px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                        >
                          Respond Myself
                        </button>

                        <button
                          onClick={() => setResponseStep('type')}
                          style={{
                            width: '100%',
                            backgroundColor: '#0045FF',
                            color: 'white',
                            padding: '24px',
                            borderRadius: '50px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                        >
                          Choose AI Response
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Step 2a: Speak */}
              {responseStep === 'speak' && (
                <>
                  {renderConsistentScreen(
                    'SPEAK YOUR ANSWER',
                    <>
                      {/* Team Indicator */}
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        {(() => {
                          const currentPlayer = getCurrentPlayer();
                          if (currentPlayer?.teamId) {
                            return (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '20px'
                              }}>
                                <img
                                  src={getTeamImage(currentPlayer.teamId)}
                                  alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                                  style={{
                                    height: '100px',
                                    width: 'auto',
                                    objectFit: 'contain'
                                  }}
                                />
                                <p style={{
                                  fontSize: '24px',
                                  color: 'black',
                                  fontWeight: 'bold',
                                  margin: 0
                                }}>
                                  Team {getTeamColor(currentPlayer.teamId)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Question */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '24px',
                        borderRadius: '20px',
                        marginBottom: '40px'
                      }}>
                        <p style={{
                          fontSize: '24px',
                          color: 'black',
                          margin: 0,
                          lineHeight: '1.4',
                          fontWeight: '600',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          &ldquo;{cloneGameData.currentQuestion}&rdquo;
                        </p>
                      </div>

                      {/* Instructions */}
                      <p style={{
                        fontSize: '24px',
                        color: 'black',
                        textAlign: 'center',
                        marginBottom: '30px',
                        fontWeight: '600',
                        lineHeight: '1.4'
                      }}>Now it&apos;s time to make up a response and speak out loud</p>
                    </>,
                    {
                      text: 'Done Speaking - Next',
                      onClick: () => handleSubmitResponse('human', false),
                      disabled: isLoading,
                      loading: isLoading
                    }
                  )}
                </>
              )}

              {/* Step 2b: Type */}
              {responseStep === 'type' && (
                <>
                  {renderConsistentScreen(
                    'TYPE YOUR ANSWER',
                    <>
                      {/* Team Indicator */}
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        {(() => {
                          const currentPlayer = getCurrentPlayer();
                          if (currentPlayer?.teamId) {
                            return (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '20px'
                              }}>
                                <img
                                  src={getTeamImage(currentPlayer.teamId)}
                                  alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                                  style={{
                                    height: '100px',
                                    width: 'auto',
                                    objectFit: 'contain'
                                  }}
                                />
                                <p style={{
                                  fontSize: '24px',
                                  color: 'black',
                                  fontWeight: 'bold',
                                  margin: 0
                                }}>
                                  Team {getTeamColor(currentPlayer.teamId)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Question */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '24px',
                        borderRadius: '20px',
                        marginBottom: '30px'
                      }}>
                        <p style={{
                          fontSize: '24px',
                          color: 'black',
                          margin: 0,
                          lineHeight: '1.4',
                          fontWeight: '600',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          &ldquo;{cloneGameData.currentQuestion}&rdquo;
                        </p>
                      </div>

                      {/* Instructions */}
                      <p style={{
                        fontSize: '22px',
                        color: 'black',
                        textAlign: 'center',
                        marginBottom: '10px',
                        fontWeight: '600'
                      }}>Type your honest answer below</p>

                      <p style={{
                        fontSize: '18px',
                        color: 'rgba(0, 0, 0, 0.7)',
                        textAlign: 'center',
                        marginBottom: '25px'
                      }}>The AI will create a clone response for you to read.</p>

                      {/* Textarea */}
                      <textarea
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        placeholder="Type your honest answer..."
                        className="clone-response-textarea"
                        style={{
                          width: '100%',
                          backgroundColor: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '16px',
                          color: 'black',
                          fontSize: '20px',
                          resize: 'none',
                          outline: 'none',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          minHeight: '120px',
                          marginBottom: '20px'
                        }}
                      />
                    </>,
                    {
                      text: generatingAI ? 'Generating...' : 'Generate AI Response',
                      onClick: async () => {
                        if (!typedAnswer.trim()) return;
                        setGeneratingAI(true);
                        try {
                          const cloneResponse = await generateCloneResponse(
                            cloneGameData.currentQuestion || '',
                            typedAnswer
                          );
                          setAiResponse(cloneResponse);
                          setResponseStep('read');
                        } catch (error) {
                          console.error('Error generating AI response:', error);
                          setAiResponse(`I'd say ${typedAnswer.toLowerCase()}`);
                          setResponseStep('read');
                        } finally {
                          setGeneratingAI(false);
                        }
                      },
                      disabled: !typedAnswer.trim() || generatingAI,
                      loading: generatingAI
                    }
                  )}
                </>
              )}

              {/* Step 3: Read */}
              {responseStep === 'read' && (
                <>
                  {renderConsistentScreen(
                    'READ THIS OUT LOUD',
                    <>
                      {/* Team Indicator */}
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        {(() => {
                          const currentPlayer = getCurrentPlayer();
                          if (currentPlayer?.teamId) {
                            return (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '20px'
                              }}>
                                <img
                                  src={getTeamImage(currentPlayer.teamId)}
                                  alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                                  style={{
                                    height: '100px',
                                    width: 'auto',
                                    objectFit: 'contain'
                                  }}
                                />
                                <p style={{
                                  fontSize: '24px',
                                  color: 'black',
                                  fontWeight: 'bold',
                                  margin: 0
                                }}>
                                  Team {getTeamColor(currentPlayer.teamId)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Question */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '24px',
                        borderRadius: '20px',
                        marginBottom: '30px'
                      }}>
                        <p style={{
                          fontSize: '24px',
                          color: 'black',
                          margin: 0,
                          lineHeight: '1.4',
                          fontWeight: '600',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          &ldquo;{cloneGameData.currentQuestion}&rdquo;
                        </p>
                      </div>

                      {/* Instructions */}
                      <p style={{
                        fontSize: '24px',
                        color: 'black',
                        textAlign: 'center',
                        marginBottom: '25px',
                        fontWeight: '600'
                      }}>Read this response out loud:</p>

                      {/* AI Response Display */}
                      <div style={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '20px'
                      }}>
                        <p style={{
                          fontSize: '22px',
                          color: 'black',
                          margin: 0,
                          lineHeight: '1.5',
                          fontWeight: '500'
                        }}>
                          {aiResponse}
                        </p>
                      </div>
                    </>,
                    {
                      text: 'Done Reading - Next',
                      onClick: () => handleSubmitResponse('clone', true),
                      disabled: isLoading,
                      loading: isLoading
                    }
                  )}
                </>
              )}
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
                    fontSize: '18px',
                    color: 'black',
                    margin: '0 0 8px 0',
                    fontWeight: '600'
                  }}>Round {cloneGameData.roundNumber}</p>

                  {/* Team Indicator */}
                  {(() => {
                    const currentPlayer = getCurrentPlayer();
                    if (currentPlayer?.teamId) {
                      return (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <img
                            src={getTeamImage(currentPlayer.teamId)}
                            alt={`Team ${getTeamColor(currentPlayer.teamId)}`}
                            style={{
                              height: '120px',
                              width: 'auto',
                              objectFit: 'contain'
                            }}
                          />
                          <p style={{
                            fontSize: '24px',
                            color: 'black',
                            fontWeight: 'bold',
                            margin: 0
                          }}>
                            Team {getTeamColor(currentPlayer.teamId)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Question */}
                {cloneGameData.currentQuestion && (
                  <div style={{ marginBottom: '30px' }}>
                    <p style={{
                      fontSize: '20px',
                      color: 'black',
                      textAlign: 'center',
                      fontStyle: 'italic',
                      lineHeight: '1.4'
                    }}>
                      &ldquo;{cloneGameData.currentQuestion}&rdquo;
                    </p>
                  </div>
                )}

                {/* Listening Instructions */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  padding: '30px',
                  borderRadius: '20px',
                  marginBottom: '40px'
                }}>
                  <p style={{
                    fontSize: '24px',
                    color: 'black',
                    textAlign: 'center',
                    lineHeight: '1.5',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    Listen to {cloneGameData.players.find(p => p.id === cloneGameData.currentPlayer)?.name || 'the player'} read their answer out loud
                  </p>
                </div>

                {/* Voting Instructions */}
                <p style={{
                  fontSize: '24px',
                  color: 'black',
                  textAlign: 'center',
                  marginBottom: '24px',
                  fontWeight: '600'
                }}>Did they respond themselves or use the AI Clone?</p>

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
                      backgroundColor: votingChoice === 'human' ? '#0038CC' : '#0045FF',
                      color: 'white',
                      padding: '24px',
                      borderRadius: '50px',
                      border: 'none',
                      cursor: isLoading || votingChoice !== null ? 'not-allowed' : 'pointer',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s',
                      opacity: votingChoice !== null && votingChoice !== 'human' ? 0.5 : 1
                    }}
                  >
                    HUMAN
                  </button>

                  <button
                    onClick={() => handleVote('clone')}
                    disabled={isLoading || votingChoice !== null}
                    style={{
                      backgroundColor: votingChoice === 'clone' ? '#0038CC' : '#0045FF',
                      color: 'white',
                      padding: '24px',
                      borderRadius: '50px',
                      border: 'none',
                      cursor: isLoading || votingChoice !== null ? 'not-allowed' : 'pointer',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s',
                      opacity: votingChoice !== null && votingChoice !== 'clone' ? 0.5 : 1
                    }}
                  >
                    AI CLONE
                  </button>
                </div>

                {votingChoice && (
                  <div style={{
                    marginTop: '30px',
                    padding: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '16px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '18px', color: 'black', margin: 0, fontWeight: '600' }}>
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
          <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
            <div className="w-full max-w-md" style={{textAlign: 'center'}}>
              {/* Round Number */}
              {cloneGameData.roundNumber > 0 && (
                <h2 style={{
                  fontSize: '48px',
                  color: 'black',
                  fontWeight: 'bold',
                  margin: '0 0 40px 0',
                  letterSpacing: '2px'
                }}>
                  Round {cloneGameData.roundNumber}
                </h2>
              )}

              {/* Team Name - Always show if player has team */}
              {getCurrentPlayer()?.teamId && (
                <h1 style={{
                  fontSize: '48px',
                  color: 'black',
                  fontWeight: 'bold',
                  margin: '0 0 60px 0',
                  letterSpacing: '1px'
                }}>
                  Team {getTeamColor(getCurrentPlayer()!.teamId)}
                </h1>
              )}

              {/* Loading Spinner */}
              <div style={{display: 'flex', justifyContent: 'center', marginBottom: '60px'}}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  border: '8px solid rgba(0, 69, 255, 0.2)',
                  borderTop: '8px solid #0045FF',
                  borderRadius: '50%'
                }} className="animate-spin"></div>
              </div>

              {/* Waiting Message */}
              <p style={{
                color: 'black',
                fontSize: '32px',
                fontWeight: '600',
                margin: 0,
                lineHeight: '1.4',
                maxWidth: '600px',
                paddingLeft: '20px',
                paddingRight: '20px'
              }}>
                Waiting for the other players to get it together.
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      padding: '24px'
    }}>
      <div style={{
        paddingBottom: '40px'
      }}>
        {gameState === 'joining' && renderJoinScreen()}
        {gameState === 'creating-clone' && renderCloneCreation()}
        {gameState === 'waiting' && renderWaitingRoom()}
        {gameState === 'playing' && renderGamePlay()}
        {gameState === 'results' && renderResults()}
        {gameState === 'game_over' && renderGameOver()}
      </div>
    </div>
  );
};

export default CloneGamePlay;
