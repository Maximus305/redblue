import React from 'react';

interface QuestionDisplayProps {
  question: string;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '24px',
      borderRadius: '20px',
      marginBottom: '30px'
    }}>
      <p style={{
        fontSize: '24px',
        color: 'black',
        margin: 0,
        lineHeight: '1.4',
        fontWeight: '600',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        &ldquo;{question}&rdquo;
      </p>
    </div>
  );
};

export default QuestionDisplay;
