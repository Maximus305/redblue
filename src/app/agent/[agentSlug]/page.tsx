"use client"
import React, { useState, useEffect, use } from 'react';
import { Shield, Key, Loader2, Crown } from 'lucide-react';
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { IconForWord } from '@/utils/codeWords';

interface AgentPageProps {
  params: Promise<{
    agentSlug: string;
  }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const resolvedParams = use(params);
  const { agentSlug } = resolvedParams;
  
  const [agentId, setAgentId] = useState<string | null>(null);
  const [codeWord, setCodeWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [isSpymasterState, setIsSpymasterState] = useState(false);
  const [teamColor, setTeamColor] = useState<'red' | 'blue' | null>(null);

  useEffect(() => {
    fetchAgentData();
    setTimeout(() => setShowContent(true), 100);
  }, [agentSlug]);

  const checkSpymasterStatus = async () => {
    try {
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();
        if (agentSlug === settings.redSpymaster) {
          setIsSpymasterState(true);
          setTeamColor('red');
          return true;
        } else if (agentSlug === settings.blueSpymaster) {
          setIsSpymasterState(true);
          setTeamColor('blue');
          return true;
        }
      }
      setIsSpymasterState(false);
      setTeamColor(null);
      return false;
    } catch (error) {
      console.error('Error checking spymaster status:', error);
      return false;
    }
  };

  const fetchAgentData = async () => {
    try {
      const isSpymaster = await checkSpymasterStatus();
      const agentRef = doc(db, "agents", agentSlug);
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const data = agentSnap.data();
        if (isSpymaster) {
          setAgentId(data.agentId);
          setCodeWord(data.codeWord);
        } else if (data.agentId && data.codeWord) {
          setAgentId(data.agentId);
          setCodeWord(data.codeWord);
        }
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
      
      const isSpymaster = await checkSpymasterStatus();
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        setError('System not initialized. Contact administrator.');
        return;
      }

      const agentRef = doc(db, "agents", agentSlug);
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const data = agentSnap.data();
        if (isSpymaster) {
          setAgentId(data.agentId);
          setCodeWord(data.codeWord);
        } else if (data.agentId && data.codeWord) {
          setAgentId(data.agentId);
          setCodeWord(data.codeWord);
        } else {
          setError('Access denied. Invalid credentials.');
        }
      } else {
        setError('Access denied. Agent not found.');
      }
    } catch (error) {
      console.error('Error getting code word:', error);
      setError('Unable to get access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBgClasses = () => {
    if (teamColor === 'red') return "bg-red-50";
    if (teamColor === 'blue') return "bg-blue-50";
    return "bg-zinc-100";
  };

  const getTextColorClass = () => {
    if (teamColor === 'red') return "text-red-600";
    if (teamColor === 'blue') return "text-blue-600";
    return "text-gray-900";
  };

  return (
    <div className={`min-h-screen ${getBgClasses()} flex items-center justify-center p-6 relative overflow-hidden`}>
      {isSpymasterState && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${teamColor === 'red' ? 'bg-red-100/30' : 'bg-blue-100/30'}`}>
            <div className={`absolute inset-0 opacity-10`}
                 style={{
                   backgroundImage: `repeating-linear-gradient(
                     45deg,
                     ${teamColor === 'red' ? '#ef4444' : '#3b82f6'} 0px,
                     ${teamColor === 'red' ? '#ef4444' : '#3b82f6'} 1px,
                     transparent 1px,
                     transparent 60px
                   )`
                 }}
            />
          </div>
        </div>
      )}

      <div className={`w-full max-w-xl transform transition-all duration-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-white border border-gray-200 relative shadow-lg">
          <div className={`border-b border-gray-200 p-4 ${isSpymasterState ? (teamColor === 'red' ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className={`w-5 h-5 ${teamColor === 'red' ? 'text-red-600' : teamColor === 'blue' ? 'text-blue-600' : 'text-gray-600'}`} />
                <span className={`font-mono text-sm ${getTextColorClass()}`}>
                  {isSpymasterState ? `SPYMASTER.${teamColor?.toUpperCase()}` : 'AGENT.ACCESS'}
                </span>
              </div>
              <div className={`font-mono text-sm ${getTextColorClass()}`}>{agentId || '--'}</div>
            </div>
          </div>

          <div className="p-8 relative">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 font-mono text-sm rounded">
                {error}
              </div>
            )}

            {agentId && codeWord ? (
              <div className="space-y-8">
                {isSpymasterState && (
                  <div className={`p-3 ${teamColor === 'red' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'} border rounded-md flex items-center gap-2`}>
                    <Crown className="w-5 h-5" />
                    <span className="font-mono text-sm">
                      {teamColor === 'red' ? 'RED TEAM SPYMASTER' : 'BLUE TEAM SPYMASTER'}
                    </span>
                  </div>
                )}
                
                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>AGENT_ID</div>
                  <div className={`text-6xl font-mono ${getTextColorClass()} border border-gray-200 p-6 relative group ${isSpymasterState ? (teamColor === 'red' ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'} rounded`}>
                    <div className={`absolute inset-0 ${teamColor === 'red' ? 'bg-red-100' : teamColor === 'blue' ? 'bg-blue-100' : 'bg-gray-100'} opacity-0 group-hover:opacity-10 transition-opacity rounded`} />
                    <span className="relative">{agentId}</span>
                  </div>
                </div>

                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>CODE</div>
                  <div className="flex justify-center">
                    <div className={`${isSpymasterState ? (teamColor === 'red' ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'} border border-gray-200 p-8 relative group flex items-center justify-center rounded aspect-square w-64`}>
                      <div className={`absolute inset-0 ${teamColor === 'red' ? 'bg-red-100' : teamColor === 'blue' ? 'bg-blue-100' : 'bg-gray-100'} opacity-0 group-hover:opacity-10 transition-opacity rounded`} />
                      <IconForWord word={codeWord} size={96} className={getTextColorClass()} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGetCodeWord}
                disabled={loading}
                className={`w-full border border-gray-200 p-4 font-mono ${getTextColorClass()} 
                         hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors relative group rounded ${isSpymasterState ? (teamColor === 'red' ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}
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

          <div className={`border-t border-gray-200 p-4 ${isSpymasterState ? (teamColor === 'red' ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>SYSTEM_ID::{agentSlug}</span>
              <span>
                {isSpymasterState ? `SPYMASTER${agentId ? `::${agentId}` : ''}` : `AGENT${agentId ? `::${agentId}` : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}