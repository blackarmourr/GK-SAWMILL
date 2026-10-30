import React from 'react'

/**
 * GK SAWMILL - Official Brand Logo
 * Precision Saw Blade & 3D Timber Grain Emblem
 */
export default function SawmillLogo({ size = 36, className = '', useEmblem = false }) {
  const imgSrc = useEmblem ? './logo-emblem-transparent.png' : './logo-transparent.png'
  const fallbackSrc = useEmblem ? './logo-emblem.png' : './logo.png'

  return (
    <img
      src={imgSrc}
      alt="GK SAWMILL"
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0
      }}
      onError={(e) => {
        if (!e.target.src.endsWith(fallbackSrc.replace('./', ''))) {
          e.target.src = fallbackSrc
        }
      }}
    />
  )
}
