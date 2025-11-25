import React from 'react';
import { getErrorMessage } from '@/utils/errorMessages';
import { colors, typography, borderRadius, spacing } from '@/styles/clone-theme';

interface ErrorScreenProps {
  error: string;
  roomCode: string;
}

export function ErrorScreen({ error, roomCode }: ErrorScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div
        className="max-w-md w-full text-center p-8"
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: borderRadius.lg,
        }}
      >
        <div className="text-6xl mb-6">⚠️</div>
        <h1
          className="mb-3"
          style={{
            ...typography.large,
            color: colors.error,
            fontFamily: typography.fontFamily,
          }}
        >
          Connection Error
        </h1>
        <p
          className="mb-4"
          style={{
            fontSize: typography.bodyLarge.fontSize,
            color: colors.textSecondary,
            fontFamily: typography.fontFamily,
          }}
        >
          {getErrorMessage(error)}
        </p>
        <p
          className="mb-8"
          style={{
            fontSize: typography.small.fontSize,
            color: colors.textTertiary,
            fontFamily: typography.fontFamily,
          }}
        >
          Room code: {roomCode}
        </p>
        <button
          onClick={() => (window.location.href = '/')}
          className="transition-all"
          style={{
            height: '56px',
            backgroundColor: colors.primaryBlue,
            color: '#FFFFFF',
            borderRadius: borderRadius.full,
            fontSize: typography.bodyLarge.fontSize,
            fontWeight: 700,
            fontFamily: typography.fontFamily,
            border: 'none',
            cursor: 'pointer',
            padding: `0 ${spacing.xxxl}`,
          }}
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
