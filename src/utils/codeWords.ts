import { ReactElement, createElement } from 'react';

type ImageMappingType = Record<string, string>;

export const IMAGE_MAPPINGS: ImageMappingType = {
  'Atlas': '/images/atlas.png',
  'Balloon': '/images/ballon.png',
  'Bamboo': '/images/bamboo.png',
  'Basket': '/images/basket.png',
  'Bell': '/images/bell.png',
  'Boat': '/images/boat.png',
  'Bullet': '/images/bullet.png',
  'Camera': '/images/camera.png',
  'Castle': '/images/castle.png',
  'Chair': '/images/chair.png',
  'Clock': '/images/clock.png',
  'Diamond': '/images/diamond.png',
  'Hammer': '/images/hammer.png',
  'Lantern': '/images/lantern.png',
  'Lock': '/images/lock.png',
  'Ring': '/images/ring.png',
  'Rocket': '/images/rocket.png'
};

export const ICON_WORDS = Object.keys(IMAGE_MAPPINGS);

export function getRandomIcons() {
  const shuffled = [...ICON_WORDS].sort(() => Math.random() - 0.5);
  return {
    evenCodeIcon: shuffled[0],
    oddCodeIcon: shuffled[1]
  };
}

interface IconForWordProps {
  word: string | null;
  size?: number;
  className?: string;
}

export function IconForWord({ word, size = 200, className = "" }: IconForWordProps): ReactElement | null {
  if (!word || !IMAGE_MAPPINGS[word]) return null;
  
  return createElement('img', {
    src: IMAGE_MAPPINGS[word],
    alt: word,
    className: `w-full h-full object-contain ${className}`,
    style: { maxWidth: size, maxHeight: size }
  });
}