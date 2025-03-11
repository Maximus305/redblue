"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Loader2 } from 'lucide-react';

const AgentNav = () => {
  const router = useRouter();
  const [time, setTime] = useState('00:00:00');
  const [name, setName] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate a random numeric code of specified length
  const generateCode = (length = 16) => {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleNameSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const code = generateCode(32);
      setAgentCode(code);
      setShowCode(true);
      setLoading(false);
    }, 1500);
  };

  const handleJoinMission = () => {
    // In a real app, we'd store this in a database
    // For now, we'll just pass it through URL
    localStorage.setItem('agentName', name);
    localStorage.setItem('agentCode', agentCode);
    router.push(`/agent/${agentCode}`);
  };

  return (
    <div className="min-h-screen bg-zinc-100 overflow-hidden font-mono">
      {/* Background Elements */}
      <div className="fixed inset-0">
        {/* Geometric Pattern */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-black/5"
              style={{ top: `${i * 10}%`, transform: `rotate(${i * 5}deg)` }}
            />
          ))}
        </div>
        {/* Diagonal Sections */}
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-zinc-200/50 transform rotate-15" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-zinc-200/50 transform -rotate-15" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Top Bar */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-4xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="text-sm">SYS.TIME: {time}</div>
            <div className="text-sm tracking-widest">ACCESS_POINT</div>
          </div>
        </div>

        {/* Main Section */}
        <div className="pt-32 flex justify-center items-center">
          <div className="bg-white border border-zinc-200 shadow-lg rounded-lg w-full max-w-md p-8">
            {!showCode ? (
              <>
                <div className="text-center mb-8">
                  <img src="/images/spygame.png" alt="Spy Game" className="w-full h-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Enter your name to receive an agent code</p>
                </div>
                
                <form onSubmit={handleNameSubmit}>
                  <div className="mb-6">
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-2">
                      AGENT NAME
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono"
                      placeholder="ENTER YOUR NAME"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="w-full bg-zinc-800 text-white py-3 rounded-md hover:bg-zinc-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>PROCESSING...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>GENERATE AGENT CODE</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <Shield className="w-12 h-12 text-blue-500" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tighter mb-2">WELCOME AGENT {name.toUpperCase()}</h1>
                  <p className="text-zinc-500 text-sm">Your unique access code has been generated</p>
                </div>
                
                <div className="mb-6 bg-zinc-50 p-4 border border-zinc-200 rounded-md">
                  <div className="text-xs text-zinc-500 mb-2">YOUR CODE</div>
                  <div className="text-lg break-all font-mono tracking-wider select-all">
                    {agentCode}
                  </div>
                </div>
                
                <div className="text-xs text-zinc-500 mb-6 text-center">
                  Please copy this code for future reference
                </div>
                
                <button
                  onClick={handleJoinMission}
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>JOIN MISSION</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-sm border-t border-black/10">
          <div className="max-w-4xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="text-sm">SYSTEM:ACTIVE</div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm">READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentNav;