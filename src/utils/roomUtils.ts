// utils/roomUtils.ts
import { doc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

/**
 * Generates a random room ID with configurable length
 * Format: xxxx-xxxx where x is a lowercase letter
 */
export function generateRoomId(segmentLength: number = 4, numberOfSegments: number = 2): string {
    const characters = 'abcdefghjkmnpqrstuvwxyz'; // Lowercase letters only, removed similar looking (l, o, i)
    let roomId = '';

    for (let segment = 0; segment < numberOfSegments; segment++) {
      for (let i = 0; i < segmentLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        roomId += characters[randomIndex];
      }

      if (segment < numberOfSegments - 1) {
        roomId += '-';
      }
    }

    return roomId;
  }

  /**
   * Validates a room ID format - lowercase letters only
   */
  export function validateRoomId(roomId: string): boolean {
    const roomIdRegex = /^[a-z]{4}-[a-z]{4}$/;
    return roomIdRegex.test(roomId);
  }

  /**
   * Formats a room ID to ensure consistent display
   * Normalizes to lowercase and adds dash after 4 chars
   */
  export function formatRoomId(roomId: string | undefined): string {
    // Handle undefined or null roomId
    if (!roomId) {
      return '';
    }

    // Remove any non-letter characters and convert to lowercase
    const cleanedId = roomId.replace(/[^a-z]/gi, '').toLowerCase();

    // If we have at least 8 characters, format as xxxx-xxxx
    if (cleanedId.length >= 8) {
      return `${cleanedId.slice(0, 4)}-${cleanedId.slice(4, 8)}`;
    }
    // If we have at least 4 characters, format as xxxx-xxxx (pad if needed)
    else if (cleanedId.length >= 4) {
      const padded = cleanedId.padEnd(8, 'a');
      return `${padded.slice(0, 4)}-${padded.slice(4, 8)}`;
    }
    // If we have less than 4 characters, just return as is
    else {
      return cleanedId;
    }
  }

  /**
   * Normalizes room code input (Repo B spec - Appendix A)
   * Auto-inserts dash after 4 chars and lowercases
   */
  export function normalizeRoomCode(input: string): string {
    const raw = input.trim().toLowerCase().replace(/[^a-z-]/g, '');
    return raw.length === 8 && !raw.includes('-')
      ? `${raw.slice(0, 4)}-${raw.slice(4)}`
      : raw;
  }

  /**
   * Known-good join helper (Repo B spec - Appendix A)
   * Signs in anonymously BEFORE any Firestore read
   */
  export async function tryJoinRoom(roomCodeInput: string): Promise<{ roomCode: string; room: Record<string, unknown> }> {
    const roomCode = normalizeRoomCode(roomCodeInput);

    // Validate format
    if (!/^[a-z]{4}-[a-z]{4}$/.test(roomCode)) {
      throw new Error('INVALID_CODE');
    }

    // MUST be signed in before reading (Repo B requirement)
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    // Read room document
    const ref = doc(db, 'rooms', roomCode);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error('ROOM_NOT_FOUND');
    }

    return { roomCode, room: snap.data() };
  }