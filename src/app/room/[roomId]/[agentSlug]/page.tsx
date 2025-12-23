"use client"
import React, { useState, useEffect, use, useMemo, useRef } from "react";
import { Loader2, Crown, AlertCircle, X } from 'lucide-react';
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  getDocs,
  where
} from "firebase/firestore";
import { IconForWord } from '@/utils/codeWords';
import { useRouter } from "next/navigation";
import { QRCodeSVG } from 'qrcode.react';
import { DecryptedText } from '@/components/ui/DecryptedText';

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
  votingStarted?: boolean;
  revealSpy?: boolean;
  newRoundStarted?: boolean;
  hostVotedFor?: string;
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
  const [, setPlayerCount] = useState(0);
  const [, setShowRoleReveal] = useState(false);
  const [, setRevealRole] = useState<'agent' | 'spy' | null>(null);
  const [allAgents, setAllAgents] = useState<Array<{id: string, name: string}>>([]);
  const hasShownReveal = useRef(false);
  const isInitializing = useRef(true);
  const [votingStarted, setVotingStarted] = useState(false);
  const [showDiscussionScreen, setShowDiscussionScreen] = useState(false);
  const [showRevealScreen, setShowRevealScreen] = useState(false);
  const [showRevealWaiting, setShowRevealWaiting] = useState(false);
  const [hostVotedCorrectly, setHostVotedCorrectly] = useState(false);
  const [titleAnimationComplete, setTitleAnimationComplete] = useState(false);
  const [isLateJoiner, setIsLateJoiner] = useState(false);

  const allCodeWords = [
    'Atlas', 'Balloon', 'Bamboo', 'Basket', 'Barrel',
    'Bell', 'Bike', 'Boat', 'Bow', 'Briefcase',
    'Bullet', 'Camera', 'Car', 'Castle', 'Chair',
    'Clock', 'Crate', 'Crown', 'Diamond', 'Dice',
    'Door', 'Envelope', 'Gun', 'Hack', 'Hammer',
    'Key', 'Lantern', 'Lock', 'Marker',
    'Outlet', 'Paintbrush', 'Racecar', 'Ring', 'Rocket',
    'Rope', 'Rubiks', 'Tent', 'Tire', 'Wrench'
  ];

  // Generate 20 random words including the common code word for spy view
  // Use roomId as seed to keep consistent across reloads
  const spyCodeWords = useMemo(() => {
    if (!commonCodeWord || commonCodeWord === 'spy') {
      // Fallback: return 18 random words if no common code word
      // Use roomId to seed the selection
      const seed = roomId ? roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
      const shuffled = [...allCodeWords].sort((a, b) => {
        const hashA = (a.charCodeAt(0) + seed) % allCodeWords.length;
        const hashB = (b.charCodeAt(0) + seed) % allCodeWords.length;
        return hashA - hashB;
      });
      return shuffled.slice(0, 18);
    }

    // Get 17 random words excluding the common code word
    const otherWords = allCodeWords.filter(w => w !== commonCodeWord);
    const seed = roomId ? roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const shuffled = otherWords.sort((a, b) => {
      const hashA = (a.charCodeAt(0) + seed) % otherWords.length;
      const hashB = (b.charCodeAt(0) + seed) % otherWords.length;
      return hashA - hashB;
    });
    const randomSeventeen = shuffled.slice(0, 17);

    // Combine with common code word and shuffle again
    const result = [...randomSeventeen, commonCodeWord].sort((a, b) => {
      const hashA = (a.charCodeAt(0) + seed) % 18;
      const hashB = (b.charCodeAt(0) + seed) % 18;
      return hashA - hashB;
    });
    return result;
  }, [commonCodeWord, roomId]);

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      } else {
        // Agent doesn't exist yet - check if game is already in progress
        const settingsSnap = await getDoc(doc(db, "settings", roomId));
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data();
          if (settings.gameStarted === true) {
            // Late joiner - game is in progress but they don't have data yet
            console.log('🕐 Late joiner detected - game already in progress');
            setIsLateJoiner(true);
          }
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

      // Track if this is the first settings update (on page load/refresh)
      let isFirstSettingsUpdate = true;

      // Set up settings listener
      const settingsRef = doc(db, "settings", roomId);
      const unsubscribeSettings = onSnapshot(settingsRef, async (snapshot) => {
        if (snapshot.exists()) {
          const settings = snapshot.data() as SettingsData;
          const currentGameMode = settings.gameMode || 'teams';
          setGameMode(currentGameMode);

          setGameStarted(settings.gameStarted === true);
          setVotingStarted(settings.votingStarted === true);
          setCommonCodeWord(settings.commonCodeWord);

          // On first load (page refresh), trust the agent's Firebase data instead of re-computing
          // This prevents showing stale spy status from a previous round
          if (isFirstSettingsUpdate && settings.gameStarted) {
            isFirstSettingsUpdate = false;
            console.log('🔄 First settings update - trusting agent Firebase data');

            // Just read the agent's current spy status from Firebase
            const currentAgentSnap = await getDoc(agentRef);
            if (currentAgentSnap.exists()) {
              const currentAgentData = currentAgentSnap.data();
              console.log('👤 Using agent Firebase data:', {
                isSpy: currentAgentData.isSpy,
                codeWord: currentAgentData.codeWord
              });

              // Check if agent has valid game data for current round
              // If codeWord is null/undefined, they're a late joiner
              if (!currentAgentData.codeWord && currentGameMode === 'spy') {
                console.log('🕐 Agent exists but no codeWord - late joiner');
                setIsLateJoiner(true);
                return;
              }

              setIsSpy(Boolean(currentAgentData.isSpy));
              setCodeWord(currentAgentData.codeWord);
              if (currentGameMode === 'spy') {
                setIsSpymaster({ isRed: false, isBlue: false });
              } else {
                setIsSpymaster({
                  isRed: agentSlug === settings.redSpymaster,
                  isBlue: agentSlug === settings.blueSpymaster
                });
              }
            } else {
              // Agent doesn't exist and game is started - late joiner
              console.log('🕐 Agent does not exist and game started - late joiner');
              setIsLateJoiner(true);
            }
            return; // Skip the rest, we've synced from Firebase
          }

          isFirstSettingsUpdate = false;

          if (currentGameMode === 'spy') {
            // Check if user is spy - handle both formats: "dave" or "WHJT-BZRY_dave"
            const spyAgentSlug = settings.spyAgent?.includes('_')
              ? settings.spyAgent.split('_')[1]
              : settings.spyAgent;
            const userIsSpy = agentSlug === spyAgentSlug ||
                             agentSlug === settings.spyAgent ||
                             (settings.spyAgents !== undefined && settings.spyAgents.includes(agentSlug));
            console.log('🔍 SPY DETECTION:', {
              agentSlug,
              spyAgent: settings.spyAgent,
              spyAgentSlug,
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
            // If late joiner now has a valid codeWord, they can play!
            if (newCodeWord && newCodeWord !== currentCodeWord) {
              console.log('🎮 Late joiner now has codeWord - transitioning to game');
              setIsLateJoiner(false);
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

      // Mark initialization as complete after a short delay
      setTimeout(() => {
        isInitializing.current = false;
      }, 1000);

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
    // Skip if we're still initializing to prevent duplicate writes
    if (isInitializing.current) return;

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

  // Listen to player count changes and get all agents
  useEffect(() => {
    const agentsQuery = query(collection(db, "agents"), where("roomId", "==", roomId));
    const unsubscribe = onSnapshot(agentsQuery, (snapshot) => {
      setPlayerCount(snapshot.docs.length);

      // Track unique players by their base name to avoid duplicates
      const seenNames = new Map<string, {id: string, name: string, timestamp: number}>();

      snapshot.docs.forEach(doc => {
        const rawId = doc.id;
        const data = doc.data();

        // Remove room code prefix (e.g., "CPQS-E9H4_james" -> "james")
        const cleanId = rawId.includes('_') ? rawId.split('_')[1] : rawId;
        const name = data.agentName || cleanId;

        // Extract base name (before the timestamp suffix if it exists)
        // e.g., "james-1234567890" -> "james"
        const baseName = cleanId.split('-')[0];

        // Get timestamp from the cleanId or use 0
        const timestampMatch = cleanId.match(/-(\d+)$/);
        const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : 0;

        // Only keep the most recent entry for each base name
        const existing = seenNames.get(baseName);
        if (!existing || timestamp > existing.timestamp) {
          seenNames.set(baseName, {
            id: rawId,
            name: name,
            timestamp: timestamp
          });
        }
      });

      // Convert map to array
      const agents = Array.from(seenNames.values()).map(({id, name}) => ({
        id,
        name
      }));

      setAllAgents(agents);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Show role reveal when game starts
  useEffect(() => {
    if (gameStarted && (isSpy !== undefined) && codeWord && !hasShownReveal.current) {
      hasShownReveal.current = true;
      setRevealRole(isSpy ? 'spy' : 'agent');
      setShowRoleReveal(true);

      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setShowRoleReveal(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [gameStarted, isSpy, codeWord]);

  // Navigate to discussion screen when votingStarted becomes true
  useEffect(() => {
    if (votingStarted && gameStarted) {
      setShowDiscussionScreen(true);
    }
  }, [votingStarted, gameStarted]);

  // Listen for revealSpy flag and determine if host voted correctly
  // Use a ref to track if we've already processed the reveal to avoid duplicate triggers
  const hasProcessedReveal = useRef(false);
  const hasProcessedNewRound = useRef(false);

  // Track if we've done the initial state sync
  const hasInitializedGameState = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    const settingsRef = doc(db, "settings", roomId);
    const unsubscribe = onSnapshot(settingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // On initial load (page refresh), sync to the current game state
        // This ensures we show the correct screen after a reload
        if (!hasInitializedGameState.current) {
          hasInitializedGameState.current = true;
          console.log('🔄 Initial game state sync:', {
            revealSpy: data.revealSpy,
            votingStarted: data.votingStarted,
            gameStarted: data.gameStarted
          });

          // Fetch current agent data to get correct spy status
          const agentKey = `${roomId}_${agentSlug}`;
          const agentRef = doc(db, "agents", agentKey);
          const agentSnap = await getDoc(agentRef);

          if (agentSnap.exists()) {
            const agentData = agentSnap.data();
            console.log('🔄 Initial agent data:', {
              isSpy: agentData.isSpy,
              codeWord: agentData.codeWord
            });
            setIsSpy(Boolean(agentData.isSpy));
            setCodeWord(agentData.codeWord);
          }

          // Set the correct screen based on current game state
          if (data.revealSpy === true) {
            // We're in reveal mode - show reveal screen
            hasProcessedReveal.current = true;

            // Get spy information to check if host voted correctly
            const agentsQuery = query(
              collection(db, "agents"),
              where("roomId", "==", roomId)
            );
            const agentsSnap = await getDocs(agentsQuery);
            const spyAgent = agentsSnap.docs.find(doc => doc.data().isSpy);
            const spyId = spyAgent?.id;
            const votedCorrectly = data.hostVotedFor === spyId;
            setHostVotedCorrectly(votedCorrectly);

            setShowRevealScreen(true);
            setShowDiscussionScreen(false);
            setShowRevealWaiting(false);
          } else if (data.votingStarted === true && data.gameStarted === true) {
            // We're in discussion mode
            setShowDiscussionScreen(true);
            setShowRevealScreen(false);
            setShowRevealWaiting(false);
          }
          return; // Skip the rest of the handler for initial sync
        }

        // Check for reveal spy trigger - use ref to prevent duplicate processing
        if (data.revealSpy === true && !hasProcessedReveal.current) {
          hasProcessedReveal.current = true;
          console.log('🎭 Reveal spy triggered!');

          // Get spy information and check if host voted correctly
          const agentsQuery = query(
            collection(db, "agents"),
            where("roomId", "==", roomId)
          );

          const agentsSnap = await getDocs(agentsQuery);
          const spyAgent = agentsSnap.docs.find(doc => doc.data().isSpy);
          const spyId = spyAgent?.id;

          // Get host's vote from settings
          const hostVotedForId = data.hostVotedFor;

          // Check if host voted correctly (compare IDs)
          const votedCorrectly = hostVotedForId === spyId;
          setHostVotedCorrectly(votedCorrectly);

          // Show reveal screen immediately
          setShowRevealWaiting(false);
          setShowDiscussionScreen(false);
          setShowRevealScreen(true);
        } else if (data.revealSpy === false) {
          // Reset the flag when revealSpy is set back to false
          hasProcessedReveal.current = false;
          // Also hide the reveal screen if it was showing
          setShowRevealScreen(false);
        }

        // Check for new round
        if (data.newRoundStarted === true && !hasProcessedNewRound.current) {
          hasProcessedNewRound.current = true;
          console.log('🔄 New round started - resetting all state');
          setShowRevealScreen(false);
          setShowRevealWaiting(false);
          setShowDiscussionScreen(false);
          setVotingStarted(false);
          setHostVotedCorrectly(false);
          setTitleAnimationComplete(false);
          setIsLateJoiner(false); // Late joiners can now play

          // Force refresh of spy status and code word from Firebase
          // This ensures we don't show stale spy UI
          const agentKey = `${roomId}_${agentSlug}`;
          const agentRef = doc(db, "agents", agentKey);
          const agentSnap = await getDoc(agentRef);

          if (agentSnap.exists()) {
            const agentData = agentSnap.data();
            setIsSpy(Boolean(agentData.isSpy));
            setCodeWord(agentData.codeWord);
            console.log('🔄 Refreshed agent data:', {
              isSpy: agentData.isSpy,
              codeWord: agentData.codeWord
            });
          }
        } else if (data.newRoundStarted === false) {
          // Reset the flag when newRoundStarted is set back to false
          hasProcessedNewRound.current = false;
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, agentSlug]);


  const updateAgentForSpyMode = async (settings: SettingsData) => {
    const agentKey = `${roomId}_${agentSlug}`;
    const agentRef = doc(db, "agents", agentKey);

    // Handle both formats: "dave" or "WHJT-BZRY_dave"
    const spyAgentSlug = settings.spyAgent?.includes('_')
      ? settings.spyAgent.split('_')[1]
      : settings.spyAgent;
    const userIsSpy = agentSlug === spyAgentSlug ||
                     agentSlug === settings.spyAgent ||
                     (settings.spyAgents !== undefined && settings.spyAgents.includes(agentSlug));

    const dataToWrite: Record<string, unknown> = {
      agentId: agentSlug,
      roomId,
      codeWord: userIsSpy ? 'spy' : (settings.commonCodeWord || null),
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

      // Clear the update flag immediately after successful write
      // This allows the agent listener to process the Firebase update
      setIsUpdatingSpyStatus(false);
    } catch (error) {
      console.error('❌ Error updating agent for spy mode:', error);
      setIsUpdatingSpyStatus(false);
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
        isSpy: isSpyRole,
        score: 0,
        roundsAgoWasSpy: 5,
        platform: 'web'
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
        router.push('/rooms');
      }} />
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#000000' }} />
      </div>
    );
  }

  // Late joiner screen - game in progress, wait for next round
  if (isLateJoiner && gameStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="w-full max-w-md text-center">
          {/* Title */}
          <h1
            className="mb-6"
            style={{
              fontSize: '42px',
              fontWeight: 900,
              color: '#000000',
              fontFamily: 'monospace',
              lineHeight: 1.1,
            }}
          >
            WHO&apos;S THE SPY
          </h1>

          {/* Game in Progress Message */}
          <div
            className="p-6 mb-6"
            style={{
              backgroundColor: '#000000',
              borderRadius: '24px',
            }}
          >
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: 'monospace',
                marginBottom: '16px',
              }}
            >
              <DecryptedText text="Game in Progress" speed={40} />
            </h2>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#999999',
                fontFamily: 'monospace',
              }}
            >
              <DecryptedText text="Please wait for the next round to start" speed={30} />
            </p>
          </div>

          {/* Animated waiting indicator */}
          <div
            className="flex justify-center gap-2"
            style={{ animation: 'pulse 2s infinite' }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                animation: 'pulse 1.5s infinite 0s',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                animation: 'pulse 1.5s infinite 0.3s',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                animation: 'pulse 1.5s infinite 0.6s',
              }}
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!error && !gameStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="w-full max-w-md">
          {/* Title */}
          <h1
            className="text-center mb-8"
            style={{
              fontSize: '42px',
              fontWeight: 900,
              color: '#000000',
              fontFamily: 'monospace',
              lineHeight: 1.1,
            }}
          >
            WHO&apos;S THE SPY
          </h1>

          {/* QR Code */}
          <div
            className="mb-6 p-4 mx-auto"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '2px solid #E5E5E5',
              width: '65%',
              maxWidth: '280px',
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QRCodeSVG
              value={`https://redblue-ten.vercel.app/${roomId}`}
              size={150}
              level="M"
            />
          </div>

          {/* All Players */}
          {allAgents.map((agent) => {
            const isMe = agent.id === `${roomId}_${agentSlug}`;
            return (
              <div
                key={agent.id}
                className="p-2.5 mb-2.5 mx-auto"
                style={{
                  backgroundColor: isMe ? '#FFD93D' : '#FFFFFF',
                  border: isMe ? 'none' : '2px solid #E5E5E5',
                  borderRadius: '9999px',
                  width: '65%',
                  maxWidth: '280px',
                }}
              >
                <p
                  className="text-center"
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {agent.name}
                </p>
              </div>
            );
          })}
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }
          @keyframes breathe {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.02);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: (showRevealScreen && isSpy) ? '#000000' : '#F9FAFB',
      }}
    >
      {/* Show the removed alert if the player has been removed */}
      {hasBeenRemoved && (
        <RemovedAlert onClose={() => {
          router.push('/rooms');
        }} />
      )}

      {/* Reveal Waiting Screen - Listen to host */}
      {showRevealWaiting ? (
        <div className="w-full max-w-md flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <h1
              style={{
                fontSize: 'clamp(40px, 10vw, 64px)',
                fontWeight: 900,
                color: '#000000',
                fontFamily: 'monospace',
                letterSpacing: '2px',
              }}
            >
              <DecryptedText text={isSpy ? 'Reveal yourself.' : 'Listen to host.'} speed={40} />
            </h1>
          </div>
        </div>
      ) : showRevealScreen ? (
        <div
          className="w-full max-w-md flex flex-col items-center justify-center"
          style={{
            minHeight: '60vh',
          }}
        >
          {isSpy ? (
            // Spy sees "SPY" on yellow background
            <div className="text-center w-full flex flex-col justify-between items-center" style={{ minHeight: '100vh', paddingBottom: '80px', position: 'relative' }}>
              {/* Empty space at top */}
              <div></div>

              {/* SPY - centered and huge */}
              <h1
                style={{
                  fontSize: 'clamp(100px, 25vw, 180px)',
                  fontWeight: 900,
                  color: '#DC2626',
                  fontFamily: 'monospace',
                  letterSpacing: '8px',
                  lineHeight: 1,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <DecryptedText text="SPY" speed={80} />
              </h1>

              {/* REVEAL YOURSELF and points - at bottom */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2
                  className="mb-2"
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    fontFamily: 'monospace',
                    letterSpacing: '4px',
                    lineHeight: 1.1,
                  }}
                >
                  <DecryptedText text="Reveal yourself." speed={40} />
                </h2>

                {/* Points display - only show if spy got the point */}
                {!hostVotedCorrectly && (
                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      fontFamily: 'monospace',
                      letterSpacing: '2px',
                    }}
                  >
                    <DecryptedText text="+1 point for spy." speed={30} />
                  </h3>
                )}
              </div>
            </div>
          ) : (
            // Non-spy sees message
            <div className="text-center w-full px-4">
              <h1
                style={{
                  fontSize: 'clamp(32px, 8vw, 56px)',
                  fontWeight: 900,
                  color: '#000000',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                }}
              >
                <DecryptedText text="The spy will now reveal himself." speed={30} />
              </h1>
            </div>
          )}
        </div>
      ) : showDiscussionScreen ? (
        // Discussion Screen - Simple text based on spy status
        <div className="w-full max-w-md flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <h1
              style={{
                fontSize: 'clamp(32px, 8vw, 48px)',
                fontWeight: 900,
                color: '#000000',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                lineHeight: 1.2,
              }}
            >
              <DecryptedText
                text={isSpy
                  ? 'Convince others you are not the spy.'
                  : 'Discuss with the host on who the spy is.'}
                speed={30}
              />
            </h1>
          </div>
        </div>
      ) : (
      <div className={`w-full max-w-md transform transition-all duration-300 relative z-10 px-2 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {/* Instructions */}
        <h2
          className="text-center mb-10"
          style={{
            fontSize: 'clamp(28px, 7vw, 44px)',
            fontWeight: 900,
            color: '#000000',
            fontFamily: 'monospace',
            lineHeight: 1.1,
          }}
        >
          <DecryptedText
            text="Describe your sign in one word"
            speed={25}
            onComplete={() => setTitleAnimationComplete(true)}
          />
        </h2>
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
            {/* Room Info - Hidden, shown in header */}
            <div className="mb-6" style={{ display: 'none' }}>
              <p
                className="text-center"
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#666666',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                ROOM: {roomId}
              </p>
            </div>

            {/* Role Badge - Only show for spymasters */}
            {isAnySpymaster && !isSpy && (
              <div
                className="mb-6 p-4 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isRedSpymaster ? '#3a1a1a' : '#1a2a3a',
                  border: isRedSpymaster ? '1px solid #DC2626' : '1px solid #3B82F6',
                  borderRadius: '12px',
                }}
              >
                <Crown
                  style={{
                    width: '24px',
                    height: '24px',
                    color: isRedSpymaster ? '#DC2626' : '#3B82F6',
                  }}
                />
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: isRedSpymaster ? '#DC2626' : '#3B82F6',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  {getRoleDisplay()}
                </span>
              </div>
            )}

            {/* Code Sign / Spy Status - only show after title animation */}
            <div style={{ opacity: titleAnimationComplete ? 1 : 0, transition: 'opacity 0.5s ease-in' }}>
              {!isSpy && codeWord !== 'spy' && (
                <p
                  className="mb-2 text-center"
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  Code Sign
                </p>
              )}

              {(() => {
                console.log('🎨 RENDERING:', { isSpy, codeWord, shouldShowSpy: isSpy || codeWord === 'spy' });
                return null;
              })()}

              {!(isSpy || codeWord === 'spy') && (
                <div
                  className="p-6 mx-auto w-full max-w-md"
                  style={{
                    backgroundColor: '#000000',
                    border: 'none',
                    borderRadius: '24px',
                    overflow: 'hidden',
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                      MISSION-{roomId?.slice(0, 4).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                      CLASSIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-center" style={{ aspectRatio: '1/1', maxHeight: '350px', width: '100%' }}>
                    <div style={{ borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconForWord word={codeWord} size={280} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    <svg width="100%" height="40" viewBox="0 0 180 40" preserveAspectRatio="xMidYMid meet">
                      {Array.from({ length: 60 }).map((_, i) => (
                        <rect
                          key={i}
                          x={i * 3}
                          y={0}
                          width={Math.random() > 0.5 ? 2 : 1}
                          height={40}
                          fill="#FFFFFF"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertCircle
              className="mx-auto mb-4"
              style={{ width: '48px', height: '48px', color: '#666666' }}
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

        {/* Spy Code Words Grid - only show after title animation */}
        {(isSpy || codeWord === 'spy') && agentId && (
          <div className="mt-8" style={{ opacity: titleAnimationComplete ? 1 : 0, transition: 'opacity 0.5s ease-in' }}>
            <div
              className="p-6"
              style={{
                backgroundColor: '#000000',
                border: 'none',
                borderRadius: '12px',
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                  ALERT-{Math.floor(Math.random() * 9000 + 1000)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                  PRIORITY-1
                </span>
              </div>
              <p
                className="text-center mb-6"
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#DC2626',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                SPY
              </p>
              <p
                className="mb-4 text-center"
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                Possible Code Signs
              </p>
              <div className="grid grid-cols-3 gap-2">
                {spyCodeWords.map((word) => (
                  <div
                    key={word}
                    className="p-2 flex items-center justify-center"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      aspectRatio: '1/1',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
                      <IconForWord word={word} size={60} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

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

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeOutLine {
          0% { opacity: 1; }
          60% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes spyPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}