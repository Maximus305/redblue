"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Plus, ArrowRight,  } from "lucide-react";
import { generateRoomId, formatRoomId } from "@/utils/roomUtils";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { getRandomIcons } from "@/utils/codeWords";

const RoomNav = () => {
  const router = useRouter();
  const [time, setTime] = useState("00:00:00");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    
    const storedName = localStorage.getItem("agentName");
    if (storedName) {
      setName(storedName);
    }
    
    generateNewRoomId();
    
    return () => clearInterval(timer);
  }, []);

  const generateNewRoomId = () => {
    setRoomId(generateRoomId());
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      localStorage.setItem("agentName", name);

      // Check if room already exists
      const formattedId = formatRoomId(roomId);
      const roomRef = doc(db, "rooms", formattedId);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        setError("Room ID already exists. Please try a different one.");
        setLoading(false);
        return;
      }

      // Create room
      const { evenCodeIcon, oddCodeIcon } = getRandomIcons();
      
      // Create room document
      await setDoc(roomRef, {
        roomId: formattedId,
        createdAt: serverTimestamp(),
        createdBy: name,
        active: true,
        lastActivity: serverTimestamp()
      });
      
      // Create settings for the room
      const settingsRef = doc(db, "settings", formattedId);
      await setDoc(settingsRef, {
        gameMode: 'teams',
        evenCodeWord: evenCodeIcon,
        oddCodeWord: oddCodeIcon,
        redSpymaster: "",
        blueSpymaster: "",
        commonCodeWord: ""
      });
      
      // Generate QR code URL with the room code
      const baseUrl = window.location.origin;
      const qrCodeUrl = `${baseUrl}/room/${formattedId}`;
      setQrUrl(qrCodeUrl);
      setShowQRCode(true);
      
      // Wait for QR code to show before proceeding
      setTimeout(() => {
        // Navigate to the admin page for this room
        router.push(`/admin/${formattedId}`);
      }, 5000); // Show QR code for 5 seconds
      
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Failed to create room. Please try again.");
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }
    
    if (!joinRoomId.trim()) {
      setError("Room ID is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      localStorage.setItem("agentName", name);
      
      // Format room ID to ensure proper format
      const formattedRoomId = formatRoomId(joinRoomId);
      
      // Check if room exists
      const roomRef = doc(db, "rooms", formattedRoomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        setError("Room not found. Please check the ID and try again.");
        setLoading(false);
        return;
      }
      
      const roomData = roomSnap.data();
      if (!roomData.active) {
        setError("This room is no longer active.");
        setLoading(false);
        return;
      }
      
      // Update room's last activity timestamp
      await setDoc(roomRef, { lastActivity: serverTimestamp() }, { merge: true });
      
      // Generate a unique agent slug based on name and timestamp
      const timestamp = Date.now();
      const agentSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${timestamp}`;
      
      // Navigate to agent page with room ID and agent slug
      router.push(`/room/${formattedRoomId}/${agentSlug}`);
    } catch (error) {
      console.error("Error joining room:", error);
      setError("Failed to join room. Please try again.");
      setLoading(false);
    }
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
            <div className="text-sm tracking-widest">ROOM_ACCESS</div>
          </div>
        </div>

        {/* QR Code Overlay */}
        {showQRCode && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="bg-white p-8 rounded-lg max-w-md w-full text-center">
              <h2 className="text-xl font-bold mb-4">Room Created!</h2>
              <p className="mb-4">Scan this QR code to join the room:</p>
              
              <div className="bg-white p-4 inline-block mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} 
                  alt="Room QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <p className="font-mono text-sm mb-6">Room ID: {formatRoomId(roomId)}</p>
              <p className="text-sm text-gray-600">Redirecting to admin panel...</p>
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="pt-32 flex justify-center items-center pb-20">
          <div className="bg-white border border-zinc-200 shadow-lg rounded-lg w-full max-w-2xl p-8">
            <div className="text-center mb-8">
              <img
                src="/images/spygame.png"
                alt="Spy Game"
                className="h-24 mx-auto mb-2 rounded"
              />
              <h1 className="text-xl font-bold mb-2">SPY MISSION CONTROL</h1>
              <p className="text-zinc-500 text-sm">Create or join a mission room</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Create Room Form */}
              <div className="border-r border-zinc-200 pr-6">
                <h2 className="text-lg font-medium mb-4">Create Room</h2>
                <form onSubmit={handleCreateRoom}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-2">
                      ADMIN NAME
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono"
                      placeholder="ENTER YOUR NAME"
                      aria-label="Admin Name"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label htmlFor="roomId" className="block text-sm font-medium text-zinc-700 mb-2">
                      ROOM ID
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        id="roomId"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        className="w-full p-3 border border-zinc-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono"
                        placeholder="XXXX-XXXX"
                        aria-label="Room ID"
                        required
                      />
                      <button
                        type="button"
                        onClick={generateNewRoomId}
                        className="bg-zinc-100 border border-zinc-300 border-l-0 rounded-r-md px-3 hover:bg-zinc-200"
                        aria-label="Generate Room ID"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !roomId.trim()}
                    className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Create Room"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>CREATING ROOM...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>CREATE ROOM</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Join Room Form */}
              <div className="pl-2">
                <h2 className="text-lg font-medium mb-4">Join Room</h2>
                <form onSubmit={handleJoinRoom}>
                  <div className="mb-4">
                    <label htmlFor="joinName" className="block text-sm font-medium text-zinc-700 mb-2">
                      AGENT NAME
                    </label>
                    <input
                      type="text"
                      id="joinName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono"
                      placeholder="ENTER YOUR NAME"
                      aria-label="Agent Name"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label htmlFor="joinRoomId" className="block text-sm font-medium text-zinc-700 mb-2">
                      ROOM ID
                    </label>
                    <input
                      type="text"
                      id="joinRoomId"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      className="w-full p-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono"
                      placeholder="XXXX-XXXX"
                      aria-label="Room ID to Join"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !joinRoomId.trim()}
                    className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Join Room"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>JOINING ROOM...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>JOIN ROOM</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
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

export default RoomNav;