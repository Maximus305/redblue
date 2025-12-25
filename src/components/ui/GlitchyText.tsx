'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

interface GlitchyTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number; // ms between font changes
}

// Font config with scale factors to normalize sizes (some fonts render larger)
const FONTS: { family: string; scale: number }[] = [
  { family: 'Times New Roman, serif', scale: 1 },
  { family: 'Rock Salt, cursive', scale: 0.7 },
  { family: 'var(--font-barrio)', scale: 0.85 },
  { family: 'Courier New, monospace', scale: 0.9 },
  { family: 'Georgia, serif', scale: 1 },
  { family: 'Impact, sans-serif', scale: 0.85 },
  { family: 'Comic Sans MS, cursive', scale: 0.9 },
  { family: 'Arial Black, sans-serif', scale: 0.85 },
  { family: 'Papyrus, fantasy', scale: 0.8 },
  { family: 'Brush Script MT, cursive', scale: 0.9 },
];

export function GlitchyText({ text, className = '', style = {}, speed = 150 }: GlitchyTextProps) {
  const [letterFontIndices, setLetterFontIndices] = useState<number[]>(() =>
    text.split('').map(() => Math.floor(Math.random() * FONTS.length))
  );
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const animate = useCallback((timestamp: number) => {
    if (timestamp - lastUpdateRef.current >= speed) {
      setLetterFontIndices(
        text.split('').map(() => Math.floor(Math.random() * FONTS.length))
      );
      lastUpdateRef.current = timestamp;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [text, speed]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [animate]);

  return (
    <span
      className={className}
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {text.split('').map((letter, index) => {
        const fontConfig = FONTS[letterFontIndices[index]] || FONTS[0];
        return (
          <span
            key={index}
            style={{
              fontFamily: fontConfig.family,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${fontConfig.scale}em`,
              width: '0.8em',
              overflow: 'hidden',
            }}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}
