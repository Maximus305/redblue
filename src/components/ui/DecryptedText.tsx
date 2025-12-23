'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  animateOn?: 'view' | 'hover' | 'none';
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  characters?: string;
  onComplete?: () => void;
}

export function DecryptedText({
  text,
  speed = 50,
  className = '',
  style = {},
  animateOn = 'view',
  sequential = true,
  revealDirection = 'start',
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
  onComplete,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const getRandomChar = useCallback(() => characters[Math.floor(Math.random() * characters.length)], [characters]);

  const animate = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    const textArray = text.split('');
    const revealed = new Array(text.length).fill(false);
    let currentDisplay = textArray.map(() => getRandomChar());

    const getNextIndex = (revealedCount: number) => {
      if (revealDirection === 'start') {
        return revealedCount;
      } else if (revealDirection === 'end') {
        return text.length - 1 - revealedCount;
      } else {
        const middle = Math.floor(text.length / 2);
        const offset = Math.floor(revealedCount / 2);
        if (revealedCount % 2 === 0) {
          return middle - offset;
        } else {
          return middle + offset;
        }
      }
    };

    let revealedCount = 0;
    const scrambleInterval = setInterval(() => {
      currentDisplay = currentDisplay.map((_, i) => {
        if (revealed[i]) return textArray[i];
        if (textArray[i] === ' ') return ' ';
        return getRandomChar();
      });
      setDisplayText(currentDisplay.join(''));
    }, 30);

    const revealInterval = setInterval(() => {
      if (revealedCount >= text.length) {
        clearInterval(revealInterval);
        clearInterval(scrambleInterval);
        setDisplayText(text);
        setIsAnimating(false);
        setHasAnimated(true);
        onComplete?.();
        return;
      }

      if (sequential) {
        const idx = getNextIndex(revealedCount);
        if (idx >= 0 && idx < text.length) {
          revealed[idx] = true;
        }
        revealedCount++;
      } else {
        const unrevealed = revealed.map((r, i) => (!r ? i : -1)).filter(i => i !== -1);
        if (unrevealed.length > 0) {
          const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          revealed[randomIdx] = true;
          revealedCount++;
        }
      }
    }, speed);
  }, [text, speed, sequential, revealDirection, getRandomChar, isAnimating, onComplete]);

  useEffect(() => {
    if (animateOn === 'view' && !hasAnimated) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animate();
            }
          });
        },
        { threshold: 0.1 }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }
  }, [animateOn, hasAnimated, animate]);

  useEffect(() => {
    if (animateOn === 'none') {
      setDisplayText(text);
      setHasAnimated(true);
      return;
    }
    if (!hasAnimated && !isAnimating) {
      setDisplayText(text.split('').map(c => c === ' ' ? ' ' : getRandomChar()).join(''));
    }
  }, [text, hasAnimated, isAnimating, getRandomChar, animateOn]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' && !isAnimating) {
      setHasAnimated(false);
      animate();
    }
  };

  return (
    <span
      ref={ref}
      className={className}
      style={{ ...style, fontFamily: 'monospace' }}
      onMouseEnter={handleMouseEnter}
    >
      {displayText || text}
    </span>
  );
}
