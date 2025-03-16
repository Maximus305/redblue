// utils/roomUtils.ts

/**
 * Generates a random room ID with configurable length
 * Format: XXXX-XXXX where X is an alphanumeric character
 */
export function generateRoomId(segmentLength: number = 4, numberOfSegments: number = 2): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters (0, 1, I, O)
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
   * Validates a room ID format
   */
  export function validateRoomId(roomId: string): boolean {
    // Adjust regex based on your desired format
    const roomIdRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return roomIdRegex.test(roomId);
  }
  
  /**
   * Formats a room ID to ensure consistent display
   * (e.g., converting lowercase to uppercase, adding hyphens if missing)
   */
  export function formatRoomId(roomId: string | undefined): string {
    console.log("formatRoomId input:", roomId);
    
    // Handle undefined or null roomId
    if (!roomId) {
      console.log("roomId is empty or undefined, returning empty string");
      return '';
    }
  
    // Remove any non-alphanumeric characters and convert to uppercase
    console.log("roomId before cleaning:", roomId);
    const cleanedId = roomId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    console.log("cleanedId after replacing non-alphanumeric:", cleanedId);
  
    // If we have at least 8 characters, format as XXXX-XXXX
    if (cleanedId.length >= 8) {
      const formatted = `${cleanedId.slice(0, 4)}-${cleanedId.slice(4, 8)}`;
      console.log("Returning formatted (8+ chars):", formatted);
      return formatted;
    } 
    // If we have at least 4 characters, pad with zeros and format
    else if (cleanedId.length >= 4) {
      const padded = cleanedId.padEnd(8, '0');
      const formatted = `${padded.slice(0, 4)}-${padded.slice(4, 8)}`;
      console.log("Returning formatted (4-7 chars, padded):", formatted);
      return formatted;
    }
    // If we have less than 4 characters, just return as is
    else {
      console.log("Returning as is (less than 4 chars):", cleanedId);
      return cleanedId;
    }
  }