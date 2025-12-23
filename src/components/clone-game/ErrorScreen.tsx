import React from 'react';
import { getErrorMessage } from '@/utils/errorMessages';
import { Warning } from '@phosphor-icons/react';

interface ErrorScreenProps {
  error: string;
  roomCode: string;
}

export function ErrorScreen({ error, roomCode }: ErrorScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <div
        className="max-w-md w-full text-center p-8"
        style={{
          backgroundColor: '#1A1A1A',
          borderRadius: '24px',
          border: '2px solid #DC2626',
        }}
      >
        <div className="flex justify-center mb-6">
          <Warning size={64} weight="fill" color="#DC2626" />
        </div>
        <h1
          className="mb-3"
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#DC2626',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Connection Error
        </h1>
        <p
          className="mb-4"
          style={{
            fontSize: '18px',
            color: '#E5E5E5',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {getErrorMessage(error)}
        </p>
        <p
          className="mb-8"
          style={{
            fontSize: '14px',
            color: '#6B7280',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Room code: {roomCode}
        </p>
        <button
          onClick={() => (window.location.href = '/')}
          className="transition-all"
          style={{
            height: '56px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            borderRadius: '28px',
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            border: 'none',
            cursor: 'pointer',
            padding: '0 48px',
          }}
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
