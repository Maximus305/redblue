import React from 'react';
import Image from 'next/image';
import { JoinScreenProps } from '@/types/clone';
import { getErrorMessage } from '@/utils/errorMessages';

export function JoinScreen({
  roomCode,
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
        {/* Room Code */}
        <p
          className="text-center mb-4"
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#000000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          ROOM: {roomCode}
        </p>

        {/* Pig Image */}
        <div className="flex justify-center mb-8">
          <Image
            src="/pigimage.png"
            alt="Clone"
            width={320}
            height={200}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Logo/Title */}
        <h1
          className="text-center mb-8"
          style={{
            fontSize: '96px',
            fontWeight: 900,
            color: '#000000',
            fontFamily: 'Ojuju, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          CLONE
        </h1>

        {/* Name Input */}
        <div className="mb-4">
          <label
            className="block mb-2"
            style={{
              fontSize: '24px',
              fontWeight: 400,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Type a name:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jason..."
            maxLength={20}
            className="w-full focus:outline-none"
            style={{
              backgroundColor: '#FFFFFF',
              border: '3px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px 24px',
              fontSize: '24px',
              fontWeight: 400,
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
            }}
          >
            <p
              className="text-center"
              style={{
                fontWeight: 500,
                fontSize: '20px',
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
            height: '80px',
            backgroundColor: !loading && isValid ? '#0045FF' : '#A8A8AD',
            color: '#FFFFFF',
            borderRadius: '40px',
            fontSize: '28px',
            fontWeight: 600,
            border: 'none',
            cursor: loading || !isValid ? 'not-allowed' : 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {loading ? 'Joining...' : 'Join'}
        </button>
      </div>
    </div>
  );
}
