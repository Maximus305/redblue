"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { Shield, Key, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment
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
      const currentNumber = settingsData.nextAgentNumber;
      const newAgentId = currentNumber < 10 ? `0${currentNumber}` : `${currentNumber}`;
      const isEven = currentNumber % 2 === 0;
      const assignedCodeWord = isEven ? settingsData.evenCodeWord : settingsData.oddCodeWord;

      await setDoc(agentRef, {
        agentId: newAgentId,
        codeWord: assignedCodeWord
      });

      await updateDoc(settingsRef, {
        nextAgentNumber: increment(1)
      });

      setAgentId(newAgentId);
      setCodeWord(assignedCodeWord);
    } catch {
      setError('Unable to get access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className={`w-full max-w-md transform transition-all duration-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl text-gray-100 font-semibold">Agent Access</h1>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 text-center p-3 bg-red-900/20 border border-red-700 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {agentId && codeWord ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-gray-400 mb-1 text-sm">Agent ID</div>
                  <div className="text-4xl font-mono font-bold text-blue-400 bg-gray-900/50 rounded-lg py-3">
                    {agentId}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-gray-400 mb-1 text-sm">Code Word</div>
                  <div className="text-3xl font-mono font-bold text-blue-400 bg-gray-900/50 rounded-lg py-3">
                    {codeWord}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGetCodeWord}
                disabled={loading}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold
                         hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 
                         disabled:cursor-not-allowed transition-colors duration-200
                         flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    <span>Get Access Code</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}