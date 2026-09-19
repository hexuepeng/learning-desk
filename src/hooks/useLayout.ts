import { useWindowDimensions } from 'react-native';

import { computeLayout, type DeskLayout } from '@/lib/layout';

export function useLayout(): DeskLayout {
  const { width, height } = useWindowDimensions();
  return computeLayout(width, height);
}
