import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#1DB954', // Spotify-like green
  background: '#121212',
  surface: '#282828',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  overlay: 'rgba(0, 0, 0, 0.8)',
  error: '#FF4B4B',
  success: '#1DB954',
  warning: '#FFD700',
  info: '#00BFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const DIMS = {
  cardWidth: Dimensions.get('window').width * 0.9,
  margin: 16,
  width,
  height,
  headerHeight: Platform.OS === 'ios' ? 100 : 100,
  tabBarHeight: 100,
  statusBarHeight: Platform.OS === 'ios' ? 44 : 0,
  filterHeight: 70,
  // Remove any extra padding/margins
};

const getScreenHeight = () => {
  return DIMS.height - DIMS.tabBarHeight - DIMS.headerHeight - DIMS.statusBarHeight;
};

export const getCardHeight = () => {
  const { height } = Dimensions.get('window');
  const TAB_BAR_HEIGHT = 100;
  const AVAILABLE_HEIGHT = height - TAB_BAR_HEIGHT;
  return AVAILABLE_HEIGHT * 0.8; // Return 80% of available height
};

const getCardWidth = () => {
  return DIMS.width - (Platform.OS === 'ios' ? 0 : 0); // Remove horizontal padding
};

// Single export statement for all functions
export { getCardHeight, getScreenHeight, getCardWidth };