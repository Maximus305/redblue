import {
    Anchor, MapPin, Leaf, Footprints, Target, Camera, Flame,
    Cloud, Compass, Gem, Feather, Castle, Hammer, Mountain,
    Lamp,  Drama, Waves, 
    Rocket, Ghost, Shield, TowerControl, ShoppingCart, CircleDashed, Bell,
    Ship, Book, Wine, Package, Link, Armchair, Clock, Coins, Coffee,
    DoorOpen, Fence, Flag, Flower2, Crown, Key, BrickWall, Moon,
    Plane, Star, Tent, Cake, Snowflake,
    LucideProps,Volleyball
    ,LockOpen
  } from 'lucide-react';
  import { ComponentType, ReactElement, createElement } from 'react';
  
  type IconType = ComponentType<LucideProps>;
  type IconMappingType = Record<string, IconType>;
  
  export const ICON_MAPPINGS: IconMappingType = {
    'Anchor': Anchor,
    'Atlas': MapPin,
    'Bamboo': Leaf,
    'Brick': BrickWall,
    'Bridge': Footprints,
    'Bullet': Target,
    'Camera': Camera,
    'Candle': Flame,
    'Cloud': Cloud,
    'Compass': Compass,
    'Diamond': Gem,
    'Feather': Feather,
    'Castle': Castle,
    'Hammer': Hammer,
    'Iceberg': Mountain,
    'Lantern': Lamp,
    'Lock': LockOpen,
    'Mask': Drama,
    'Ocean': Waves,
    'Volleyball': Volleyball,
    'Rocket': Rocket,
    'Shadow': Ghost,
    'Shield': Shield,
    'Tower': TowerControl,
    'Balloon': CircleDashed,
    'Basket': ShoppingCart,
    'Bell': Bell,
    'Boat': Ship,
    'Book': Book,
    'Bottle': Wine,
    'Box': Package,
    'Chain': Link,
    'Chair': Armchair,
    'Clock': Clock,
    'Coin': Coins,
    'Cup': Coffee,
    'Door': DoorOpen,
    'Fence': Fence,
    'Flag': Flag,
    'Rose': Flower2,
    'Hat': Crown,
    'Key': Key,
    'Leaf': Leaf,
    'Moon': Moon,
    'Plane': Plane,
    'Star': Star,
    'Tent': Tent,
    'Cake': Cake,
    'Snowflake': Snowflake
  };
  
  export const ICON_WORDS = Object.keys(ICON_MAPPINGS);
  
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
  
  export function IconForWord({ word, size = 24, className = "" }: IconForWordProps): ReactElement | null {
    if (!word) return null;
    
    // Type assertion to handle the dynamic lookup
    const Component = ICON_MAPPINGS[word] as IconType;
    if (!Component) return null;
    
    return createElement(Component, { size, className });
  }