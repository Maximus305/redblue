"use client"
import React, { useState, useEffect, use } from 'react';
import { Shield, Key, Loader2, Crown } from 'lucide-react';
import { db } from "@/lib/firebase";
import { IconForWord } from "@/utils/codeWords";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

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

  // Determine if agent is a spymaster (first odd or even)
  const isSpymaster = agentId === "01" || agentId === "02";
  const isRedSpymaster = agentId === "01";
  const isBlueSpymaster = agentId === "02";

  useEffect(() => {
    fetchAgentData();
    setTimeout(() => setShowContent(true), 100);
  }, [agentSlug]);

  const fetchAgentData = async () => {
    try {
      const agentRef = doc(db, "agents", agentSlug);
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgentId(data.agentId);
        setCodeWord(data.codeWord);
      }
    } catch {
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
      const agentSnap = await getDoc(agentRef);

      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgentId(data.agentId);
        setCodeWord(data.codeWord);
        return;
      }

      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        setError('System not initialized. Contact administrator.');
        return;
      }

      const settingsData = settingsSnap.data();
      const isEven = agentNumber % 2 === 0;
      const assignedCodeWord = isEven ? settingsData.evenCodeWord : settingsData.oddCodeWord;

      await setDoc(agentRef, {
        agentId: formattedAgentId,
        codeWord: assignedCodeWord
      });

      setAgentId(formattedAgentId);
      setCodeWord(assignedCodeWord);
    } catch {
      setError('Unable to get access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get background classes based on spymaster status
  const getBgClasses = () => {
    if (isRedSpymaster) return "bg-red-50";
    if (isBlueSpymaster) return "bg-blue-50";
    return "bg-zinc-100";
  };

  // Get text color classes based on spymaster status
  const getTextColorClass = () => {
    if (isRedSpymaster) return "text-red-600";
    if (isBlueSpymaster) return "text-blue-600";
    return "text-gray-900";
  };

  return (
    <div className={`min-h-screen ${getBgClasses()} flex items-center justify-center p-6 relative overflow-hidden`}>
      {/* Background patterns for spymasters */}
      {isSpymaster && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${isRedSpymaster ? 'bg-red-100/30' : 'bg-blue-100/30'}`}>
            {/* Diagonal stripes */}
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

      <div className={`w-full max-w-xl transform transition-all duration-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-white border border-gray-200 relative shadow-lg">
          {/* Header with Spymaster designation */}
          <div className={`border-b border-gray-200 p-4 ${isSpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className={`w-5 h-5 ${isRedSpymaster ? 'text-red-600' : isBlueSpymaster ? 'text-blue-600' : 'text-gray-600'}`} />
                <span className={`font-mono text-sm ${getTextColorClass()}`}>
                  {isSpymaster ? `SPYMASTER.${isRedSpymaster ? 'RED' : 'BLUE'}` : 'AGENT.ACCESS'}
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
                {isSpymaster && (
                  <div className={`p-3 ${isRedSpymaster ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'} border rounded-md flex items-center gap-2`}>
                    <Crown className="w-5 h-5" />
                    <span className="font-mono text-sm">
                      {isRedSpymaster ? 'RED TEAM SPYMASTER' : 'BLUE TEAM SPYMASTER'}
                    </span>
                  </div>
                )}
                
                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>AGENT_ID</div>
                  <div className={`text-6xl font-mono ${getTextColorClass()} border border-gray-200 p-6 relative group ${isSpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'} rounded`}>
                    <div className={`absolute inset-0 ${isRedSpymaster ? 'bg-red-100' : isBlueSpymaster ? 'bg-blue-100' : 'bg-gray-100'} opacity-0 group-hover:opacity-10 transition-opacity rounded`} />
                    <span className="relative">{agentId}</span>
                  </div>
                </div>

                <div>
                  <div className={`font-mono text-lg mb-2 ${getTextColorClass()}`}>CODE</div>
                  <div className={`${isSpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'} border border-gray-200 p-8 relative group flex items-center justify-center rounded min-h-[200px]`}>
                    <div className={`absolute inset-0 ${isRedSpymaster ? 'bg-red-100' : isBlueSpymaster ? 'bg-blue-100' : 'bg-gray-100'} opacity-0 group-hover:opacity-10 transition-opacity rounded`} />
                    <IconForWord word={codeWord} size={96} className={getTextColorClass()} />
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGetCodeWord}
                disabled={loading}
                className={`w-full border border-gray-200 p-4 font-mono ${getTextColorClass()} 
                         hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors relative group rounded ${isSpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}
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

          {/* Footer */}
          <div className={`border-t border-gray-200 p-4 ${isSpymaster ? (isRedSpymaster ? 'bg-red-50' : 'bg-blue-50') : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>SYSTEM_ID::{agentSlug}</span>
              <span>
                {isSpymaster ? `SPYMASTER${agentId ? `::${agentId}` : ''}` : `AGENT${agentId ? `::${agentId}` : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}