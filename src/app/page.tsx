"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";

interface AgentNavProps {
  params?: {
    roomId?: string;
  };
}

const AgentNav = ({ params }: AgentNavProps) => {
  const router = useRouter();
  const [time, setTime] = useState("00:00:00");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(params?.roomId || "");
  const [loading, setLoading] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(!params?.roomId);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleJoinMission = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isCreatingRoom && !roomId.trim()) return;

    setLoading(true);
    localStorage.setItem("agentName", name);

    // Ensure name is properly formatted for URL
    const formattedName = encodeURIComponent(name);
    const formattedRoomId = encodeURIComponent(roomId);
    
    // Simulate API request to store name (replace with actual Firebase or backend call)
    setTimeout(() => {
      router.push(`/agent/${formattedRoomId}/${formattedName}`);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-zinc-100 overflow-hidden font-mono">
      {/* Background Elements */}
      <div className="fixed inset-0">
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-black/5"
              style={{ top: `${i * 10}%`, transform: `rotate(${i * 5}deg)` }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Top Bar */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-black/10">
          <div className="max-w-4xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="text-sm">SYS.TIME: {time}</div>
            <div className="text-sm tracking-widest">ACCESS_POINT</div>
          </div>
        </div>

        {/* Form Section */}
        <div className="pt-32 flex justify-center items-center">
          <div className="bg-white border border-zinc-200 shadow-lg rounded-lg w-full max-w-md p-8">
            <div className="text-center mb-8">
              <img
                src="/images/spygame.png"
                alt="Spy Game"
                className="w-full h-auto mb-2 rounded"
              />
              <p className="text-zinc-500 text-sm">
                {isCreatingRoom 
                  ? "Create or join a room to start the mission" 
                  : `Entering Room: ${roomId}`}
              </p>
            </div>

            <form onSubmit={handleJoinMission}>
              {isCreatingRoom && (
                <div className="mb-6">
                  <label htmlFor="roomId" className="block text-sm font-medium text-zinc-700 mb-2">
                    ROOM ID
                  </label>
                  <input
                    type="text"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full p-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono"
                    placeholder="ENTER ROOM ID"
                    aria-label="Room ID"
                    required
                  />
                </div>
              )}

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
                  aria-label="Agent Name"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || (isCreatingRoom && !roomId.trim())}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Join Mission"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>JOINING MISSION...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>JOIN MISSION</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-black/10">
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