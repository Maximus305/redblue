"use client"
import React, { useState, useEffect, use, useMemo } from "react";
import { Loader2, Crown, AlertCircle, Eye, X } from 'lucide-react';
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
  // const [iconSize, setIconSize] = useState(80);
  const [commonCodeWord, setCommonCodeWord] = useState<string | undefined>(undefined);
  const [isUpdatingSpyStatus, setIsUpdatingSpyStatus] = useState(false);

  const allCodeWords = [
    'Atlas', 'Balloon', 'Bamboo', 'Basket', 'Barrel',
    'Bell', 'Bike', 'Boat', 'Bow', 'Briefcase',
    'Bullet', 'Camera', 'Car', 'Castle', 'Chair',
    'Clock', 'Crate', 'Crown', 'Diamond', 'Dice',
    'Door', 'Envelope', 'Gun', 'Hack', 'Hammer',
    'Key', 'Lantern', 'Lock', 'Marker', 'Max',
    'Outlet', 'Paintbrush', 'Racecar', 'Ring', 'Rocket',
    'Rope', 'Rubiks', 'Tent', 'Tire', 'Wrench'
  ];

  // Generate 6 random words including the common code word for spy view
  const spyCodeWords = useMemo(() => {
    if (!commonCodeWord || commonCodeWord === 'spy') {
      // Fallback: return 6 random words if no common code word
      const shuffled = [...allCodeWords].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6);
    }

    // Get 5 random words excluding the common code word
    const otherWords = allCodeWords.filter(w => w !== commonCodeWord);
    const shuffled = otherWords.sort(() => Math.random() - 0.5);
    const randomFive = shuffled.slice(0, 5);

    // Combine with common code word and shuffle again
    const result = [...randomFive, commonCodeWord].sort(() => Math.random() - 0.5);
    return result;
  }, [commonCodeWord]);

  // Add this useEffect to handle responsive icon sizing:
  // useEffect(() => {
  //   const updateIconSize = () => {
  //     const width = window.innerWidth;
  //     if (width < 640) setIconSize(36);
  //     else if (width < 768) setIconSize(56);
  //     else if (width < 1024) setIconSize(72);
  //     else setIconSize(80);
  //   };

  //   updateIconSize();
  //   window.addEventListener('resize', updateIconSize);
  //   return () => window.removeEventListener('resize', updateIconSize);
  // }, []);

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
      const unsubscribeSettings = onSnapshot(settingsRef, async (snapshot) => {
        if (snapshot.exists()) {
          const settings = snapshot.data() as SettingsData;
          const currentGameMode = settings.gameMode || 'teams';
          setGameMode(currentGameMode);

          setGameStarted(settings.gameStarted === true);
          setCommonCodeWord(settings.commonCodeWord);

          if (currentGameMode === 'spy') {
            const userIsSpy = agentSlug === settings.spyAgent ||
                             (settings.spyAgents !== undefined && settings.spyAgents.includes(agentSlug));
            console.log('🔍 SPY DETECTION:', {
              agentSlug,
              spyAgent: settings.spyAgent,
              spyAgents: settings.spyAgents,
              userIsSpy,
              currentGameMode
            });

            // Block agent listener from overwriting during update
            setIsUpdatingSpyStatus(true);
            setIsSpy(userIsSpy);
            setIsSpymaster({ isRed: false, isBlue: false });

            // Set spy status immediately, then update Firebase
            if (userIsSpy) {
              setCodeWord('spy');
            }
            await updateAgentForSpyMode(settings);
            // Don't clear the flag immediately - let the agent listener clear it when it receives correct data
            console.log('✅ updateAgentForSpyMode completed, waiting for agent listener to confirm');
            // But add a fallback timeout in case Firebase doesn't send an update
            setTimeout(() => {
              console.log('⏰ Fallback timeout: clearing update flag');
              setIsUpdatingSpyStatus(false);
            }, 3000);
          } else {
            setIsSpy(false);
            setIsSpymaster({
              isRed: agentSlug === settings.redSpymaster,
              isBlue: agentSlug === settings.blueSpymaster
            });
            await updateAgentForTeamMode(settings);
          }
        }
      });

      // Set up agent listener
      // This listener syncs state with Firebase, but settings listener takes priority for spy detection
      const unsubscribeAgent = onSnapshot(agentRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log('👤 AGENT DATA UPDATE:', {
            agentId: data.agentId,
            codeWord: data.codeWord,
            isSpy: data.isSpy,
            timestamp: Date.now()
          });

          // Always update agentId and agentName
          setAgentId(data.agentId ?? null);

          // Update local storage with the latest agent name
          if (data.agentName) {
            setAgentName(data.agentName);
            localStorage.setItem(`agent_name_${roomId}_${agentSlug}`, data.agentName);
          }

          // Update spy status and codeword from Firebase
          // But skip if settings listener is currently updating (prevents race condition)

          // Check consistency: isSpy and codeWord should match
          const dataIsConsistent = (Boolean(data.isSpy) && data.codeWord === 'spy') ||
                                   (!Boolean(data.isSpy) && data.codeWord !== 'spy');

          setCodeWord(currentCodeWord => {
            const newCodeWord = data.codeWord;
            console.log('📝 codeWord update - current:', currentCodeWord, 'new from Firebase:', newCodeWord, 'isUpdating:', isUpdatingSpyStatus, 'dataConsistent:', dataIsConsistent);
            // Don't overwrite if we're in the middle of a spy status update from settings
            if (isUpdatingSpyStatus) {
              // Check if Firebase now has the CORRECT data
              if (currentCodeWord === newCodeWord && dataIsConsistent) {
                console.log('✅ Firebase data matches expected state, clearing update flag');
                setIsUpdatingSpyStatus(false);
              } else {
                console.log('⏸️  Skipping codeWord update - status update in progress');
                return currentCodeWord;
              }
            }
            // Only accept the update if Firebase data is internally consistent
            if (!dataIsConsistent) {
              console.log('⚠️  Skipping codeWord update - Firebase data is inconsistent');
              return currentCodeWord;
            }
            return newCodeWord;
          });

          setIsSpy(currentIsSpy => {
            const newIsSpy = Boolean(data.isSpy);
            console.log('🎯 isSpy update - current:', currentIsSpy, 'new from Firebase:', newIsSpy, 'isUpdating:', isUpdatingSpyStatus, 'dataConsistent:', dataIsConsistent);
            // Check handled in setCodeWord above
            if (isUpdatingSpyStatus) {
              console.log('⏸️  Skipping isSpy update - status update in progress');
              return currentIsSpy;
            }
            // Only accept the update if Firebase data is internally consistent
            if (!dataIsConsistent) {
              console.log('⚠️  Skipping isSpy update - Firebase data is inconsistent');
              return currentIsSpy;
            }
            return newIsSpy;
          });

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
    const agentKey = `${roomId}_${agentSlug}`;
    const agentRef = doc(db, "agents", agentKey);

    const userIsSpy = agentSlug === settings.spyAgent ||
                     (settings.spyAgents !== undefined && settings.spyAgents.includes(agentSlug));

    const dataToWrite: Record<string, unknown> = {
      agentId: agentSlug,
      roomId,
      codeWord: userIsSpy ? 'spy' : settings.commonCodeWord,
      isSpy: userIsSpy
    };

    // Include agentName if it's available
    if (agentName) {
      dataToWrite.agentName = agentName;
    }

    console.log('🔄 Writing to Firebase:', dataToWrite);

    try {
      await setDoc(agentRef, dataToWrite, { merge: true });
      console.log('✍️ Firebase write completed successfully');

      setIsSpy(userIsSpy);
      if (userIsSpy) {
        setCodeWord('spy');
      }
    } catch (error) {
      console.error('❌ Error updating agent for spy mode:', error);
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

  // const leaveRoom = () => {
  //   router.push('/');
  // };

  const isAnySpymaster = isSpymaster.isRed || isSpymaster.isBlue;
  const isRedSpymaster = isSpymaster.isRed;
  const isBlueSpymaster = isSpymaster.isBlue;

  // const getBgClasses = () => {
  //   if (isSpy) return "bg-zinc-100";
  //   if (isRedSpymaster) return "bg-red-50";
  //   if (isBlueSpymaster) return "bg-blue-50";
  //   return "bg-zinc-100";
  // };

  // const getTextColorClass = () => {
  //   if (isSpy) return "text-zinc-900";
  //   if (isRedSpymaster) return "text-red-600";
  //   if (isBlueSpymaster) return "text-blue-600";
  //   return "text-zinc-900";
  // };

  // const getBorderColorClass = () => {
  //   if (isSpy) return "border-zinc-200";
  //   if (isRedSpymaster) return "border-red-200";
  //   if (isBlueSpymaster) return "border-blue-200";
  //   return "border-zinc-200";
  // };

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
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="w-full max-w-md">
          {/* Message */}
          <p
            className="text-center mb-6"
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: 1.5,
            }}
          >
            Waiting for Host to start.
          </p>

          {/* Room Code */}
          <p
            className="text-center mb-8"
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            ROOM: {roomId}
          </p>

          {/* QR Code */}
          <div
            className="mb-6 p-4 mx-auto"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '280px',
            }}
          >
            <QRCodeSVG
              value={`https://redblue-ten.vercel.app/${roomId}`}
              size={240}
              level="M"
              className="mx-auto"
            />
          </div>

          {/* Info Text */}
          <p
            className="text-center mb-8"
            style={{
              fontSize: '16px',
              fontWeight: 400,
              color: '#666666',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Share this QR code with others to join
          </p>

          {/* Agent Info */}
          <div
            className="p-4"
            style={{
              backgroundColor: '#FDD804',
              borderRadius: '20px',
            }}
          >
            <p
              className="text-center"
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {agentName || agentId || 'Agent'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎯 COMPONENT RENDER STATE:', {
    isSpy,
    codeWord,
    agentId,
    gameStarted,
    gameMode,
    isUpdatingSpyStatus,
    loading,
    error
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      {/* Show the removed alert if the player has been removed */}
      {hasBeenRemoved && (
        <RemovedAlert onClose={() => {
          router.push('/');
        }} />
      )}

      <div className={`w-full max-w-md transform transition-all duration-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {error && (
          <div
            className="mb-6 p-4"
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: '16px',
            }}
          >
            <p
              className="text-center"
              style={{
                fontWeight: 500,
                fontSize: '18px',
                color: '#DC2626',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {error}
            </p>
          </div>
        )}

        {agentId && codeWord ? (
          <>
            {/* Room Info & Actions */}
            <div className="mb-6 flex justify-between items-center">
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#666666',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                ROOM: {roomId}
              </p>
              <button
                onClick={handleShowScores}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FDD804',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                SCORES
              </button>
            </div>

            {/* Role Badge */}
            {(isAnySpymaster || isSpy) && (
              <div
                className="mb-6 p-4 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isSpy ? '#E5E7EB' : isRedSpymaster ? '#FEE2E2' : '#DBEAFE',
                  borderRadius: '16px',
                }}
              >
                {isSpy ? (
                  <Eye style={{ width: '24px', height: '24px', color: '#000000' }} />
                ) : (
                  <Crown
                    style={{
                      width: '24px',
                      height: '24px',
                      color: isRedSpymaster ? '#DC2626' : '#2563EB',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: isSpy ? '#000000' : isRedSpymaster ? '#DC2626' : '#2563EB',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {getRoleDisplay()}
                </span>
              </div>
            )}

            {/* Agent Name */}
            <div className="mb-6">
              <p
                className="mb-2"
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#666666',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                Your Name
              </p>
              <div
                className="p-6"
                style={{
                  backgroundColor: '#FDD804',
                  borderRadius: '20px',
                }}
              >
                <p
                  className="text-center"
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {agentName || agentId}
                </p>
              </div>
            </div>

            {/* Code Sign / Spy Status */}
            <div>
              <p
                className="mb-4 text-center"
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#666666',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {isSpy ? 'Your Status' : 'Your Code Sign'}
              </p>

              {(() => {
                console.log('🎨 RENDERING:', { isSpy, codeWord, shouldShowSpy: isSpy || codeWord === 'spy' });
                return null;
              })()}

              {isSpy || codeWord === 'spy' ? (
                <div
                  className="p-8"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '3px solid #E5E7EB',
                    borderRadius: '20px',
                  }}
                >
                  <p
                    className="text-center"
                    style={{
                      fontSize: '64px',
                      fontWeight: 900,
                      color: '#000000',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    SPY
                  </p>
                </div>
              ) : (
                <div
                  className="p-8 flex items-center justify-center"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '3px solid #E5E7EB',
                    borderRadius: '20px',
                    minHeight: '280px',
                  }}
                >
                  <IconForWord word={codeWord} size={240} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertCircle
              className="mx-auto mb-4"
              style={{ width: '48px', height: '48px', color: '#DC2626' }}
            />
            <p
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Error loading
            </p>
            <p
              className="mt-2"
              style={{
                fontSize: '16px',
                fontWeight: 400,
                color: '#666666',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Please refresh the page
            </p>
          </div>
        )}

        {/* Spy Code Words Grid */}
        {(isSpy || codeWord === 'spy') && agentId && (
          <div className="mt-8">
            <p
              className="mb-4 text-center"
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#666666',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Possible Code Signs
            </p>
            <div className="grid grid-cols-3 gap-3">
              {spyCodeWords.map((word) => (
                <div
                  key={word}
                  className="p-2 flex items-center justify-center"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '3px solid #E5E7EB',
                    borderRadius: '16px',
                    aspectRatio: '1/1',
                  }}
                >
                  <IconForWord word={word} size={200} />
                </div>
              ))}
            </div>
          </div>
        )}
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