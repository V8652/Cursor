
import { 
  ShoppingCart, 
  Home, 
  Utensils, 
  Car, 
  PiggyBank, 
  Briefcase, 
  Dumbbell, 
  Shirt, 
  Plane, 
  Bus, 
  Film, 
  Gift, 
  Heart, 
  BookOpen, 
  Smartphone, 
  Activity, 
  Coffee,
  Landmark,
  CreditCard,
  BadgeDollarSign,
  Building,
  CircleDollarSign,
  DollarSign,
  LucideIcon,
  Wallet,
  Receipt,
  ShoppingBag,
  Gamepad2,
  Music,
  Gem,
  GraduationCap,
  SunMedium,
  Hammer,
  Lightbulb,
  Fuel,
  Pill,
  Wine,
  Baby,
  Globe,
  Wifi,
  Network,
  BellRing,
  Leaf,
  Coins,
  Newspaper,
  Percent,
  Laugh
} from 'lucide-react';

// Map of category names to icon components
export type CategoryIconName = 
  'DollarSign' | 'ShoppingCart' | 'Home' | 'Utensils' | 'Car' | 'PiggyBank' | 'Briefcase' |
  'Dumbbell' | 'Shirt' | 'Plane' | 'Bus' | 'Film' | 'Gift' | 'Heart' | 'BookOpen' | 'Smartphone' | 
  'Activity' | 'Coffee' | 'Landmark' | 'CreditCard' | 'BadgeDollarSign' | 'Building' | 
  'CircleDollarSign' | 'Wallet' | 'Receipt' | 'ShoppingBag' | 'Gamepad2' | 'Music' | 'Gem' |
  'GraduationCap' | 'SunMedium' | 'Hammer' | 'Lightbulb' | 'Fuel' | 'Pill' | 'Wine' | 'Baby' |
  'Globe' | 'Wifi' | 'Network' | 'BellRing' | 'Leaf' | 'Coins' | 'Newspaper' | 'Percent' | 'Laugh';

export const categoryIconMap: Record<CategoryIconName, LucideIcon> = {
  DollarSign,
  ShoppingCart,
  Home,
  Utensils,
  Car,
  PiggyBank,
  Briefcase,
  Dumbbell,
  Shirt,
  Plane,
  Bus,
  Film,
  Gift,
  Heart,
  BookOpen,
  Smartphone,
  Activity,
  Coffee,
  Landmark,
  CreditCard,
  BadgeDollarSign,
  Building,
  CircleDollarSign,
  Wallet,
  Receipt,
  ShoppingBag,
  Gamepad2,
  Music,
  Gem,
  GraduationCap,
  SunMedium,
  Hammer,
  Lightbulb,
  Fuel,
  Pill,
  Wine,
  Baby,
  Globe,
  Wifi,
  Network,
  BellRing,
  Leaf,
  Coins,
  Newspaper,
  Percent,
  Laugh
};

// Get all available icon names
export const getAllCategoryIcons = (): CategoryIconName[] => {
  return Object.keys(categoryIconMap) as CategoryIconName[];
};

/**
 * Get an appropriate icon component for a given category
 */
export const getCategoryIcon = (category?: string): LucideIcon => {
  if (!category) return DollarSign;
  
  const lowerCategory = category.toLowerCase();
  
  // Expense categories
  if (lowerCategory === 'groceries' || lowerCategory === 'shopping') return ShoppingCart;
  if (lowerCategory === 'housing' || lowerCategory === 'rent' || lowerCategory === 'mortgage') return Home;
  if (lowerCategory === 'food' || lowerCategory === 'restaurants' || lowerCategory === 'dining') return Utensils;
  if (lowerCategory === 'transportation' || lowerCategory === 'auto') return Car;
  if (lowerCategory === 'savings') return PiggyBank;
  if (lowerCategory === 'work' || lowerCategory === 'business') return Briefcase;
  if (lowerCategory === 'health' || lowerCategory === 'fitness') return Dumbbell;
  if (lowerCategory === 'clothing') return Shirt;
  if (lowerCategory === 'travel') return Plane;
  if (lowerCategory === 'transit') return Bus;
  if (lowerCategory === 'entertainment') return Film;
  if (lowerCategory === 'gifts') return Gift;
  if (lowerCategory === 'personal') return Heart;
  if (lowerCategory === 'education') return BookOpen;
  if (lowerCategory === 'technology' || lowerCategory === 'electronics') return Smartphone;
  if (lowerCategory === 'medical') return Activity;
  if (lowerCategory === 'coffee') return Coffee;
  if (lowerCategory === 'insurance') return Building;
  if (lowerCategory === 'utilities' || lowerCategory === 'utilities/hardware') return Building;
  if (lowerCategory === 'credit card' || lowerCategory === 'credit-card') return CreditCard;
  
  // Income categories
  if (lowerCategory === 'salary') return Briefcase;
  if (lowerCategory === 'investment') return PiggyBank;
  if (lowerCategory === 'bonus') return BadgeDollarSign;
  if (lowerCategory === 'dividends') return CircleDollarSign;
  if (lowerCategory === 'interest') return Landmark;
  
  // Default
  return DollarSign;
};
