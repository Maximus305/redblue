import React from 'react';

export function VerifyingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="text-center">
        <style>
          {`
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0); }
              40% { transform: scale(1); }
            }
          `}
        </style>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#0000FF',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
        <p
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#0000FF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
