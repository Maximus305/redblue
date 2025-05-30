"use client"
import React, { useState, useEffect, use } from "react";
import { Shield, Loader2, Crown, AlertCircle, Eye, ClipboardList, X } from 'lucide-react';
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  getDocs,
  where,
  
  
} from "firebase/firestore";
import { IconForWord } from '@/utils/codeWords';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from 'qrcode.react';

// Type definitions
interface AgentPageProps {
  params: Promise<{
    roomId: string;
    agentSlug: string;
  }>;
}

interface SettingsData {
  redSpymaster: string;
  blueSpymaster: string;
  evenCodeWord: string;
  oddCodeWord: string;
  gameMode?: 'teams' | 'spy';
  commonCodeWord?: string;
  spyAgent?: string;
  spyAgents?: string[];
  gameStarted?: boolean;
}

interface RoomInfo {
  active: boolean;
  // Add other fields you expect in the room document
}

interface PlayerScore {
  agentId: string;
  agentName: string;
  score: number;
  isSwiftPlayer?: boolean;
  platform?: string;
}

// Component for showing the "You've been removed" alert
const RemovedAlert = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
            <h3 className="text-lg font-bold text-red-600">You&#39;ve been removed</h3>
          </div>
          
          <p className="mb-6 text-gray-600">
            You have been removed from the room by the host.
          </p>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function isSlugEven(slug: string): boolean {
  let sum = 0;
  for (let i = 0; i < slug.length; i++) {
    sum += slug.charCodeAt(i);
  }
  return sum % 2 === 0;
}

