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
      
      // Use only the sanitized name without appending a timestamp
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const agentSlug = sanitizedName;
      
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: '#FDD804' }} />
          <div className="font-mono" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>VERIFYING ROOM...</div>
          <div className="text-sm mt-8" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Room ID: {formattedRoomId || roomId || "Unknown"}</div>
          <button
            onClick={bypassVerification}
            className="mt-4 text-sm hover:opacity-80"
            style={{ color: '#FDD804', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            Skip verification (debug)
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="max-w-md w-full p-8" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E5E5E5', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 mb-4" style={{ color: '#FF3B30' }} />
            <div className="font-mono text-lg mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600 }}>MISSION ERROR</div>
            <div className="font-mono text-center mb-6" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error}</div>
            <div className="text-xs mb-4" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Room ID: {formattedRoomId || roomId || "Unknown"}</div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 hover:opacity-90 transition-all"
                style={{ backgroundColor: '#FDD804', color: '#000000', borderRadius: '100px', border: 'none', fontWeight: 700, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                Return Home
              </button>
              <button
                onClick={bypassVerification}
                className="px-6 py-2 hover:opacity-90 transition-all"
                style={{ backgroundColor: '#F5F5F5', color: '#000000', borderRadius: '100px', border: 'none', fontWeight: 600, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F9FAFB' }}>
      <div className={`w-full max-w-md transform transition-all duration-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E5E5E5', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          {/* Header */}
          <div className="p-4" style={{ borderBottom: '2px solid #E5E5E5', backgroundColor: '#F5F5F5' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" style={{ color: '#666666' }} />
                <span className="font-mono" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600 }}>AGENT REGISTRATION</span>
              </div>
              <div className="font-mono text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {formattedRoomId || roomId}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>ENTER YOUR NAME</h1>
              <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Required to join this mission</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 font-mono text-lg text-center focus:outline-none"
                  style={{
                    border: '2px solid #E5E5E5',
                    borderRadius: '16px',
                    backgroundColor: '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: '#000000'
                  }}
                  placeholder="TYPE YOUR NAME"
                  aria-label="Agent Name"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-300"
                style={{
                  backgroundColor: '#FDD804',
                  color: '#000000',
                  borderRadius: '100px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '18px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
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
          <div className="p-4" style={{ borderTop: '2px solid #E5E5E5', backgroundColor: '#F5F5F5' }}>
            <div className="flex justify-between items-center text-xs font-mono" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              <span>ROOM::{formattedRoomId || roomId}</span>
              <span>STATUS::READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}