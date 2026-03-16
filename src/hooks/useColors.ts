// useColors Hook for CampusHub
// Returns light colors only (dark mode disabled)

import { lightColors, ColorScheme } from '../theme/colors';

export const useColors = (): ColorScheme => {
  // Always return light colors - dark mode disabled
  return lightColors;
};

export default useColors;