export default function RoomAgentPage({ params }: AgentPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { roomId, agentSlug } = resolvedParams;
  
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [codeWord, setCodeWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [isSpymaster, setIsSpymaster] = useState<{
    isRed: boolean;
    isBlue: boolean;
  }>({ isRed: false, isBlue: false });
  const [gameMode, setGameMode] = useState<'teams' | 'spy'>('teams');
  const [isSpy, setIsSpy] = useState(false);
  const [, setRoomInfo] = useState<RoomInfo | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [hasBeenRemoved, setHasBeenRemoved] = useState(false);
  const [iconSize, setIconSize] = useState(80);
  
  const allCodeWords = [
    'Atlas', 'Balloon', 'Bamboo', 'Basket',
    'Bell', 'Boat', 'Bullet', 'Camera',
    'Castle', 'Chair', 'Clock', 'Diamond',
    'Hammer', 'Lantern', 'Lock', 'Ring',
    'Rocket', 'Car', 'Hack', 'Key',
    'Bike', 'Gun', 'Rubiks'
  ];

  // Add this useEffect to handle responsive icon sizing:
  useEffect(() => {
    const updateIconSize = () => {
      const width = window.innerWidth;
      if (width < 640) setIconSize(36);
      else if (width < 768) setIconSize(56);
      else if (width < 1024) setIconSize(72);
      else setIconSize(80);
    };

    updateIconSize();
    window.addEventListener('resize', updateIconSize);
    return () => window.removeEventListener('resize', updateIconSize);
  }, []);
  
  // Player score functions
  // Improved fetchPlayerScores function with better iOS player deduplication
const fetchPlayerScores = async (): Promise<void> => {
  setLoadingScores(true);
  try {
    // Get all agents in the current room
    const agentsQuery = query(collection(db, "agents"), where("roomId", "==", roomId));
    const agentSnapshots = await getDocs(agentsQuery);
    
    const roomScores: PlayerScore[] = [];
    const processedPlayerIds = new Set(); // Track processed player IDs to avoid duplicates
    
    // First find the iOS/Swift player specifically to avoid duplication
    let iosPlayer: PlayerScore | null = null;
    
    // Look through all documents for iOS player first
    agentSnapshots.forEach(doc => {
      const data = doc.data();
      
      if (data.roomId === roomId) {
        // Identify iOS player with various potential attributes
        if (
          (data.agentId === "Agent01" && data.platform === "ios") || 
          (data.isSwiftPlayer === true) ||
          (doc.id === `${roomId}_Agent01` && (data.platform === "ios"))
        ) {
          // Only create or update iOS player entry if we don't have one yet or this one has a higher score
          if (!iosPlayer || (data.score > iosPlayer.score)) {
            iosPlayer = {
              agentId: "Agent01",
              agentName: data.agentName || "iOS Player",
              score: data.score || 0,
              isSwiftPlayer: true,
              platform: "ios"
            };
          }
        }
      }
    });
    
    // If we found an iOS player, add it to the results and mark as processed
    if (iosPlayer) {
      roomScores.push(iosPlayer);
      processedPlayerIds.add("Agent01");
      processedPlayerIds.add(`${roomId}_Agent01`);
    }
    
    // Now process all other players, skipping any we've already handled
    agentSnapshots.forEach(doc => {
      const data = doc.data();
      
      // Only include agents from this room
      if (data.roomId === roomId) {
        // Get the player ID in a consistent format
        const playerId = data.agentId || doc.id.replace(`${roomId}_`, "");
        
        // Skip if we've already processed this player or it's the iOS player
        if (!processedPlayerIds.has(playerId) && 
            !processedPlayerIds.has(doc.id) && 
            !processedPlayerIds.has(`${roomId}_${playerId}`)) {
          
          // Add to processed set
          processedPlayerIds.add(playerId);
          processedPlayerIds.add(`${roomId}_${playerId}`);
          
          // Regular web player
          roomScores.push({
            agentId: playerId,
            agentName: data.agentName || playerId,
            score: data.score || 0,
            isSwiftPlayer: false
          });
        }
      }
    });
    
    // Sort scores: Swift player first, then by score (highest first)
    roomScores.sort((a, b) => {
      // Swift player comes first
      if (a.isSwiftPlayer && !b.isSwiftPlayer) return -1;
      if (!a.isSwiftPlayer && b.isSwiftPlayer) return 1;
      
      // Then sort by score (highest first)
      return b.score - a.score;
    });
    
    setPlayerScores(roomScores);
  } catch (error) {
    console.error("Error fetching player scores:", error);
  } finally {
    setLoadingScores(false);
  }
};
  



  // Update player score
  

  // Increment player score
 
  
  // Function to decrement player score
 

  useEffect(() => {
    // Load agent name from localStorage
    const storedName = localStorage.getItem(`agent_name_${roomId}_${agentSlug}`);
    if (storedName) {
      setAgentName(storedName);
    } else {
      // Try to get the generic agent name as fallback
      const genericStoredName = localStorage.getItem('agentName');
      if (genericStoredName) {
        setAgentName(genericStoredName);
        // Save it with the room-specific key for future use
        localStorage.setItem(`agent_name_${roomId}_${agentSlug}`, genericStoredName);
      }
    }

    const checkRoom = async () => {
      try {
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) {
          setError("Room not found");
          setLoading(false);
          return false;
        }
        
        const roomData = roomSnap.data() as RoomInfo;
        setRoomInfo(roomData);
        
        if (!roomData.active) {
          setError("This room is no longer active");
          setLoading(false);
          return false;
        }
        
        return true;
      } catch (error) {
        console.error("Error checking room:", error);
        setError("Failed to access room");
        setLoading(false);
        return false;
      }
    };

    const initializeAgent = async () => {
      const roomValid = await checkRoom();
      if (!roomValid) return;
    
      // First, check if we have agent data in Firestore
      const agentKey = `${roomId}_${agentSlug}`;
      const agentRef = doc(db, "agents", agentKey);
      const agentSnap = await getDoc(agentRef);
      
      // Track if the agent has been properly initialized
      let agentInitialized = false;
      
      // If agent data exists, synchronize the local name with Firestore data
      if (agentSnap.exists()) {
        agentInitialized = true;
        const data = agentSnap.data();
        setAgentId(data.agentId ?? null);
        setCodeWord(data.codeWord ?? null);
        
        if (data.agentName) {
          setAgentName(data.agentName);
          localStorage.setItem(`agent_name_${roomId}_${agentSlug}`, data.agentName);
        }
        
        if (data.isSpy !== undefined) {
          setIsSpy(Boolean(data.isSpy));
        }
      }
      
      // Setup a listener to detect if this agent has been removed
      // Only consider removal after the agent has been initialized
      const agentRemovalListener = onSnapshot(
        doc(db, "agents", agentKey),
        (docSnapshot) => {
          // Only detect removal if the agent was previously initialized
          if (agentInitialized && !docSnapshot.exists()) {
            // The agent document no longer exists - this agent has been removed
            console.log("Agent has been removed from the room");
            setHasBeenRemoved(true);
          } else if (docSnapshot.exists()) {
            // Update our initialization flag once document exists
            agentInitialized = true;
          }
        },
        (error) => {
          console.error("Error setting up agent removal listener:", error);
        }
      );

      // Set up settings listener
      const settingsRef = doc(db, "settings", roomId);
      const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const settings = snapshot.data() as SettingsData;
          const currentGameMode = settings.gameMode || 'teams';
          setGameMode(currentGameMode);
          
          setGameStarted(settings.gameStarted === true);
          
          if (currentGameMode === 'spy') {
            const userIsSpy = agentSlug === settings.spyAgent || 
                             (settings.spyAgents !== undefined && settings.spyAgents.includes(agentSlug));
            setIsSpy(userIsSpy);
            setIsSpymaster({ isRed: false, isBlue: false });
            updateAgentForSpyMode(settings);
          } else {
            setIsSpy(false);
            setIsSpymaster({
              isRed: agentSlug === settings.redSpymaster,
              isBlue: agentSlug === settings.blueSpymaster
            });
            updateAgentForTeamMode(settings);
          }
        }
      });

      // Set up agent listener
      const unsubscribeAgent = onSnapshot(agentRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAgentId(data.agentId ?? null);
          setCodeWord(data.codeWord ?? null);
          
          // Update local storage with the latest agent name
          if (data.agentName) {
            setAgentName(data.agentName);
            localStorage.setItem(`agent_name_${roomId}_${agentSlug}`, data.agentName);
          }
          
          if (data.isSpy !== undefined) {
            setIsSpy(Boolean(data.isSpy));
          }
          
          setLoading(false);
        } else {
          // No agent document exists, create it
          handleGetCodeWord();
        }
      });

      setTimeout(() => setShowContent(true), 100);

      return () => {
        unsubscribeSettings();
        unsubscribeAgent();
        agentRemovalListener(); // Cleanup the removal listener
      };
    };

    initializeAgent();
  }, [roomId, agentSlug]);

  // Save agent name to both local storage and Firestore whenever it changes
  useEffect(() => {
    if (agentName && agentId) {
      // Update the room-specific storage key
      localStorage.setItem(`agent_name_${roomId}_${agentSlug}`, agentName);
      // Also update the generic key for backward compatibility
      localStorage.setItem('agentName', agentName);
      
      // Update Firestore if we have an agent ID
      const agentKey = `${roomId}_${agentSlug}`;
      const agentRef = doc(db, "agents", agentKey);
      setDoc(agentRef, { agentName }, { merge: true })
        .catch(err => console.error("Error updating agent name:", err));
    }
  }, [agentName, agentId, roomId, agentSlug]);

  const updateAgentForSpyMode = async (settings: SettingsData) => {
    if (!agentName) return;

    const agentKey = `${roomId}_${agentSlug}`;
    const agentRef = doc(db, "agents", agentKey);
    
    const userIsSpy = agentSlug === settings.spyAgent ||
                     (settings.spyAgents !== undefined && settings.spyAgents.includes(agentSlug));
    
    try {
      await setDoc(agentRef, {
        agentId: agentSlug,
        agentName,
        roomId,
        codeWord: userIsSpy ? 'spy' : settings.commonCodeWord,
        isSpy: userIsSpy
      }, { merge: true });
      
      setIsSpy(userIsSpy);
      if (userIsSpy) {
        setCodeWord('spy');
      }
    } catch (error) {
      console.error('Error updating agent for spy mode:', error);
    }
  };

  const updateAgentForTeamMode = async (settings: SettingsData) => {
    if (!agentName) return;

    const agentKey = `${roomId}_${agentSlug}`;
    const agentRef = doc(db, "agents", agentKey);
    const isRed = agentSlug === settings.redSpymaster;
    const isBlue = agentSlug === settings.blueSpymaster;
    const agentIsEven = isSlugEven(agentSlug);

    let assignedCodeWord = null;
    if (isRed) assignedCodeWord = settings.oddCodeWord;
    else if (isBlue) assignedCodeWord = settings.evenCodeWord;
    else assignedCodeWord = agentIsEven ? settings.evenCodeWord : settings.oddCodeWord;

    try {
      await setDoc(agentRef, {
        agentId: agentSlug,
        agentName,
        roomId,
        codeWord: assignedCodeWord,
        isSpy: false
      }, { merge: true });
    } catch (error) {
      console.error('Error updating agent for team mode:', error);
    }
  };

  const handleGetCodeWord = async () => {
    try {
      setLoading(true);
      setError(null);

      const agentKey = `${roomId}_${agentSlug}`;
      const agentRef = doc(db, "agents", agentKey);
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgentId(data.agentId);
        setCodeWord(data.codeWord);
        
        // Make sure we update the agent name from Firestore if it exists
        if (data.agentName) {
          setAgentName(data.agentName);
          localStorage.setItem(`agent_name_${roomId}_${agentSlug}`, data.agentName);
        }
        
        setLoading(false);
        return;
      }

      const settingsRef = doc(db, "settings", roomId);
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        setError('Room not initialized. Contact administrator.');
        setLoading(false);
        return;
      }

      const settingsData = settingsSnap.data() as SettingsData;
      const currentGameMode = settingsData.gameMode || 'teams';
      setGameMode(currentGameMode);

      let assignedCodeWord = null;
      let isSpyRole = false;

      if (currentGameMode === 'spy') {
        const isUserSpy = agentSlug === settingsData.spyAgent || 
                         (settingsData.spyAgents !== undefined && settingsData.spyAgents.includes(agentSlug));
        if (isUserSpy) {
          assignedCodeWord = 'spy';
          isSpyRole = true;
        } else {
          assignedCodeWord = settingsData.commonCodeWord;
        }
      } else {
        if (!settingsData.redSpymaster) {
          assignedCodeWord = settingsData.oddCodeWord;
          await setDoc(settingsRef, { ...settingsData, redSpymaster: agentSlug }, { merge: true });
          setIsSpymaster({ isRed: true, isBlue: false });
        } else if (!settingsData.blueSpymaster) {
          assignedCodeWord = settingsData.evenCodeWord;
          await setDoc(settingsRef, { ...settingsData, blueSpymaster: agentSlug }, { merge: true });
          setIsSpymaster({ isRed: false, isBlue: true });
        } else {
          const agentIsEven = isSlugEven(agentSlug);
          assignedCodeWord = agentIsEven ? settingsData.evenCodeWord : settingsData.oddCodeWord;
        }
      }

      await setDoc(agentRef, {
        agentId: agentSlug,
        agentName,
        roomId,
        codeWord: assignedCodeWord ?? null,
        isSpy: isSpyRole
      });

      setAgentId(agentSlug);
      setCodeWord(assignedCodeWord ?? null);
      
      if (isSpyRole || assignedCodeWord === 'spy') {
        setIsSpy(true);
      }
    } catch (error) {
      console.error('Error getting access code:', error);
      setError('Unable to get access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShowScores = () => {
    fetchPlayerScores();
    setShowScores(true);
  };

  const leaveRoom = () => {
    router.push('/');
  };

  const isAnySpymaster = isSpymaster.isRed || isSpymaster.isBlue;
  const isRedSpymaster = isSpymaster.isRed;
  const isBlueSpymaster = isSpymaster.isBlue;

  const getBgClasses = () => {
    if (isSpy) return "bg-red-50";
    if (isRedSpymaster) return "bg-red-50";
    if (isBlueSpymaster) return "bg-blue-50";
    return "bg-zinc-100";
  };

  const getTextColorClass = () => {
    if (isSpy) return "text-red-600";
    if (isRedSpymaster) return "text-red-600";
    if (isBlueSpymaster) return "text-blue-600";
    return "text-zinc-900";
  };

  const getBorderColorClass = () => {
    if (isSpy) return "border-red-200";
    if (isRedSpymaster) return "border-red-200";
    if (isBlueSpymaster) return "border-blue-200";
    return "border-zinc-200";
  };

  const getRoleDisplay = () => {
    if (gameMode === 'spy') {
      return isSpy ? 'SPY' : 'AGENT';
    } else {
      if (isRedSpymaster) return 'RED SPYMASTER';
      if (isBlueSpymaster) return 'BLUE SPYMASTER';
      return 'AGENT';
    }
  };

  // Handle the case where the agent has been removed
  if (hasBeenRemoved) {
    return (
      <RemovedAlert onClose={() => {
        router.push('/');
      }} />
    );
  }

  if (!loading && !error && !gameStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-500 opacity-100">
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="font-mono text-lg">Waiting For Game Start</div>
              <button 
                onClick={leaveRoom}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                EXIT
              </button>
            </div>
          </div>
          
          <div className="p-8 flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Room ID: {roomId}</h2>
              <p className="text-gray-600 mb-4">Waiting for the game host to start the game...</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <QRCodeSVG 
                value={`https://redblue-ten.vercel.app/${roomId}`}
                size={240}
                level="M"
                className="mx-auto"
              />
            </div>
            
            <div className="text-center text-sm text-gray-500">
              <p>Share this QR code with others to join this room</p>
              <p className="font-mono mt-2">Web users: redblue-ten.vercel.app</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>ROOM::{roomId}</span>
              <span>AGENT::{agentName || agentId || '--'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${getBgClasses()} flex items-center justify-center p-6 relative overflow-hidden`}>
      {/* Show the removed alert if the player has been removed */}
      {hasBeenRemoved && (
        <RemovedAlert onClose={() => {
          router.push('/');
        }} />
      )}
      
      {(isAnySpymaster || isSpy) && (
        <div className="absolute inset-0">
          <div
            className={`absolute inset-0 ${
              isSpy ? 'bg-red-100/30'
            : isRedSpymaster ? 'bg-red-100/30'
            : 'bg-blue-100/30'
            }`}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  ${isSpy || isRedSpymaster ? '#ef4444' : '#3b82f6'} 0px,
                  ${isSpy || isRedSpymaster ? '#ef4444' : '#3b82f6'} 1px,
                  transparent 1px,
                  transparent 60px
                )`
              }}
            />
          </div>
        </div>
      )}

      <div className={`w-full max-w-2xl transform transition-all duration-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-white border border-gray-200 relative shadow-lg rounded-lg overflow-hidden">
          <div className={`border-b ${getBorderColorClass()} p-4 ${getBgClasses()}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isSpy ? (
                  <Eye className={`w-5 h-5 ${getTextColorClass()}`} />
                ) : (
                  <Shield className={`w-5 h-5 ${getTextColorClass()}`} />
                )}
                <span className={`font-mono text-sm ${getTextColorClass()}`}>
                  {getRoleDisplay()}
                </span>
              </div>
              <div className={`font-mono text-sm ${getTextColorClass()}`}>
                {agentName || agentId || '--'}
              </div>
            </div>
          </div>

          <div className="p-8 relative">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                <div className="text-zinc-600 font-mono">ACCESSING SYSTEM...</div>
              </div>
            ) : agentId && codeWord ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div className="font-mono text-sm text-zinc-500">ROOM: {roomId}</div>
                  <div className="flex space-x-4">
                    <button 
                      onClick={handleShowScores}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>VIEW SCORES</span>
                    </button>
                    <button 
                      onClick={leaveRoom}
                      className="text-sm text-zinc-500 hover:text-zinc-900"
                    >
                      LEAVE ROOM
                    </button>
                  </div>
                </div>
                
                {(isAnySpymaster || isSpy) && (
                  <div
                    className={`p-3 ${getBgClasses()} ${getTextColorClass()} ${getBorderColorClass()} border rounded-md flex items-center gap-2`}
                  >
                    {isSpy ? <Eye className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                    <span className="font-mono text-sm">{getRoleDisplay()}</span>
                  </div>
                )}
                
                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>AGENT_NAME</div>
                  <div
                    className={`text-6xl font-mono ${getTextColorClass()} border ${getBorderColorClass()} p-6 relative group ${getBgClasses()} rounded-lg`}
                  >
                    <div
                      className={`absolute inset-0 ${
                        isSpy ? 'bg-red-100'
                      : isRedSpymaster ? 'bg-red-100'
                      : isBlueSpymaster ? 'bg-blue-100'
                      : 'bg-gray-100'
                      } opacity-0 group-hover:opacity-10 transition-opacity rounded-lg`}
                    />
                    <span className="relative">{agentName || agentId}</span>
                  </div>
                </div>

                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>
                    {isSpy ? 'SPY STATUS' : 'CODE SIGN'}
                  </div>
                  <div className="flex justify-center">
                    <div
                      className={`${getBgClasses()} border ${getBorderColorClass()} p-8 relative group rounded-lg aspect-square w-96 h-96 flex items-center justify-center`}
                    >
                      <div
                        className={`absolute inset-0 ${
                          isSpy ? 'bg-red-100'
                        : isRedSpymaster ? 'bg-red-100'
                        : isBlueSpymaster ? 'bg-blue-100'
                        : 'bg-gray-100'
                        } opacity-0 group-hover:opacity-10 transition-opacity rounded-lg`}
                      />
                      {isSpy || codeWord === 'spy' ? (
                        <div className="text-6xl font-mono text-red-600">SPY</div>
                      ) : (
                        <IconForWord
                          word={codeWord}
                          size={300}
                          className={getTextColorClass()}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <div className="text-zinc-600 font-mono text-center">
                  SYSTEM ACCESS ERROR
                  <br />
                  <span className="text-sm mt-2 block">Please refresh or return to the home page</span>
                </div>
              </div>
            )}

            {(isSpy || codeWord === 'spy') && (
              <div className="mt-8 sm:mt-12 space-y-4">
                <div className={`font-mono text-base sm:text-lg ${getTextColorClass()}`}>ALL POSSIBLE CODE SIGNS</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
                  {allCodeWords.map((word) => (
                    <div
                      key={word}
                      className={`${getBgClasses()} border ${getBorderColorClass()} p-2 sm:p-3 md:p-4 rounded-lg aspect-square flex items-center justify-center relative group min-h-[80px] sm:min-h-[100px] md:min-h-[120px]`}
                    >
                      <div
                        className={`absolute inset-0 bg-red-100 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg`}
                      />
                      <div className="w-full h-full flex items-center justify-center">
                        <IconForWord
                          word={word}
                          size={iconSize}
                          className={getTextColorClass()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`border-t ${getBorderColorClass()} p-4 ${getBgClasses()}`}>
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>ROOM::{roomId}</span>
              <span>{getRoleDisplay()}{agentName ? `::${agentName}` : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player Scores Modal */}
      {showScores && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-mono font-bold">PLAYER SCORES</h3>
        <button 
          onClick={() => setShowScores(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {loadingScores ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : playerScores.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No player scores available
          </div>
        ) : (
          <div className="space-y-3">
            {playerScores.map((player) => (
              <div 
                key={player.agentId + (player.isSwiftPlayer ? '-swift' : '')}
                className={`flex justify-between items-center p-3 rounded-md border ${
                  player.isSwiftPlayer 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="font-medium">
                  {player.agentName}
                  {player.isSwiftPlayer && (
                    <span className="ml-2 text-xs text-blue-600 font-mono">(iOS)</span>
                  )}
                  {(isSpymaster.isRed && player.agentId === agentSlug) && (
                    <span className="ml-2 text-xs text-red-600 font-mono">RED SPYMASTER</span>
                  )}
                  {(isSpymaster.isBlue && player.agentId === agentSlug) && (
                    <span className="ml-2 text-xs text-blue-600 font-mono">BLUE SPYMASTER</span>
                  )}
                  {(isSpy && player.agentId === agentSlug) && (
                    <span className="ml-2 text-xs text-red-600 font-mono">SPY</span>
                  )}
                </div>
                
                <div className={`px-3 py-1 rounded-full font-mono text-center ${
                  player.isSwiftPlayer ? 'bg-blue-100' : 'bg-gray-200'
                }`}>
                  {player.score}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
        <button
          onClick={() => setShowScores(false)}
          className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}