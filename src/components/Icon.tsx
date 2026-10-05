import type { CSSProperties } from 'react';
export type IconName = 'cube' | 'arrow' | 'arrowLeft' | 'check' | 'chevron' | 'rotate' | 'cut' | 'expand' | 'tag' | 'clock' | 'book' | 'history' | 'shield' | 'drop' | 'play' | 'close' | 'info' | 'print' | 'menu' | 'focus';
const paths: Record<IconName, string> = {
  focus: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  cube: 'M12 3 3 8v9l9 5 9-5V8L12 3Zm0 0v19M3 8l18 9M21 8 3 17',
  arrow: 'M4 12h16m-6-6 6 6-6 6', arrowLeft: 'M20 12H4m6-6-6 6 6 6',
  check: 'm5 12 4 4L19 6', chevron: 'm9 5 7 7-7 7',
  rotate: 'M4 8a8 8 0 1 1-1 7M4 3v5h5',
  cut: 'M3 4h18v16H3V4Zm6 0v16m6-16v16',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6',
  tag: 'M3 3h8l10 10-8 8L3 11V3Zm4 4h.01',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  book: 'M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15',
  history: 'M4 7a9 9 0 1 1-1 9M3 2v6h6m3-1v6l4 2',
  shield: 'M12 2 3 6v6c0 5 5 8 9 10 4-2 9-5 9-10V6l-9-4Zm-5 10 3 3 7-7',
  drop: 'M12 2C9 7 4 11 4 15a8 8 0 0 0 16 0c0-4-5-8-8-13ZM8 15c0 2 1 3 3 3',
  play: 'm8 4 12 8-12 8V4', close: 'm6 6 12 12M6 18 18 6',
  info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  print: 'M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v8H6v-8Zm11-2h.01',
  menu: 'M4 6h16M4 12h16M4 18h16'
};
export function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
