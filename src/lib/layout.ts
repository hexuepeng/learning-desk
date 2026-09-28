import { TABLET_MIN } from '../constants/theme.ts';

export type DeskLayout = {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  compact: boolean;
  tap: number;
  tile: number;
  tileGap: number;
  maxWidth: number;
  titleSize: number;
  bodySize: number;
  buttonLabelSize: number;
  pad: number;
};

/** 按窗口算出孩子主设备（尤其是 iPad）上的字号、触控和内容宽度。 */
export function computeLayout(width: number, height: number): DeskLayout {
  const shortest = Math.min(width, height);
  const isTablet = shortest >= TABLET_MIN;
  const isLandscape = width > height;
  const compact = isLandscape && height < 700;

  const tap = isTablet ? (compact ? 64 : 72) : 56;
  const tile = isTablet ? (compact ? 72 : 84) : 58;
  const tileGap = isTablet ? 14 : 10;
  const maxWidth = isTablet ? (isLandscape ? 1040 : 820) : isLandscape ? 680 : 560;
  const titleSize = isTablet ? (compact ? 30 : 40) : compact ? 26 : 30;
  const bodySize = isTablet ? (compact ? 18 : 22) : 17;
  const buttonLabelSize = isTablet ? 20 : 18;
  const pad = isTablet ? (isLandscape ? 20 : 24) : 16;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    compact,
    tap,
    tile,
    tileGap,
    maxWidth,
    titleSize,
    bodySize,
    buttonLabelSize,
    pad,
  };
}

/** 听一听按钮：至少 44pt，并随 layout.tap 略放大，仍小于主 CTA。 */
export function speakTapHeight(tap: number): number {
  return Math.max(44, Math.round(tap * 0.8));
}

/** 排字母格子：优先单行放下，太长则按两行估宽，避免点不到。 */
export function arrangeTileSize(
  wordLength: number,
  availableWidth: number,
  isTablet: boolean,
): number {
  const gap = isTablet ? 12 : 8;
  const minTile = isTablet ? 56 : 44;
  const maxTile = isTablet ? 88 : 64;
  if (wordLength <= 0 || availableWidth <= 0) return maxTile;
  const lettersPerRow = wordLength <= 8 ? wordLength : Math.ceil(wordLength / 2);
  const fitted = Math.floor((availableWidth - gap * Math.max(0, lettersPerRow - 1)) / lettersPerRow);
  return Math.max(minTile, Math.min(maxTile, fitted));
}

export function nextEmptySlot(slots: Array<unknown | null>, preferred = 0): number {
  if (preferred >= 0 && preferred < slots.length && slots[preferred] == null) return preferred;
  return slots.findIndex((slot) => slot == null);
}

/** 选单词选项列数：平板两列，手机单列。 */
export function pickWordColumns(isTablet: boolean): 1 | 2 {
  return isTablet ? 2 : 1;
}

/** 闯关 / 选词揭晓卡：英文词和 IPA 大于中文释义。 */
export function playAnswerTypeSizes(titleSize: number, bodySize: number): {
  en: number;
  ipa: number;
  zh: number;
} {
  return {
    en: titleSize,
    ipa: Math.max(bodySize + 4, Math.round(titleSize * 0.72)),
    zh: bodySize,
  };
}
