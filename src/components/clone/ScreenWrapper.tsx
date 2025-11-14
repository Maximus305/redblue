import React from 'react';

interface ScreenWrapperProps {
  title: string;
  children: React.ReactNode;
  bottomButton?: {
    text: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ title, children, bottomButton }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: '30px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'black',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '1px'
          }}>{title}</h1>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 0',
          marginBottom: '30px'
        }}>
          {children}
        </div>

        {/* Bottom Button */}
        {bottomButton && (
          <button
            onClick={bottomButton.onClick}
            disabled={bottomButton.disabled || bottomButton.loading}
            style={{
              width: '100%',
              backgroundColor: bottomButton.disabled || bottomButton.loading ? 'rgba(0, 69, 255, 0.5)' : '#0045FF',
              color: 'white',
              padding: '20px',
              borderRadius: '50px',
              border: 'none',
              cursor: bottomButton.disabled || bottomButton.loading ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              opacity: bottomButton.disabled || bottomButton.loading ? 0.6 : 1
            }}
          >
            {bottomButton.loading ? 'Loading...' : bottomButton.text}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScreenWrapper;
