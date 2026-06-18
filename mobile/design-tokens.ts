import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const BASE_WIDTH = 390; // iPhone 15 Pro base width

// Scales a raw number proportionally to the screen width
export const rs = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel((size * width) / BASE_WIDTH));

// Scales font sizes, with a softer curve to prevent huge text on tablets
export const fs = (size: number) => {
  const scaled = (size * Math.min(width, 600)) / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const screenWidth = width;
export const screenHeight = height;

// ─── Colours ─────────────────────────────────────────────────────────────────
export const C = {
  bg: '#0f172a',
  surface: 'rgba(30,41,59,0.7)',
  accent: '#38bdf8',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: 'rgba(56,189,248,0.2)',
  error: '#ef4444',
  cal: '#f97316',
  protein: '#38bdf8',
  carbs: '#4ade80',
  fat: '#eab308',
};
