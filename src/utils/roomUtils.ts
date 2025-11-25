// utils/roomUtils.ts
import { doc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

/**
 * Generates a random room ID with configurable length
 * Format: XXXX-XXXX where X is an uppercase letter or number
 */
export function generateRoomId(segmentLength: number = 4, numberOfSegments: number = 2): string {
    const characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Uppercase letters and numbers, removed similar looking (I, L, O, 0, 1)
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
   * Validates a room ID format - uppercase letters and numbers
   */
  export function validateRoomId(roomId: string): boolean {
    const roomIdRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return roomIdRegex.test(roomId);
  }

  /**
   * Formats a room ID to ensure consistent display
   * Normalizes to uppercase and adds dash after 4 chars
   */
  export function formatRoomId(roomId: string | undefined): string {
    // Handle undefined or null roomId
    if (!roomId) {
      return '';
    }

    // Remove any non-alphanumeric characters and convert to uppercase
    const cleanedId = roomId.replace(/[^a-z0-9]/gi, '').toUpperCase();

    // If we have at least 8 characters, format as XXXX-XXXX
    if (cleanedId.length >= 8) {
      return `${cleanedId.slice(0, 4)}-${cleanedId.slice(4, 8)}`;
    }
    // If we have at least 4 characters, format as XXXX-XXXX (pad if needed)
    else if (cleanedId.length >= 4) {
      const padded = cleanedId.padEnd(8, 'A');
      return `${padded.slice(0, 4)}-${padded.slice(4, 8)}`;
    }
    // If we have less than 4 characters, just return as is
    else {
      return cleanedId;
    }
  }

  /**
   * Normalizes room code input (Repo B spec - Appendix A)
   * Auto-inserts dash after 4 chars and uppercases
   */
  export function normalizeRoomCode(input: string): string {
    const raw = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
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

    // Validate format - uppercase letters and numbers
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(roomCode)) {
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