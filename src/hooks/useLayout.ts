import { useWindowDimensions } from 'react-native';

import { TABLET_MIN } from '@/constants/theme';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const isTablet = shortest >= TABLET_MIN;
  return {
    width,
    height,
    isTablet,
    tap: isTablet ? 64 : 56,
    tile: isTablet ? 76 : 58,
    maxWidth: isTablet ? 760 : 560,
    titleSize: isTablet ? 36 : 30,
    bodySize: isTablet ? 20 : 17,
  };
}
