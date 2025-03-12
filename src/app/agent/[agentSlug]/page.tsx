"use client";
import React, { useState, useEffect, use } from "react";
import { Shield, Key, Loader2, Crown, AlertCircle, Eye } from 'lucide-react';
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "firebase/firestore";
import { IconForWord } from '@/utils/codeWords';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentPageProps {
  params: Promise<{
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
}

/** Helper function to treat the slug as "even" or "odd" by summing ASCII codes. */
function isSlugEven(slug: string): boolean {
  let sum = 0;
  for (let i = 0; i < slug.length; i++) {
    sum += slug.charCodeAt(i);
  }
  return sum % 2 === 0;
}

export default function AgentPage({ params }: AgentPageProps) {
  const resolvedParams = use(params);
  const { agentSlug } = resolvedParams;
  
  // State declarations
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

  useEffect(() => {
    // Get agent name from localStorage
    const storedName = localStorage.getItem('agentName');
    if (storedName) {
      setAgentName(storedName);
    }

    // Set up real-time listener for settings
    const settingsRef = doc(db, "settings", "mainSettings");
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as SettingsData;
        const currentGameMode = settings.gameMode || 'teams';
        setGameMode(currentGameMode);
        
        if (currentGameMode === 'spy') {
          setIsSpy(agentSlug === settings.spyAgent);
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

    // Set up real-time listener for agent data
    const agentRef = doc(db, "agents", agentSlug);
    const unsubscribeAgent = onSnapshot(agentRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAgentId(data.agentId ?? null);
        setCodeWord(data.codeWord ?? null);
        setLoading(false);
      } else {
        // If agent doesn't exist yet, automatically request access
        handleGetCodeWord();
      }
    });

    setTimeout(() => setShowContent(true), 100);

    // Cleanup listeners on unmount
    return () => {
      unsubscribeSettings();
      unsubscribeAgent();
    };
  }, [agentSlug]);

  const updateAgentForSpyMode = async (settings: SettingsData) => {
    if (!agentId) return;

    const agentRef = doc(db, "agents", agentSlug);
    const userIsSpy = agentSlug === settings.spyAgent;
    
    try {
      await setDoc(agentRef, {
        agentId,
        agentName,
        codeWord: userIsSpy ? 'spy' : settings.commonCodeWord,
        isSpy: userIsSpy
      }, { merge: true });
    } catch (error) {
      console.error('Error updating agent for spy mode:', error);
    }
  };

  const updateAgentForTeamMode = async (settings: SettingsData) => {
    if (!agentId) return;

    const agentRef = doc(db, "agents", agentSlug);
    // For non-spy game, check if user is red or blue spymaster, or a regular agent
    const isRed = agentSlug === settings.redSpymaster;
    const isBlue = agentSlug === settings.blueSpymaster;
    const agentIsEven = isSlugEven(agentSlug);

    let assignedCodeWord = null;
    if (isRed) assignedCodeWord = settings.oddCodeWord;
    else if (isBlue) assignedCodeWord = settings.evenCodeWord;
    else assignedCodeWord = agentIsEven ? settings.evenCodeWord : settings.oddCodeWord;

    try {
      await setDoc(agentRef, {
        agentId,
        agentName,
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

      const agentRef = doc(db, "agents", agentSlug);
      const agentSnap = await getDoc(agentRef);

      // If agent already exists, just load it
      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgentId(data.agentId);
        setCodeWord(data.codeWord);
        setLoading(false);
        return;
      }

      // Otherwise, create a new record for this agent
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        setError('System not initialized. Contact administrator.');
        setLoading(false);
        return;
      }

      const settingsData = settingsSnap.data() as SettingsData;
      const currentGameMode = settingsData.gameMode || 'teams';
      setGameMode(currentGameMode);

      let assignedCodeWord = null;
      let isSpyRole = false;

      if (currentGameMode === 'spy') {
        // Spy logic
        if (agentSlug === settingsData.spyAgent) {
          assignedCodeWord = 'spy';
          isSpyRole = true;
        } else {
          assignedCodeWord = settingsData.commonCodeWord;
        }
      } else {
        // Teams logic
        // If there's no red spymaster, assign red spymaster to this slug
        if (!settingsData.redSpymaster) {
          assignedCodeWord = settingsData.oddCodeWord;
          await setDoc(settingsRef, { ...settingsData, redSpymaster: agentSlug }, { merge: true });
          setIsSpymaster({ isRed: true, isBlue: false });
        } 
        // Else if there's no blue spymaster, assign blue spymaster to this slug
        else if (!settingsData.blueSpymaster) {
          assignedCodeWord = settingsData.evenCodeWord;
          await setDoc(settingsRef, { ...settingsData, blueSpymaster: agentSlug }, { merge: true });
          setIsSpymaster({ isRed: false, isBlue: true });
        } else {
          // Normal agent assignment
          const agentIsEven = isSlugEven(agentSlug);
          assignedCodeWord = agentIsEven ? settingsData.evenCodeWord : settingsData.oddCodeWord;
        }
      }

      // Create new agent entry
      const formattedId = agentSlug; // No numeric formatting required now
      await setDoc(agentRef, {
        agentId: formattedId,
        agentName,
        codeWord: assignedCodeWord ?? null,
        isSpy: isSpyRole
      });

      setAgentId(formattedId);
      setCodeWord(assignedCodeWord ?? null);
    } catch (error) {
      console.error('Error getting access code:', error);
      setError('Unable to get access code. Please try again.');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className={`min-h-screen ${getBgClasses()} flex items-center justify-center p-6 relative overflow-hidden`}>
      {/* Background Pattern */}
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
          {/* Header Bar */}
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

          {/* Main Content */}
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
                {(isAnySpymaster || isSpy) && (
                  <div
                    className={`p-3 ${getBgClasses()} ${getTextColorClass()} ${getBorderColorClass()} border rounded-md flex items-center gap-2`}
                  >
                    {isSpy ? <Eye className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                    <span className="font-mono text-sm">{getRoleDisplay()}</span>
                  </div>
                )}
                
                {/* Agent Name Display */}
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

                {/* Code Sign Display */}
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
                      {gameMode === 'spy' && isSpy ? (
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

            {/* Spy Gallery - Only shown to spies */}
            {isSpy && agentId && (
              <div className="mt-12 space-y-4">
                <div className={`font-mono text-lg ${getTextColorClass()}`}>ALL POSSIBLE CODE SIGNS</div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    'Atlas', 'Balloon', 'Bamboo', 'Basket',
                    'Bell', 'Boat', 'Bullet', 'Camera',
                    'Castle', 'Chair', 'Clock', 'Diamond',
                    'Hammer', 'Lantern', 'Lock', 'Ring',
                    'Rocket', 'Car', 'Hack', 'Key'
                  ].map((word) => (
                    <div
                      key={word}
                      className={`${getBgClasses()} border ${getBorderColorClass()} p-4 rounded-lg aspect-square flex items-center justify-center relative group`}
                    >
                      <div
                        className={`absolute inset-0 bg-red-100 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg`}
                      />
                      <IconForWord
                        word={word}
                        size={80}
                        className={getTextColorClass()}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className={`border-t ${getBorderColorClass()} p-4 ${getBgClasses()}`}>
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>SYSTEM_ID::{agentSlug}</span>
              <span>{getRoleDisplay()}{agentName ? `::${agentName}` : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
