"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, RotateCcw, Shield, Terminal, Scan, Power, Eye, Users } from 'lucide-react';
import { getRandomIcons } from "@/utils/codeWords";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
  DocumentReference,
} from "firebase/firestore";

interface AgentData {
  agentId: string;
  codeWord: string;
  isSpy?: boolean;
}

interface Agent {
  docRef: DocumentReference;
  id: string;
  data: AgentData;
}

export default function AdminDashboard() {
  const [activeAgents, setActiveAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [gameMode, setGameMode] = useState<'teams' | 'spy'>('teams');

  useEffect(() => {
    fetchAdminData();
    fetchGameMode();
    setTimeout(() => setShowStats(true), 100);
  }, []);

  const fetchGameMode = async () => {
    try {

      const settingsSnap = await getDocs(collection(db, "settings"));
      if (settingsSnap.docs.length > 0) {
        const settings = settingsSnap.docs[0].data();
        setGameMode(settings.gameMode || 'teams');
      }
    } catch (error) {
      console.error('Error fetching game mode:', error);
    }
  };

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
    if (!window.confirm('Confirm icon redistribution? This action will reassign all agent codes and spymasters.')) return;
    try {
      setLoading(true);
      const { evenCodeIcon, oddCodeIcon } = getRandomIcons();
      const settingsRef = doc(db, "settings", "mainSettings");
      
      // Get all agents
      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const agents = agentsSnapshot.docs.map(doc => ({
        docRef: doc.ref,
        id: doc.id,
        data: doc.data() as AgentData
      }));

      // First select spymasters randomly
      const availableAgents = [...agents];
      const randomRedSpymaster = availableAgents.splice(Math.floor(Math.random() * availableAgents.length), 1)[0];
      const randomBlueSpymaster = availableAgents.splice(Math.floor(Math.random() * availableAgents.length), 1)[0];

      // Update settings with new spymasters and code words
      await setDoc(settingsRef, {
        gameMode: 'teams',
        evenCodeWord: evenCodeIcon,
        oddCodeWord: oddCodeIcon,
        redSpymaster: randomRedSpymaster.id,
        blueSpymaster: randomBlueSpymaster.id,
      });

      const batch = writeBatch(db);

      // Update red spymaster's code word
      batch.update(randomRedSpymaster.docRef, { 
        codeWord: oddCodeIcon,
        isSpy: false
      });

      // Update blue spymaster's code word
      batch.update(randomBlueSpymaster.docRef, { 
        codeWord: evenCodeIcon,
        isSpy: false
      });

      // Update remaining agents
      availableAgents.forEach((agent: Agent) => {
        const agentNumber = parseInt(agent.id);
        const isEvenAgent = agentNumber % 2 === 0;
        const codeWord = isEvenAgent ? evenCodeIcon : oddCodeIcon;
        
        batch.update(agent.docRef, { 
          codeWord,
          isSpy: false
        });
      });

      await batch.commit();
      setGameMode('teams');
      await fetchAdminData();
    } catch (error) {
      console.error('Error shuffling icons:', error);
      setError('Icon redistribution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSpyGame = async () => {
    if (!window.confirm('Start Spy Game Mode? This will assign the same image to all agents except one spy.')) return;
    try {
      setLoading(true);
      const { evenCodeIcon } = getRandomIcons(); // We'll use this as the common image
      const settingsRef = doc(db, "settings", "mainSettings");
      
      // Get all agents
      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const agents = agentsSnapshot.docs.map(doc => ({
        docRef: doc.ref,
        id: doc.id,
        data: doc.data() as AgentData
      }));

      if (agents.length < 2) {
        setError('Need at least 2 agents to start spy game');
        return;
      }

      // Randomly select one agent to be the spy
      const spyIndex = Math.floor(Math.random() * agents.length);
      
      // Update settings
      await setDoc(settingsRef, {
        gameMode: 'spy',
        commonCodeWord: evenCodeIcon,
        spyAgent: agents[spyIndex].id,
        // Clear team-related settings
        redSpymaster: "",
        blueSpymaster: "",
        evenCodeWord: "",
        oddCodeWord: ""
      });

      const batch = writeBatch(db);

      // Update all agents
      agents.forEach((agent: Agent, index: number) => {
        if (index === spyIndex) {
          // This is the spy
          batch.update(agent.docRef, { 
            codeWord: 'spy',
            isSpy: true
          });
        } else {
          // Everyone else gets the same icon
          batch.update(agent.docRef, { 
            codeWord: evenCodeIcon,
            isSpy: false
          });
        }
      });

      await batch.commit();
      setGameMode('spy');
      await fetchAdminData();
    } catch (error) {
      console.error('Error starting spy game:', error);
      setError('Failed to start spy game');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('WARNING: This will deactivate all agents and reset the game. Proceed?')) return;
    try {
      setLoading(true);
  
      // Delete all existing agents
      const agentsSnapshot = await getDocs(collection(db, "agents"));
      const batch = writeBatch(db);
      agentsSnapshot.docs.forEach(agentDoc => {
        batch.delete(doc(db, "agents", agentDoc.id));
      });
      if (agentsSnapshot.docs.length > 0) {
        await batch.commit();
      }
  
      // Generate new code words for team mode
      const { evenCodeIcon, oddCodeIcon } = getRandomIcons();
      const settingsRef = doc(db, "settings", "mainSettings");
  
      // Reset settings to default team mode
      await setDoc(settingsRef, {
        gameMode: 'teams',
        nextAgentNumber: 1,
        evenCodeWord: evenCodeIcon,
        oddCodeWord: oddCodeIcon,
        redSpymaster: "",
        blueSpymaster: "",
        spyAgent: "",
        commonCodeWord: ""
      });
  
      setGameMode('teams');
      await fetchAdminData();
    } catch (error) {
      console.error('Error resetting system:', error);
      setError('System reset failed');
    } finally {
      setLoading(false);
    }
  };

  const getGameModeDisplay = () => {
    return gameMode === 'spy' ? 'SPY MODE ACTIVE' : 'TEAM MODE ACTIVE';
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
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-zinc-600">{getGameModeDisplay()}</span>
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-red-600" />
              <span className="text-sm font-mono text-zinc-600">ACTIVE</span>
            </div>
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
                    className={`aspect-square flex items-center justify-center bg-zinc-50 border-zinc-200 `}
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
                <Users className="h-4 w-4" />
                {loading ? "PROCESSING..." : "START TEAM MODE"}
              </button>

              <button
                onClick={handleStartSpyGame}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-50 text-zinc-900 border border-zinc-200 hover:border-red-600/50 disabled:opacity-50 transition-all duration-200 font-mono"
              >
                <Eye className="h-4 w-4" />
                {loading ? "PROCESSING..." : "START SPY MODE"}
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
                <span className="text-zinc-600">{getGameModeDisplay()}</span>
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