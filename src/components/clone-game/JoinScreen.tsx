import React from 'react';
import { JoinScreenProps } from '@/types/clone';
import { getErrorMessage } from '@/utils/errorMessages';

export function JoinScreen({
  name,
  setName,
  onJoin,
  loading,
  error
}: JoinScreenProps) {
  const isValid = name.trim().length >= 2 && name.trim().length <= 20;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="w-full max-w-md">
        {/* Title */}
        <h1
          className="text-center mb-2"
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#0000FF',
            fontFamily: 'Ojuju, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          CLONE
        </h1>

        {/* Subtitle */}
        <p
          className="text-center mb-8"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#0000FF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Enter your name to join
        </p>

        {/* Name Input */}
        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name..."
            maxLength={20}
            className="w-full focus:outline-none"
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #E5E7EB',
              borderRadius: '20px',
              padding: '20px 24px',
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#000000',
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4"
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: '12px',
              border: '2px solid #FECACA',
            }}
          >
            <p
              className="text-center"
              style={{
                fontWeight: 600,
                fontSize: '16px',
                color: '#DC2626',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {getErrorMessage(error)}
            </p>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={onJoin}
          disabled={loading || !isValid}
          className="w-full transition-all"
          style={{
            backgroundColor: !loading && isValid ? '#0000FF' : '#E5E7EB',
            color: !loading && isValid ? '#FFFFFF' : '#000000',
            border: '2px solid',
            borderColor: !loading && isValid ? '#0000FF' : '#E5E7EB',
            borderRadius: '100px',
            fontSize: '24px',
            fontWeight: 900,
            cursor: loading || !isValid ? 'not-allowed' : 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '20px 0',
          }}
        >
          {loading ? 'JOINING...' : 'JOIN GAME'}
        </button>
      </div>
    </div>
  );
}
