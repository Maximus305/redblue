"use client"
import React, { useState, useEffect, use, useMemo, useRef } from "react";
import { Loader2, Crown, AlertCircle, X } from 'lucide-react';
import { Check } from '@phosphor-icons/react/dist/ssr';
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
  const [votingStarted, setVotingStarted] = useState(false);
  const [, setHasVoted] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [allVotes, setAllVotes] = useState<Record<string, string>>({});
  const [votingComplete, setVotingComplete] = useState(false);
  const [votingResults, setVotingResults] = useState<{ spyId: string; spyName: string; wasCorrect: boolean } | null>(null);
  const [showVotingScreen, setShowVotingScreen] = useState(false);
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);

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

  // Generate 6 random words including the common code word for spy view
  // Use roomId as seed to keep consistent across reloads
  const spyCodeWords = useMemo(() => {
    if (!commonCodeWord || commonCodeWord === 'spy') {
      // Fallback: return 6 random words if no common code word
      // Use roomId to seed the selection
      const seed = roomId ? roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
      const shuffled = [...allCodeWords].sort((a, b) => {
        const hashA = (a.charCodeAt(0) + seed) % allCodeWords.length;
        const hashB = (b.charCodeAt(0) + seed) % allCodeWords.length;
        return hashA - hashB;
      });
      return shuffled.slice(0, 6);
    }

    // Get 5 random words excluding the common code word
    const otherWords = allCodeWords.filter(w => w !== commonCodeWord);
    const seed = roomId ? roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const shuffled = otherWords.sort((a, b) => {
      const hashA = (a.charCodeAt(0) + seed) % otherWords.length;
      const hashB = (b.charCodeAt(0) + seed) % otherWords.length;
      return hashA - hashB;
    });
    const randomFive = shuffled.slice(0, 5);

    // Combine with common code word and shuffle again
    const result = [...randomFive, commonCodeWord].sort((a, b) => {
      const hashA = (a.charCodeAt(0) + seed) % 6;
      const hashB = (b.charCodeAt(0) + seed) % 6;
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
          setVotingStarted(settings.votingStarted === true);
          setCommonCodeWord(settings.commonCodeWord);

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

  // Listen to player count changes and get all agents
  useEffect(() => {
    const agentsQuery = query(collection(db, "agents"), where("roomId", "==", roomId));
    const unsubscribe = onSnapshot(agentsQuery, (snapshot) => {
      setPlayerCount(snapshot.docs.length);
      const agents = snapshot.docs.map(doc => {
        const rawId = doc.id;
        // Remove room code prefix (e.g., "CPQS-E9H4_james" -> "james")
        const cleanId = rawId.includes('_') ? rawId.split('_')[1] : rawId;
        const name = doc.data().agentName || cleanId;
        return {
          id: rawId, // Keep full ID for key purposes
          name: name
        };
      });
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

  // Navigate to voting screen when votingStarted becomes true
  useEffect(() => {
    if (votingStarted && gameStarted) {
      setShowVotingScreen(true);
      setShowWaitingScreen(false);
    }
  }, [votingStarted, gameStarted]);

  // Listen for votes and determine when voting is complete
  useEffect(() => {
    if (!votingStarted || !roomId) return;

    const votesRef = collection(db, 'votes', roomId, 'players');
    const unsubscribe = onSnapshot(votesRef, async (snapshot) => {
      const votes: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        votes[doc.id] = doc.data().votedFor;
      });
      setAllVotes(votes);

      // Check if all players have voted
      const totalPlayers = allAgents.length;
      const totalVotes = snapshot.docs.length;

      if (totalVotes === totalPlayers && totalPlayers > 0) {
        // Voting is complete, calculate results
        setVotingComplete(true);

        // Count votes
        const voteCounts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
          const votedFor = doc.data().votedFor;
          voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
        });

        // Find player with most votes
        let maxVotes = 0;
        let suspectedSpyId = '';
        Object.entries(voteCounts).forEach(([playerId, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            suspectedSpyId = playerId;
          }
        });

        // Get the actual spy ID from settings
        const settingsRef = doc(db, "settings", roomId);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as SettingsData;
          console.log('🕵️ SPY DETECTION:', {
            spyAgent: settings.spyAgent,
            allAgents: allAgents,
            roomId
          });
          const actualSpySlug = settings.spyAgent?.includes('_')
            ? settings.spyAgent.split('_')[1]
            : settings.spyAgent;
          const actualSpyId = `${roomId}_${actualSpySlug}`;
          console.log('🎯 SPY ID CALCULATED:', {
            actualSpySlug,
            actualSpyId,
            suspectedSpyId
          });

          // Get spy name - try to find in allAgents first, otherwise use the slug
          let spyName = allAgents.find(a => a.id === actualSpyId)?.name || '';

          // If not found in allAgents (e.g., host), try to get from agents collection
          if (!spyName) {
            const spyAgentRef = doc(db, "agents", actualSpyId);
            const spyAgentDoc = await getDoc(spyAgentRef);
            if (spyAgentDoc.exists()) {
              spyName = spyAgentDoc.data().agentName || actualSpySlug || 'Unknown';
            } else {
              spyName = actualSpySlug || 'Unknown'; // Fallback to slug
            }
          }

          // Check if the vote was correct
          const wasCorrect = suspectedSpyId === actualSpyId;
          setVotingResults({ spyId: actualSpyId, spyName, wasCorrect });
        }
      }
    });

    return () => unsubscribe();
  }, [votingStarted, roomId, allAgents.length]);

  // Listen for new round starting (votes being cleared)
  useEffect(() => {
    if (!votingComplete || !roomId) return;

    const votesRef = collection(db, 'votes', roomId, 'players');
    const unsubscribe = onSnapshot(votesRef, (snapshot) => {
      // If we're on results screen and votes collection becomes empty, new round started
      if (snapshot.docs.length === 0 && votingComplete) {
        console.log('🔄 New round detected - votes cleared');
        // Reset all voting state
        setVotingComplete(false);
        setVotingResults(null);
        setShowVotingScreen(false);
        setShowWaitingScreen(false);
        setSelectedVote(null);
        setAllVotes({});
      }
    });

    return () => unsubscribe();
  }, [votingComplete, roomId]);

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
        router.push('/');
      }} />
    );
  }

  // Show loading state with gray background
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

  if (!error && !gameStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="w-full max-w-md">
          {/* Title */}
          <h1
            className="text-center mb-12"
            style={{
              fontSize: '56px',
              fontWeight: 400,
              color: '#000000',
              fontFamily: 'var(--font-barrio)',
              lineHeight: 1.1,
            }}
          >
            WHO&apos;S THE SPY
          </h1>

          {/* QR Code */}
          <div
            className="mb-8 p-6 mx-auto"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '2px solid #E5E5E5',
              width: '85%',
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Room Code at top */}
            <p
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '20px',
                fontWeight: 700,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                margin: 0,
                letterSpacing: '2px',
              }}
            >
              {roomId}
            </p>

            {/* Left side metadata (centered vertically) */}
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '16px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#666666',
              fontFamily: 'monospace',
              transform: 'translateY(-50%) rotate(90deg)',
            }}>
              CLR-{Math.floor(Math.random() * 9000 + 1000)}
            </span>

            {/* Right side metadata (centered vertically) */}
            <span style={{
              position: 'absolute',
              top: '50%',
              right: '16px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#666666',
              fontFamily: 'monospace',
              transform: 'translateY(-50%) rotate(-90deg)',
            }}>
              CLASSIFIED
            </span>

            {/* Bottom text (normal) */}
            <p
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '24px',
                fontWeight: 700,
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                margin: 0,
              }}
            >
              Scan to join
            </p>

            <QRCodeSVG
              value={`https://redblue-ten.vercel.app/${roomId}`}
              size={240}
              level="M"
            />
          </div>

          {/* All Players */}
          {allAgents.map((agent) => {
            const isMe = agent.id === `${roomId}_${agentSlug}`;
            return (
              <div
                key={agent.id}
                className="p-3 mb-3 mx-auto"
                style={{
                  backgroundColor: isMe ? '#FDD804' : '#FFFFFF',
                  border: isMe ? 'none' : '2px solid #E5E5E5',
                  borderRadius: '9999px',
                  width: '70%',
                }}
              >
                <p
                  className="text-center"
                  style={{
                    fontSize: '18px',
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
        backgroundColor: '#FDD804',
      }}
    >
      {/* Show the removed alert if the player has been removed */}
      {hasBeenRemoved && (
        <RemovedAlert onClose={() => {
          router.push('/');
        }} />
      )}

      {/* Voting Screen */}
      {votingComplete ? (
            <div className="w-full max-w-md">
              {votingResults && (
                <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
                  <h1
                    className="text-center"
                    style={{
                      fontSize: '56px',
                      fontWeight: 900,
                      color: '#000000',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      lineHeight: 1.2,
                      marginBottom: '48px',
                    }}
                  >
                    The spy was
                  </h1>
                  <div className="w-full p-10" style={{
                    backgroundColor: '#000000',
                    borderRadius: '24px',
                  }}>
                    <p
                      className="text-center"
                      style={{
                        fontSize: '52px',
                        fontWeight: 900,
                        color: '#FDD804',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
                    >
                      {votingResults.spyName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : showVotingScreen ? (
        <div className="w-full max-w-md">
          {/* Title with vote count */}
          <h2
            className="text-center"
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: 1.2,
              marginBottom: '40px',
            }}
          >
            Who is the spy?
          </h2>

          {/* Player Cards */}
          <div className="space-y-4 mb-8">
            {allAgents.filter(agent => agent.id !== `${roomId}_${agentSlug}`).map((agent) => {
              const isSelected = selectedVote === agent.id;

              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedVote(agent.id)}
                  className="w-full transition-all"
                  style={{
                    backgroundColor: isSelected ? '#FDD804' : '#000000',
                    border: isSelected ? '4px solid #000000' : 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '24px 28px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: isSelected ? '#000000' : '#FDD804',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    {agent.name}
                  </span>
                  {isSelected && (
                    <Check
                      size={36}
                      weight="bold"
                      color="#000000"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            onClick={async () => {
              console.log('🗳️ VOTE BUTTON CLICKED', { selectedVote, agentId, roomId });
              if (selectedVote && agentId) {
                try {
                  const votePath = `votes/${roomId}/players/${agentId}`;
                  console.log('📝 Writing vote to:', votePath, { votedFor: selectedVote });
                  const voteRef = doc(db, 'votes', roomId, 'players', agentId);
                  await setDoc(voteRef, {
                    votedFor: selectedVote,
                    timestamp: new Date(),
                    submitted: true
                  });
                  console.log('✅ Vote submitted successfully');
                  setHasVoted(true);
                  setShowVotingScreen(false);
                  setShowWaitingScreen(true);
                } catch (err) {
                  console.error('❌ Error submitting vote:', err);
                }
              } else {
                console.warn('⚠️ Cannot submit vote:', { selectedVote, agentId, reason: !selectedVote ? 'No vote selected' : 'No agentId' });
              }
            }}
            disabled={!selectedVote}
            className="w-full transition-all"
            style={{
              backgroundColor: selectedVote ? '#000000' : '#666666',
              color: '#FDD804',
              border: 'none',
              borderRadius: '24px',
              fontSize: '26px',
              fontWeight: 900,
              cursor: selectedVote ? 'pointer' : 'not-allowed',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              padding: '22px 0',
              opacity: selectedVote ? 1 : 0.6,
            }}
          >
            Submit Vote
          </button>
        </div>
      ) : showWaitingScreen ? (
        <div className="w-full max-w-md text-center">
          <h1
            className="mb-6"
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Waiting for votes...
          </h1>
          <p
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#666666',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {Object.keys(allVotes).length} / {allAgents.length} voted
          </p>
        </div>
      ) : (
      <div className={`w-full max-w-md transform transition-all duration-300 relative z-10 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {/* Instructions */}
        <h2
          className="text-center mb-10"
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#000000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.1,
          }}
        >
          Describe your sign in one word
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

            {/* Agent Name - Only for non-spies */}
            {!(isSpy || codeWord === 'spy') && (
              <div className="mb-6">
                <p
                  className="mb-2 text-center"
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  OPERATIVE
                </p>
                <div
                  className="p-4"
                  style={{
                    backgroundColor: '#000000',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                      CLR-{Math.floor(Math.random() * 9000 + 1000)}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                      SECTOR {String.fromCharCode(65 + Math.floor(Math.random() * 26))}{Math.floor(Math.random() * 9)}
                    </span>
                  </div>
                  <p
                    className="text-center"
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#FDD804',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    {agentName || agentId}
                  </p>
                </div>
              </div>
            )}

            {/* Code Sign / Spy Status */}
            <div>
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
                  className="p-8 mx-auto"
                  style={{
                    backgroundColor: '#000000',
                    border: 'none',
                    borderRadius: '12px',
                    width: '450px',
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                      MISSION-{roomId?.slice(0, 4).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>
                      CLASSIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-center" style={{ height: '400px' }}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconForWord word={codeWord} size={320} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                    <svg width="180" height="40">
                      {Array.from({ length: 60 }).map((_, i) => (
                        <rect
                          key={i}
                          x={i * 3}
                          y={0}
                          width={Math.random() > 0.5 ? 2 : 1}
                          height={40}
                          fill="#FDD804"
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

        {/* Spy Code Words Grid */}
        {(isSpy || codeWord === 'spy') && agentId && (
          <div className="mt-8">
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
                  color: '#FDD804',
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
                  color: '#FDD804',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                Possible Code Signs
              </p>
              <div className="grid grid-cols-2 gap-3">
                {spyCodeWords.map((word) => (
                  <div
                    key={word}
                    className="p-4 flex items-center justify-center"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      aspectRatio: '1/1',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                      <IconForWord word={word} size={120} />
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
      `}</style>
    </div>
  );
}