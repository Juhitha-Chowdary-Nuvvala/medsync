import React from 'react';

/**
 * MedSync Welcome Page SVG Symbols & Decorative Background Shapes
 * Inline SVG components with exact colors and accessible aria-hidden markers.
 */

// 1. LogoMark (48x48) - Teal rounded badge with white cross & heartbeat line
export function LogoMark(props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      aria-hidden="true"
      {...props}
    >
      <rect width="48" height="48" rx="10" fill="#0F9F8F" />
      <path d="M19 9h10v10h10v10H29v10H19V29H9V19h10z" fill="#fff" />
      <polyline
        points="12,24 19,24 22,18 26,31 29,24 36,24"
        fill="none"
        stroke="#0F9F8F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 2. ShieldPulse (64x72) - Centered above hero heading
export function ShieldPulse(props) {
  return (
    <svg
      viewBox="0 0 64 72"
      width="64"
      height="72"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M32 4L56 13V34C56 50 46 62 32 68C18 62 8 50 8 34V13Z"
        fill="#14A89A"
      />
      <path
        d="M32 11L50 18V34C50 46 43 55 32 60C21 55 14 46 14 34V18Z"
        fill="#E6FFFA"
      />
      <polyline
        points="20,36 27,36 31,26 36,46 40,36 44,36"
        fill="none"
        stroke="#0F9F8F"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 3. PersonIcon (32x34) - Teal patient silhouette
export function PersonIcon(props) {
  return (
    <svg
      viewBox="0 0 32 34"
      width="32"
      height="34"
      aria-hidden="true"
      {...props}
    >
      <circle cx="16" cy="9" r="6.5" fill="#0F9F8F" />
      <path
        d="M3 31c0-7.5 5.5-12 13-12s13 4.5 13 12v1H3z"
        fill="#0F9F8F"
      />
    </svg>
  );
}

// 4. StethoscopeIcon (36x40) - Blue clinician stethoscope
export function StethoscopeIcon(props) {
  return (
    <svg
      viewBox="0 0 36 40"
      width="36"
      height="40"
      fill="none"
      stroke="#2563EB"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 4v10a8 8 0 0 0 16 0V4" />
      <path d="M16 22v5a7 7 0 0 0 14 0v-4" />
      <circle cx="30" cy="19" r="3.5" />
    </svg>
  );
}

// 5. ArrowRight (24x24) - Teal right arrow for card action
export function ArrowRight(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="#0F9F8F"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

// 6. SmallShield (16x18) - Footer privacy/permission shield
export function SmallShield(props) {
  return (
    <svg
      viewBox="0 0 16 18"
      width="16"
      height="18"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M8 1L14 3.5V9C14 13 11.5 16 8 17.5C4.5 16 2 13 2 9V3.5Z"
        fill="#14A89A"
      />
      <path
        d="M5.5 9l2 2 3-3.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 7a. HeartbeatLine (300x120) - Subtle background ECG line on middle-right
export function HeartbeatLine(props) {
  return (
    <svg
      viewBox="0 0 300 120"
      width="300"
      height="120"
      fill="none"
      stroke="#BAE6FD"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="0,70 90,70 110,70 125,30 145,100 160,50 175,70 300,70" />
    </svg>
  );
}

// 7b. BottomWaves - Soft overlapping background waves at screen bottom
export function BottomWaves(props) {
  return (
    <svg
      viewBox="0 0 1440 220"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0,70 C340,150 720,20 1080,85 C1260,118 1380,95 1440,90 L1440,220 L0,220 Z"
        fill="#E0F2FE"
        fillOpacity="0.6"
      />
      <path
        d="M0,120 C320,50 680,170 1040,110 C1220,80 1360,130 1440,135 L1440,220 L0,220 Z"
        fill="#DBEAFE"
        fillOpacity="0.6"
      />
    </svg>
  );
}

// 7c. FolderCross - Document folder with white medical cross, bottom-left
export function FolderCross(props) {
  return (
    <svg
      viewBox="0 0 200 170"
      width="200"
      height="170"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* Smaller back sheet of paper behind folder */}
      <rect
        x="30"
        y="12"
        width="135"
        height="125"
        rx="10"
        fill="#EFF6FF"
        stroke="#DBEAFE"
        strokeWidth="1.5"
      />
      {/* Pale blue folder body (#DBEAFE) with tab */}
      <path
        d="M12 42 C12 34 18 28 26 28 L72 28 C78 28 84 32 88 37 L98 48 L174 48 C182 48 188 54 188 62 L188 152 C188 160 182 166 174 166 L26 166 C18 166 12 160 12 152 Z"
        fill="#DBEAFE"
      />
      {/* White medical cross on front */}
      <rect x="90" y="85" width="20" height="44" rx="4" fill="#FFFFFF" />
      <rect x="78" y="97" width="44" height="20" rx="4" fill="#FFFFFF" />
    </svg>
  );
}
