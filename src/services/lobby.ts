import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Type definitions matching the leader POV
export interface Member {
  memberId: string;
  displayName: string;
  roomId: string;
  role: 'host' | 'player';
  platform: 'rn' | 'web';
  joinedAt?: Timestamp;
  // Clone-specific fields
  teamId?: 'A' | 'B';
  hasCloneProfile?: boolean;
  cloneInfo?: string;
}

export interface LobbyState {
  status: 'ready' | 'error';
  roomId: string;
  members: Member[];
  error?: string;
  gameMode?: 'clone' | 'spy' | 'teams';
  gameState?: 'waiting' | 'playing' | 'finished';
}

export interface Room {
  roomId: string;
  active: boolean;
  createdAt: Timestamp;
  lastActivity: Timestamp;
  gameMode?: 'clone' | 'spy' | 'teams';
  gameState?: 'waiting' | 'playing' | 'finished';
  hostId?: string;
}

// Generate room code like "abcd-efgh" (lowercase letters only)
function generateRoomCode(): string {
  const characters = 'abcdefghjkmnpqrstuvwxyz'; // Lowercase letters, removed similar looking (l, o, i)
  let code = '';

  for (let segment = 0; segment < 2; segment++) {
    for (let i = 0; i < 4; i++) {
      code += characters[Math.floor(Math.random() * characters.length)];
    }
    if (segment === 0) code += '-';
  }

  return code;
}

export class LobbyService {
  
  // Create a new room
  static async createRoom(hostId: string, hostName: string): Promise<string> {
    try {
      const roomId = generateRoomCode();
      
      // Create main room document
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, {
        roomId,
        active: true,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        hostId,
        gameMode: null,
        gameState: 'waiting'
      });
      
      // Add host as first member in subcollection
      const memberRef = doc(db, 'rooms', roomId, 'members', hostId);
      await setDoc(memberRef, {
        memberId: hostId,
        displayName: hostName,
        roomId,
        role: 'host',
        platform: 'web',
        joinedAt: serverTimestamp()
      });
      
      console.log(`✅ Room ${roomId} created with host ${hostName}`);
      return roomId;
      
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }
  
