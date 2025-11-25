import React from 'react';
import { colors, typography } from '@/styles/clone-theme';

export function VerifyingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6"
          style={{ borderColor: colors.primaryBlue }}
        />
        <p
          className="text-2xl font-semibold"
          style={{
            ...typography.medium,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
          }}
        >
          Verifying room...
        </p>
      </div>
    </div>
  );
}
