export const CODE_WORDS = [
    'Anchor', 'Atlas', 'Bamboo', 'Brick', 'Bridge', 'Bullet', 'Camera', 'Candle',
    'Cloud', 'Compass', 'Diamond', 'Feather', 'Castle', 'Hammer', 'Iceberg',
    'Lantern', 'Lock', 'Mask', 'Mirror', 'Needle', 'Ocean', 'Pyramid', 'Ring',
    'Rocket', 'Shadow', 'Shield', 'Tower', 'Arrow', 'Balloon', 'Basket', 'Bell',
    'Boat', 'Book', 'Bottle', 'Box', 'Chain', 'Chair', 'Clock', 'Coin', 'Cup',
    'Door', 'Fence', 'Flag', 'Rose', 'Hat', 'Key', 'Ladder', 'Leaf', 'Moon',
    'Plane', 'Star', 'Tent', 'Sky', 'Cake', 'Snowflake'
  ];
  
  export function getRandomWords(): { evenCodeWord: string; oddCodeWord: string } {
    const shuffled = [...CODE_WORDS].sort(() => Math.random() - 0.5);
    return {
      evenCodeWord: shuffled[0],
      oddCodeWord: shuffled[1]
    };
  }