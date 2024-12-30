"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Shuffle, RotateCcw, Shield, Terminal, Scan, Power } from 'lucide-react';
import { getRandomWords } from "@/utils/codeWords";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  writeBatch
} from "firebase/firestore";

export default function AdminDashboard() {
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchAdminData();
    setTimeout(() => setShowStats(true), 100);
  }, []);

  const fetchAdminData = async () => {
    try {
      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const agentNumbers = agentsSnapshot.docs.map(doc => doc.data().agentId).sort();
      setActiveAgents(agentNumbers);
      setError('');
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to fetch admin data');
    }
  };

  const handleShuffle = async () => {
    if (!window.confirm('Confirm code word redistribution? This action will reassign all agent codes.')) return;
    try {
      setLoading(true);
      const { evenCodeWord, oddCodeWord } = getRandomWords();
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, {
          nextAgentNumber: 1,
          evenCodeWord,
          oddCodeWord
        });
      } else {
        await updateDoc(settingsRef, {
          evenCodeWord,
          oddCodeWord
        });
      }

      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const batch = writeBatch(db);
      
      agentsSnapshot.docs.forEach(agentDoc => {
        const agentData = agentDoc.data();
        const agentIdNum = parseInt(agentData.agentId, 10);
        const newWord = agentIdNum % 2 === 0 ? evenCodeWord : oddCodeWord;
        batch.update(doc(db, "agents", agentDoc.id), { codeWord: newWord });
      });

      if (agentsSnapshot.docs.length > 0) {
        await batch.commit();
      }
      
      await fetchAdminData();
    } catch (error) {
      console.error('Error shuffling code words:', error);
      setError('Code word redistribution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('WARNING: This will deactivate all agents. Proceed?')) return;
    try {
      setLoading(true);
      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const batch = writeBatch(db);
      
      agentsSnapshot.docs.forEach(agentDoc => {
        batch.delete(doc(db, "agents", agentDoc.id));
      });

      if (agentsSnapshot.docs.length > 0) {
        await batch.commit();
      }

      const { evenCodeWord, oddCodeWord } = getRandomWords();
      const settingsRef = doc(db, "settings", "mainSettings");
      await setDoc(settingsRef, {
        nextAgentNumber: 1,
        evenCodeWord,
        oddCodeWord
      });

      await fetchAdminData();
    } catch (error) {
      console.error('Error resetting agents:', error);
      setError('System reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className={`max-w-7xl mx-auto space-y-6 transition-all duration-500 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-emerald-500" />
            <h1 className="text-xl font-bold text-emerald-500">SYSTEM CONTROL</h1>
          </div>
          <div className="flex items-center gap-2 text-emerald-500">
            <Power className="h-4 w-4" />
            <span className="text-sm font-mono">ACTIVE</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Monitor */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-emerald-500 flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Active Agents
              </CardTitle>
              <CardDescription className="text-gray-400">
                Currently deployed: {activeAgents.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {activeAgents.map((agentId) => (
                  <div
                    key={agentId}
                    className="aspect-square flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700 hover:border-emerald-500/50 transition-colors"
                  >
                    <span className="font-mono text-emerald-500">{agentId}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Control Panel */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-emerald-500 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Controls
              </CardTitle>
              <CardDescription className="text-gray-400">
                Security operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={handleShuffle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all duration-200"
              >
                <Shuffle className="h-4 w-4" />
                {loading ? "PROCESSING..." : "REDISTRIBUTE CODES"}
              </button>

              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                {loading ? "PROCESSING..." : "SYSTEM RESET"}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* System Log */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="font-mono text-sm text-gray-400">
              <span className="text-emerald-500">{">"}</span> System initialized<br />
              <span className="text-emerald-500">{">"}</span> {activeAgents.length} agents active<br />
              <span className="text-emerald-500">{">"}</span> Awaiting commands...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}