  // Join existing room
  static async joinRoom(roomId: string, memberId: string, displayName: string, platform: 'web' | 'rn' = 'web'): Promise<void> {
    try {
      // Check if room exists and is active
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomDoc.data() as Room;
      if (!roomData.active) {
        throw new Error('Room is no longer active');
      }
      
      // Add player to members subcollection
      const memberRef = doc(db, 'rooms', roomId, 'members', memberId);
      await setDoc(memberRef, {
        memberId,
        displayName,
        roomId,
        role: 'player',
        platform,
        joinedAt: serverTimestamp()
      }, { merge: true });
      
      // Update room's last activity
      await updateDoc(roomRef, {
        lastActivity: serverTimestamp()
      });

      console.log(`✅ ${displayName} joined room ${roomId}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }
  
  // Remove member (host only)
  static async removeMember(roomId: string, targetMemberId: string, requestingMemberId: string): Promise<void> {
    try {
      // Check if requester is host
      const requesterRef = doc(db, 'rooms', roomId, 'members', requestingMemberId);
      const requesterDoc = await getDoc(requesterRef);
      
      if (!requesterDoc.exists() || requesterDoc.data()?.role !== 'host') {
        throw new Error('Only the host can remove members');
      }
      
      // Remove from members subcollection
      const targetRef = doc(db, 'rooms', roomId, 'members', targetMemberId);
      await deleteDoc(targetRef);

      console.log(`✅ ${targetMemberId} removed from room ${roomId}`);
      
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }
  
  // Listen to room state changes
  static listenToRoom(roomId: string, callback: (state: LobbyState) => void): () => void {
    const unsubscribers: (() => void)[] = [];
    let isActive = true;
    
    try {
      // Listen to room document
      const roomRef = doc(db, 'rooms', roomId);
      const roomUnsubscribe = onSnapshot(
        roomRef,
        (doc) => {
          if (!isActive) return;
          
          if (!doc.exists()) {
            callback({
              status: 'error',
              roomId,
              members: [],
              error: 'Room not found'
            });
            return;
          }
          
          const roomData = doc.data() as Room;
          if (!roomData.active) {
            callback({
              status: 'error',
              roomId,
              members: [],
              error: 'Room is no longer active'
            });
          }
        },
        (error) => {
          console.error('Room listener error:', error);
          callback({
            status: 'error',
            roomId,
            members: [],
            error: error.message
          });
        }
      );
      unsubscribers.push(roomUnsubscribe);
      
      // Listen to members subcollection
      const membersRef = collection(db, 'rooms', roomId, 'members');
      const membersUnsubscribe = onSnapshot(
        membersRef,
        async (snapshot) => {
          if (!isActive) return;
          
          const members: Member[] = [];
          
          // Get members from subcollection
          snapshot.forEach((doc) => {
            const data = doc.data();
            members.push({
              memberId: data.memberId || doc.id,
              displayName: data.displayName || 'Anonymous',
              roomId: data.roomId,
              role: data.role || 'player',
              platform: data.platform || 'web',
              joinedAt: data.joinedAt,
              teamId: data.teamId,
              hasCloneProfile: data.hasCloneProfile,
              cloneInfo: data.cloneInfo
            });
          });

          // Get room data
          const roomDoc = await getDoc(roomRef);
          const roomData = roomDoc.data() as Room | undefined;
          
          callback({
            status: 'ready',
            roomId,
            members,
            gameMode: roomData?.gameMode,
            gameState: roomData?.gameState
          });
        },
        (error) => {
          console.error('Members listener error:', error);
        }
      );
      unsubscribers.push(membersUnsubscribe);
      
    } catch (error) {
      console.error('Error setting up listeners:', error);
      callback({
        status: 'error',
        roomId,
        members: [],
        error: 'Failed to setup listeners'
      });
    }
    
    // Return cleanup function
    return () => {
      isActive = false;
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
    };
  }
  
  // Get all members in a room
  static async getRoomMembers(roomId: string): Promise<Member[]> {
    try {
      const members: Member[] = [];
      
      // Get from members subcollection
      const membersRef = collection(db, 'rooms', roomId, 'members');
      const membersSnapshot = await getDocs(membersRef);
      
      membersSnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          memberId: data.memberId || doc.id,
          displayName: data.displayName || 'Anonymous',
          roomId: data.roomId,
          role: data.role || 'player',
          platform: data.platform || 'web',
          joinedAt: data.joinedAt,
          teamId: data.teamId,
          hasCloneProfile: data.hasCloneProfile,
          cloneInfo: data.cloneInfo
        });
      });
      
      return members;
      
    } catch (error) {
      console.error('Error getting room members:', error);
      return [];
    }
  }
  
  // Update member data (for Clone profile, team assignment, etc.)
  static async updateMember(roomId: string, memberId: string, updates: Partial<Member>): Promise<void> {
    try {
      console.log('LobbyService.updateMember called:', { roomId, memberId, updates });
      
      const memberRef = doc(db, 'rooms', roomId, 'members', memberId);
      
      // Check if member document exists first
      const memberDoc = await getDoc(memberRef);
      if (!memberDoc.exists()) {
        console.error(`Member document does not exist for ${memberId} in room ${roomId}`);
        // Try to create it if it doesn't exist
        await setDoc(memberRef, {
          memberId,
          roomId,
          ...updates,
          lastUpdated: serverTimestamp()
        });
        console.log('Created missing member document');
      } else {
        await updateDoc(memberRef, {
          ...updates,
          lastUpdated: serverTimestamp()
        });
        console.log('Updated existing member document');
      }

    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }
  
  // Close room (host only)
  static async closeRoom(roomId: string, requestingMemberId: string): Promise<void> {
    try {
      // Check if requester is host
      const requesterRef = doc(db, 'rooms', roomId, 'members', requestingMemberId);
      const requesterDoc = await getDoc(requesterRef);
      
      if (!requesterDoc.exists() || requesterDoc.data()?.role !== 'host') {
        throw new Error('Only the host can close the room');
      }
      
      // Mark room as inactive
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        active: false,
        closedAt: serverTimestamp()
      });
      
      console.log(`✅ Room ${roomId} closed`);
      
    } catch (error) {
      console.error('Error closing room:', error);
      throw error;
    }
  }
}

export default LobbyService;