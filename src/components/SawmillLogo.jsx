import React from 'react'

/**
 * G.K. SAWMILL - Official Brand Logo
 * Precision Saw Blade with 16 Circular Teeth, Concentric Timber Growth Rings,
 * and Central Evergreen Pine Crest in Warm Gold and Forest Emerald.
 */
export default function SawmillLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="G.K. Sawmill Logo"
    >
      <defs>
        {/* Outer Emerald Background */}
        <linearGradient id="gkLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14281e" />
          <stop offset="60%" stopColor="#1e3a2b" />
          <stop offset="100%" stopColor="#0b130e" />
        </linearGradient>

        {/* Timber Disc Radial Gradient */}
        <radialGradient id="gkTimberDisc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0a96d" />
          <stop offset="45%" stopColor="#d4a373" />
          <stop offset="75%" stopColor="#925c38" />
          <stop offset="100%" stopColor="#4a2411" />
        </radialGradient>

        {/* Gold Accent Gradient */}
        <linearGradient id="gkGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8ee" />
          <stop offset="40%" stopColor="#e0a96d" />
          <stop offset="100%" stopColor="#b07d4b" />
        </linearGradient>

        {/* Vibrant Emerald Tree Gradient */}
        <linearGradient id="gkTree" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#52b788" />
          <stop offset="60%" stopColor="#2d6a4f" />
          <stop offset="100%" stopColor="#143625" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Container */}
      <rect width="100" height="100" rx="22" fill="url(#gkLogoBg)" />
      <rect x="1.5" y="1.5" width="97" height="97" rx="20.5" stroke="url(#gkGold)" strokeWidth="1.5" strokeOpacity="0.45" />

      {/* Centered Saw Blade & Timber Emblem */}
      <g transform="translate(50, 50)">
        {/* 16 Precision Saw Blade Teeth */}
        <g fill="url(#gkGold)">
          <polygon points="0,-43 4,-37 -4,-37" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(22.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(45)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(67.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(90)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(112.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(135)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(157.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(180)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(202.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(225)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(247.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(270)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(292.5)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(315)" />
          <polygon points="0,-43 4,-37 -4,-37" transform="rotate(337.5)" />
        </g>

        {/* Timber Wood Grain Disc */}
        <circle r="36" fill="url(#gkTimberDisc)" stroke="#3a1e0f" strokeWidth="1.5" />

        {/* Concentric Timber Growth Rings */}
        <circle r="30" fill="none" stroke="#6f3d1e" strokeWidth="1" strokeOpacity="0.65" />
        <circle r="24" fill="none" stroke="#e0a96d" strokeWidth="0.8" strokeOpacity="0.55" />
        <circle r="17" fill="none" stroke="#58311a" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Center Saw Arbor Plate */}
        <circle r="10" fill="#14281e" stroke="url(#gkGold)" strokeWidth="1.2" />
        <circle r="4" fill="url(#gkGold)" />

        {/* Pine Tree Silhouette & Crest */}
        {/* Tree Trunk */}
        <rect x="-2" y="8" width="4" height="11" rx="1" fill="#2d1406" />

        {/* Tree Tiers */}
        <polygon points="0,-2 14,12 -14,12" fill="url(#gkTree)" />
        <polygon points="0,-12 11,1 -11,1" fill="url(#gkTree)" />
        <polygon points="0,-20 8,-8 -8,-8" fill="url(#gkTree)" />

        {/* Peak Gold Timber Star */}
        <polygon points="0,-25 1.5,-21.5 5,-21.5 2.2,-19.5 3.2,-16 0,-18.2 -3.2,-16 -2.2,-19.5 -5,-21.5 -1.5,-21.5" fill="url(#gkGold)" />
      </g>
    </svg>
  )
}
