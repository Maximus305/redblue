import React from 'react';
import TeamBadge from './TeamBadge';

interface LoadingScreenProps {
  teamId?: 'A' | 'B';
  roundNumber?: number;
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  teamId,
  roundNumber,
  message = "Waiting for the other players to get it together."
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{backgroundColor: '#F5F5F5'}}>
      <div className="w-full max-w-md" style={{textAlign: 'center'}}>
        {/* Round Number */}
        {roundNumber && roundNumber > 0 && (
          <h2 style={{
            fontSize: '48px',
            color: 'black',
            fontWeight: 'bold',
            margin: '0 0 40px 0',
            letterSpacing: '2px'
          }}>
            Round {roundNumber}
          </h2>
        )}

        {/* Team Badge */}
        {teamId && (
          <div style={{ marginBottom: '60px' }}>
            <TeamBadge teamId={teamId} size="large" />
          </div>
        )}

        {/* Loading Spinner */}
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '60px'}}>
          <div style={{
            width: '120px',
            height: '120px',
            border: '8px solid rgba(0, 69, 255, 0.2)',
            borderTop: '8px solid #0045FF',
            borderRadius: '50%'
          }} className="animate-spin"></div>
        </div>

        {/* Message */}
        <p style={{
          color: 'black',
          fontSize: '32px',
          fontWeight: '600',
          margin: 0,
          lineHeight: '1.4',
          maxWidth: '600px',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
