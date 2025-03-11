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
  'Rocket': '/images/rocket.png',
  'Car': '/images/car.png',
  'Hack': '/images/watch.png',
  'Key': '/images/key.png'
};

export const ICON_WORDS = Object.keys(IMAGE_MAPPINGS);

// Keep track of when icons were last used
const iconUsageHistory: Record<string, number> = {};
let currentRound = 1;

// Initialize usage history for all icons
ICON_WORDS.forEach(icon => {
  iconUsageHistory[icon] = 0; // Default to never used (0 rounds ago)
});

// Function to calculate weight based on rounds since last use
function getIconWeight(roundsAgo: number): number {
  if (roundsAgo === 1) return 0.25; // 75% reduction if used in last round
  if (roundsAgo === 2) return 0.5;  // 50% reduction if used 2 rounds ago
  if (roundsAgo === 3) return 0.75; // 25% reduction if used 3 rounds ago
  return 1; // Full chance if used 4+ rounds ago or never used
}

// Function to select an icon based on weighted probability
function selectWeightedIcon(excludeIcons: string[] = []): string {
  // Get all available icons (excluding any that should be excluded)
  const availableIcons = ICON_WORDS.filter(icon => !excludeIcons.includes(icon));
  
  if (availableIcons.length === 0) return ICON_WORDS[0]; // Fallback
  
  // Calculate weights for each icon
  const weights = availableIcons.map(icon => {
    const roundsAgo = iconUsageHistory[icon] === 0 ? 
      4 : // If never used, treat as 4+ rounds ago
      currentRound - iconUsageHistory[icon];
    return getIconWeight(roundsAgo);
  });
  
  // Calculate total weight
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  // Generate random number
  let random = Math.random() * totalWeight;
  
  // Select icon based on weights
  for (let i = 0; i < availableIcons.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return availableIcons[i];
    }
  }
  
  // Fallback
  return availableIcons[availableIcons.length - 1];
}

export function getRandomIcons() {
  // Select first icon with weighted probability
  const evenCodeIcon = selectWeightedIcon();
  
  // Select second icon, excluding the first
  const oddCodeIcon = selectWeightedIcon([evenCodeIcon]);
  
  // Update usage history for selected icons
  iconUsageHistory[evenCodeIcon] = currentRound;
  iconUsageHistory[oddCodeIcon] = currentRound;
  
  // Increment round for next selection
  currentRound++;
  
  return {
    evenCodeIcon,
    oddCodeIcon
  };
}

// Reset the icon usage history and counter
export function resetIconHistory() {
  ICON_WORDS.forEach(icon => {
    iconUsageHistory[icon] = 0;
  });
  currentRound = 1;
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