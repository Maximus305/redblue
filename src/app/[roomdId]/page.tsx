"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { formatRoomId } from "@/utils/roomUtils";

export default function NameEntryPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [formattedRoomId, setFormattedRoomId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  // Extract roomId directly from the URL path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get the path from the URL
      const path = window.location.pathname;
      console.log("Current URL path:", path);
      
      // Extract the roomId (first segment after the leading slash)
      const segments = path.split('/').filter(Boolean);
      const extractedRoomId = segments[0] || '';
      console.log("Extracted roomId from URL:", extractedRoomId);
      
      // Set state
      setRoomId(extractedRoomId);
      if (extractedRoomId) {
        const formatted = formatRoomId(extractedRoomId);
        console.log("Formatted roomId:", formatted);
        setFormattedRoomId(formatted);
      }
    }
  }, []);

  // Verify room once we have a roomId
  useEffect(() => {
    if (!formattedRoomId) return;
    
    // Add a timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      if (verifying) {
        console.log("Verification timed out after 10 seconds");
        setVerifying(false);
        setError("Room verification timed out. Please try again or contact support.");
      }
    }, 10000); // 10 second timeout
    
    // Check if room exists and is active
    const verifyRoom = async () => {
      try {
        console.log("Attempting to verify room:", formattedRoomId);
        
        // Look up the room in Firestore
        const roomRef = doc(db, "rooms", formattedRoomId);
        console.log("Room reference created:", roomRef.path);
        
        const roomSnap = await getDoc(roomRef);
        console.log("Room document fetched, exists:", roomSnap.exists());
        
        if (!roomSnap.exists()) {
          console.log("Room not found in database");
          setError("Room not found. Please check the ID and try again.");
          setVerifying(false);
          return;
        }
        
        const roomData = roomSnap.data();
        console.log("Room data retrieved:", roomData);
        
        if (roomData && roomData.active === false) {
          setError("This room is no longer active.");
          setVerifying(false);
          return;
        }
        
        // Check if user has a stored name
        const storedName = localStorage.getItem("agentName");
        if (storedName) {
          setName(storedName);
        }
        
        // Success!
        console.log("Room verified successfully");
        setVerifying(false);
        setTimeout(() => setShowContent(true), 100);
      } catch (error) {
        console.error("Error verifying room:", error);
        setError(`Room verification failed. ${error instanceof Error ? error.message : String(error)}`);
        setVerifying(false);
      }
    };

    verifyRoom();
    
    // Clear timeout if component unmounts or verification completes
    return () => clearTimeout(timeoutId);
  }, [formattedRoomId]);

  // Bypass verification for debugging
  const bypassVerification = () => {
    console.log("Bypassing verification");
    setVerifying(false);
    setError(null);
    setShowContent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      localStorage.setItem("agentName", name);
      
      console.log("Joining room:", formattedRoomId);
      
      // Update room's last activity timestamp
      try {
        const roomRef = doc(db, "rooms", formattedRoomId);
        await setDoc(roomRef, { lastActivity: serverTimestamp() }, { merge: true });
        console.log("Updated room last activity");
      } catch (updateError) {
        console.warn("Failed to update last activity, but continuing:", updateError);
        // Continue anyway, this is not critical
      }
      
      // Generate a unique agent slug based on name and timestamp
      const timestamp = Date.now();
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const agentSlug = `${sanitizedName}-${timestamp}`;
      
      // Log the navigation we're about to do
      console.log("Navigating to:", `/room/${formattedRoomId}/${agentSlug}`);
      
      // Navigate to agent page with room ID and agent slug
      router.push(`/room/${formattedRoomId}/${agentSlug}`);
    } catch (error) {
      console.error("Error joining room:", error);
      setError("Failed to join room. Please try again.");
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <div className="text-zinc-600 font-mono">VERIFYING ROOM...</div>
          <div className="text-zinc-400 text-sm mt-8">Room ID: {formattedRoomId || roomId || "Unknown"}</div>
          <button 
            onClick={bypassVerification}
            className="mt-4 text-sm text-blue-500 hover:text-blue-700"
          >
            Skip verification (debug)
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="bg-white border border-zinc-200 shadow-lg rounded-lg max-w-md w-full p-8">
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <div className="text-zinc-800 font-mono text-lg mb-2">MISSION ERROR</div>
            <div className="text-zinc-600 font-mono text-center mb-6">{error}</div>
            <div className="text-zinc-400 text-xs mb-4">Room ID: {formattedRoomId || roomId || "Unknown"}</div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
              >
                Return Home
              </button>
              <button
                onClick={bypassVerification}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all"
              >
                Try Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6">
      <div className={`w-full max-w-md transform transition-all duration-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-white border border-zinc-200 shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-zinc-200 p-4 bg-zinc-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-zinc-700" />
                <span className="font-mono text-zinc-800">AGENT REGISTRATION</span>
              </div>
              <div className="font-mono text-sm text-zinc-500">
                {formattedRoomId || roomId}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">ENTER YOUR NAME</h1>
              <p className="text-zinc-500 text-sm">Required to join this mission</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-50 font-mono text-lg text-center"
                  placeholder="TYPE YOUR NAME"
                  aria-label="Agent Name"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>JOINING...</span>
                  </>
                ) : (
                  <span>JOIN MISSION</span>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 p-4 bg-zinc-50">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-500">
              <span>ROOM::{formattedRoomId || roomId}</span>
              <span>STATUS::READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}