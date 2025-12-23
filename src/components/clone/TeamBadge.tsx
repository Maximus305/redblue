import React from 'react';
import { getTeamColor, getTeamImage } from '@/services/clone/index';

interface TeamBadgeProps {
  teamId: 'A' | 'B';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const TeamBadge: React.FC<TeamBadgeProps> = ({ teamId, size = 'medium', showLabel = true }) => {
  const sizes = {
    small: { image: '60px', text: '20px' },
    medium: { image: '100px', text: '24px' },
    large: { image: '120px', text: '36px' }
  };

  const currentSize = sizes[size];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px'
    }}>
      <img
        src={getTeamImage(teamId)}
        alt={`Team ${getTeamColor(teamId)}`}
        style={{
          height: currentSize.image,
          width: 'auto',
          objectFit: 'contain'
        }}
      />
      {showLabel && (
        <p style={{
          fontSize: currentSize.text,
          color: 'black',
          fontWeight: 'bold',
          margin: 0
        }}>
          Team {getTeamColor(teamId)}
        </p>
      )}
    </div>
  );
};

export default TeamBadge;
