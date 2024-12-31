"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Shuffle, RotateCcw, Shield, Terminal, Scan, Power } from 'lucide-react';
import { getRandomIcons } from "@/utils/codeWords";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

interface AgentData {
  agentId: string;
  codeWord: string;
}

export default function AdminDashboard() {
  const [activeAgents, setActiveAgents] = useState<AgentData[]>([]);
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
      const agentData = agentsSnapshot.docs
        .map(doc => doc.data() as AgentData)
        .sort((a, b) => a.agentId.localeCompare(b.agentId));
      setActiveAgents(agentData);
      setError('');
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to fetch admin data');
    }
  };

  const handleShuffle = async () => {
    if (!window.confirm('Confirm icon redistribution? This action will reassign all agent codes.')) return;
    try {
      setLoading(true);
      const { evenCodeIcon, oddCodeIcon } = getRandomIcons();
      const settingsRef = doc(db, "settings", "mainSettings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, {
          nextAgentNumber: 1,
          evenCodeWord: evenCodeIcon,
          oddCodeWord: oddCodeIcon
        });
      } else {
        await updateDoc(settingsRef, {
          evenCodeWord: evenCodeIcon,
          oddCodeWord: oddCodeIcon
        });
      }

      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const batch = writeBatch(db);
      
      agentsSnapshot.docs.forEach(agentDoc => {
        const agentData = agentDoc.data();
        const agentIdNum = parseInt(agentData.agentId, 10);
        const newWord = agentIdNum % 2 === 0 ? evenCodeIcon : oddCodeIcon;
        batch.update(doc(db, "agents", agentDoc.id), { codeWord: newWord });
      });

      if (agentsSnapshot.docs.length > 0) {
        await batch.commit();
      }
      
      await fetchAdminData();
    } catch (error) {
      console.error('Error shuffling icons:', error);
      setError('Icon redistribution failed');
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

      const { evenCodeIcon, oddCodeIcon } = getRandomIcons();
      const settingsRef = doc(db, "settings", "mainSettings");
      await setDoc(settingsRef, {
        nextAgentNumber: 1,
        evenCodeWord: evenCodeIcon,
        oddCodeWord: oddCodeIcon
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
    <div className="min-h-screen bg-white text-zinc-900 p-6">
      {/* Technical Grid Background */}
      <div className="fixed inset-0 opacity-[0.03]" 
           style={{
             backgroundImage: `
               linear-gradient(to right, black 1px, transparent 1px),
               linear-gradient(to bottom, black 1px, transparent 1px)
             `,
             backgroundSize: '48px 48px'
           }} 
      />

      {/* Diagonal Stripes */}
      <div className="fixed inset-0 opacity-[0.02]"
           style={{
             backgroundImage: `repeating-linear-gradient(
               45deg,
               #000 0px,
               #000 1px,
               transparent 1px,
               transparent 60px
             )`
           }}
      />

      <div className={`max-w-7xl mx-auto space-y-6 relative transition-all duration-500 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Header */}
        <div className="flex items-center justify-between bg-zinc-100 p-6 border border-zinc-200">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-red-600" />
            <h1 className="text-xl font-mono tracking-tight text-zinc-900">SYSTEM CONTROL</h1>
          </div>
          <div className="flex items-center gap-2">
            <Power className="h-4 w-4 text-red-600" />
            <span className="text-sm font-mono text-zinc-600">ACTIVE</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Monitor */}
          <Card className="border border-zinc-200 bg-white">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2 text-zinc-900">
                <Scan className="h-5 w-5 text-red-600" />
                Active Agents
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Currently deployed: {activeAgents.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {activeAgents.map((agent) => (
                  <div
                    key={agent.agentId}
                    className="aspect-square flex items-center justify-center bg-zinc-50 border border-zinc-200 hover:border-red-600/50 transition-colors"
                  >
                    <span className="font-mono text-sm text-zinc-900">{agent.agentId}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Control Panel */}
          <Card className="border border-zinc-200 bg-white">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2 text-zinc-900">
                <Shield className="h-5 w-5 text-red-600" />
                System Controls
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Security operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={handleShuffle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-50 text-zinc-900 border border-zinc-200 hover:border-red-600/50 disabled:opacity-50 transition-all duration-200 font-mono"
              >
                <Shuffle className="h-4 w-4" />
                {loading ? "PROCESSING..." : "REDISTRIBUTE CODES"}
              </button>

              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-all duration-200 font-mono"
              >
                <RotateCcw className="h-4 w-4" />
                {loading ? "PROCESSING..." : "SYSTEM RESET"}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* System Log */}
        <Card className="border border-zinc-200 bg-white">
          <CardContent className="p-4">
            <div className="font-mono text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-red-600">{">"}</span>
                <span className="text-zinc-600">System initialized</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">{">"}</span>
                <span className="text-zinc-600">{activeAgents.length} agents active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">{">"}</span>
                <span className="text-zinc-600">Awaiting commands...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}