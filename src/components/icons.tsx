import type { SVGProps } from 'react';
export const iconPaths = {
  "close": [
    "M6 6l12 12",
    "M18 6L6 18"
  ],
  "plus": [
    "M12 5v14",
    "M5 12h14"
  ],
  "chevron-down": [
    "m6 9 6 6 6-6"
  ],
  "chevron-left": [
    "m15 6-6 6 6 6"
  ],
  "chevron-right": [
    "m9 6 6 6-6 6"
  ],
  "arrow-left": [
    "m12 5-7 7 7 7",
    "M5 12h14"
  ],
  "calendar": [
    "M7 3v4",
    "M17 3v4",
    "M4 10h16",
    "M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1",
    "M8 14h1m6 0h1m-8 3h1m6 0h1"
  ],
  "image": [
    "M4 4h16v16H4z",
    "m4 16 5-5 4 4 3-3 4 4",
    "M15 8h.01"
  ],
  "settings": [
    "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7",
    "m10 3 4 0 .7 2.6 2 .9 2.4-.9 2 3.4-1.8 2 .1 2 1.7 2-2 3.4-2.5-.8-1.9 1-.7 2.4h-4l-.7-2.5-2-1-2.4.9-2-3.4 1.8-2-.1-2-1.7-2 2-3.4 2.5.8 1.9-1z"
  ],
  "message": [
    "M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-4a7.5 7.5 0 1 1 13.5-3.5z"
  ],
  "refresh": [
    "M20 4v5h-5",
    "M20 9a8 8 0 1 0 .1 6"
  ],
  "check": [
    "m5 12 4 4L19 6"
  ],
  "more": [
    "M5 12h.01M12 12h.01M19 12h.01"
  ],
  "home": [
    "m3 11 9-8 9 8",
    "M5 10v10h5v-6h4v6h5V10"
  ],
  "book": [
    "M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14"
  ],
  "collection": [
    "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
  ],
  "trash": [
    "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"
  ],
  "lock": [
    "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"
  ]
} as const;
export type IconName = keyof typeof iconPaths;
export type IconSize = 'inline' | 'control' | 'navigation';
export function Icon({name,size='control',className='',...rest}: {name:IconName;size?:IconSize;className?:string} & Pick<SVGProps<SVGSVGElement>,'style'>) {
  return <svg {...rest} className={`dj-icon dj-icon--${size} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{iconPaths[name].map((d,i)=><path key={i} d={d}/>)}</svg>;
}
