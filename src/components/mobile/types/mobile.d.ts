export interface MobilePageConfig {
  width?: string;
  height?: string;
  borderRadius?: string;
  showShadow?: boolean;
  backgroundColor?: string;
}

export interface StatusBarConfig {
  show?: boolean;
  time?: string;
  showBattery?: boolean;
  showWifi?: boolean;
  showCellular?: boolean;
  customIcons?: any[];
}

export interface HeaderConfig {
  show?: boolean;
  title?: string;
  showBack?: boolean;
  backIcon?: any;
  rightContent?: any;
  leftContent?: any;
  backgroundColor?: string;
  textColor?: string;
  height?: string;
}

export interface FooterConfig {
  show?: boolean;
  showHomeIndicator?: boolean;
  backgroundColor?: string;
  height?: string;
  padding?: string;
}

export interface ScrollConfig {
  enabled?: boolean;
  showScrollbar?: boolean;
  scrollbarWidth?: string;
  onScroll?: (event: Event) => void;
}
