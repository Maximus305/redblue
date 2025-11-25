import { ErrorCode } from '@/types/clone';

export function getErrorMessage(code: ErrorCode | string): string {
  const messages: Record<ErrorCode, string> = {
    ROOM_NOT_FOUND: 'Room not found. Please check the room code.',
    ROOM_CLOSED: 'This room has ended or is no longer active.',
    ROOM_FULL: 'This room is full.',
    PERMISSION_DENIED: 'Permission denied.',
    PHASE_INVALID: 'Invalid game phase.',
    DEADLINE_PASSED: 'Voting closed.',
    ALREADY_SET: 'Choice already made.',
    VERSION_MISMATCH: 'Version mismatch. Please refresh.'
  };

  return messages[code as ErrorCode] || code;
}
