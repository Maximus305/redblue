"use client"
import React, { useState, useEffect, use } from 'react';
import { Shield, Key, Loader2, Crown, AlertCircle } from 'lucide-react';
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
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
}

export default function AgentPage({ params }: AgentPageProps) {
  const resolvedParams = use(params);
  const { agentSlug } = resolvedParams;
  
  // State declarations
  const [agentId, setAgentId] = useState<string | null>(null);
  const [codeWord, setCodeWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [isSpymaster, setIsSpymaster] = useState<{
    isRed: boolean;
    isBlue: boolean;
  }>({ isRed: false, isBlue: false });

  useEffect(() => {
    fetchAgentData();
    setTimeout(() => setShowContent(true), 100);
  }, [agentSlug]);

  const fetchAgentData = async () => {
    try {
      // First fetch settings to get spymaster information
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data() as SettingsData;
        setIsSpymaster({
          isRed: agentSlug === settings.redSpymaster,
          isBlue: agentSlug === settings.blueSpymaster
        });
      }

      // Then fetch agent data
      const agentRef = doc(db, "agents", agentSlug);
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgentId(data.agentId);
        setCodeWord(data.codeWord);
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
      setError('System offline. Please try again.');
    }
  };

  const handleGetCodeWord = async () => {
    try {
      setLoading(true);
      setError(null);

      const agentNumber = parseInt(agentSlug);
      if (isNaN(agentNumber)) {
        setError('Invalid agent number.');
        return;
      }

      const formattedAgentId = agentNumber < 10 ? `0${agentNumber}` : `${agentNumber}`;
      const agentRef = doc(db, "agents", agentSlug);
      
      // Check if agent already exists
      const agentSnap = await getDoc(agentRef);
      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgentId(data.agentId);
        setCodeWord(data.codeWord);
        return;
      }

      // Get settings
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        setError('System not initialized. Contact administrator.');
        return;
      }

      const settingsData = settingsSnap.data() as SettingsData;
      
      // Check if this agent should be a spymaster
      const isFirstAgent = agentNumber === 1;
      const isSecondAgent = agentNumber === 2;
      const noRedSpymaster = !settingsData.redSpymaster;
      const noBlueSpymaster = !settingsData.blueSpymaster;

      const newSettings = { ...settingsData };
      let assignedCodeWord;

      if (isFirstAgent && noRedSpymaster) {
        // First agent becomes red spymaster
        newSettings.redSpymaster = agentSlug;
        assignedCodeWord = settingsData.oddCodeWord;
        setIsSpymaster({ isRed: true, isBlue: false });
      } else if (isSecondAgent && noBlueSpymaster) {
        // Second agent becomes blue spymaster
        newSettings.blueSpymaster = agentSlug;
        assignedCodeWord = settingsData.evenCodeWord;
        setIsSpymaster({ isRed: false, isBlue: true });
      } else {
        // Regular agent assignment
        const isEven = agentNumber % 2 === 0;
        assignedCodeWord = isEven ? settingsData.evenCodeWord : settingsData.oddCodeWord;
      }

      // Update settings if spymaster was assigned
      if (newSettings.redSpymaster !== settingsData.redSpymaster || 
          newSettings.blueSpymaster !== settingsData.blueSpymaster) {
        await setDoc(settingsRef, newSettings);
      }

      // Create new agent entry
      await setDoc(agentRef, {
        agentId: formattedAgentId,
        codeWord: assignedCodeWord
      });

      setAgentId(formattedAgentId);
      setCodeWord(assignedCodeWord);
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
    if (isRedSpymaster) return "bg-red-50";
    if (isBlueSpymaster) return "bg-blue-50";
    return "bg-zinc-100";
  };

  const getTextColorClass = () => {
    if (isRedSpymaster) return "text-red-600";
    if (isBlueSpymaster) return "text-blue-600";
    return "text-zinc-900";
  };

  const getBorderColorClass = () => {
    if (isRedSpymaster) return "border-red-200";
    if (isBlueSpymaster) return "border-blue-200";
    return "border-zinc-200";
  };

  return (
    <div className={`min-h-screen ${getBgClasses()} flex items-center justify-center p-6 relative overflow-hidden`}>
      {/* Background Pattern for Spymasters */}
      {isAnySpymaster && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${isRedSpymaster ? 'bg-red-100/30' : 'bg-blue-100/30'}`}>
            <div className={`absolute inset-0 opacity-10`}
                 style={{
                   backgroundImage: `repeating-linear-gradient(
                     45deg,
                     ${isRedSpymaster ? '#ef4444' : '#3b82f6'} 0px,
                     ${isRedSpymaster ? '#ef4444' : '#3b82f6'} 1px,
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
          <div className={`border-b ${getBorderColorClass()} p-4 ${isAnySpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className={`w-5 h-5 ${getTextColorClass()}`} />
                <span className={`font-mono text-sm ${getTextColorClass()}`}>
                  {isAnySpymaster ? `SPYMASTER.${isRedSpymaster ? 'RED' : 'BLUE'}` : 'AGENT.ACCESS'}
                </span>
              </div>
              <div className={`font-mono text-sm ${getTextColorClass()}`}>{agentId || '--'}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8 relative">
            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {agentId && codeWord ? (
              <div className="space-y-8">
                {/* Spymaster Badge */}
                {isAnySpymaster && (
                  <div className={`p-3 ${isRedSpymaster ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'} border rounded-md flex items-center gap-2`}>
                    <Crown className="w-5 h-5" />
                    <span className="font-mono text-sm">
                      {isRedSpymaster ? 'RED TEAM SPYMASTER' : 'BLUE TEAM SPYMASTER'}
                    </span>
                  </div>
                )}
                
                {/* Agent ID Display */}
                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>AGENT_ID</div>
                  <div className={`text-6xl font-mono ${getTextColorClass()} border ${getBorderColorClass()} p-6 relative group ${isAnySpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'} rounded-lg`}>
                    <div className={`absolute inset-0 ${isRedSpymaster ? 'bg-red-100' : isBlueSpymaster ? 'bg-blue-100' : 'bg-gray-100'} opacity-0 group-hover:opacity-10 transition-opacity rounded-lg`} />
                    <span className="relative">{agentId}</span>
                  </div>
                </div>

                {/* Code Sign Display */}
                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>CODE SIGN</div>
                  <div className="flex justify-center">
                    <div className={`${isAnySpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'} 
                                  border ${getBorderColorClass()} p-8 relative group rounded-lg aspect-square w-96 h-96 flex items-center justify-center`}>
                      <div className={`absolute inset-0 ${isRedSpymaster ? 'bg-red-100' : isBlueSpymaster ? 'bg-blue-100' : 'bg-gray-100'} 
                                    opacity-0 group-hover:opacity-10 transition-opacity rounded-lg`} />
                      <IconForWord 
                        word={codeWord} 
                        size={300}
                        className={getTextColorClass()} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Request Access Button
              <button
                onClick={handleGetCodeWord}
                disabled={loading}
                className={`w-full border ${getBorderColorClass()} p-4 font-mono ${getTextColorClass()} 
                         hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors relative group rounded-lg ${isAnySpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}
              >
                <div className="relative flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>PROCESSING...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      <span>REQUEST ACCESS</span>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Footer Bar */}
          <div className={`border-t ${getBorderColorClass()} p-4 ${isAnySpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>SYSTEM_ID::{agentSlug}</span>
              <span>
                {isAnySpymaster ? `SPYMASTER${agentId ? `::${agentId}` : ''}` : `AGENT${agentId ? `::${agentId}` : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}