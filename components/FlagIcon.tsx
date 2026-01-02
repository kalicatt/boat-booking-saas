import React from 'react'

type FlagCode = 'FR' | 'GB' | 'DE' | 'ES' | 'IT'

type FlagIconProps = {
  code: FlagCode
  className?: string
  title?: string
}

const Svg = ({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    role={title ? 'img' : 'presentation'}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    {title ? <title>{title}</title> : null}
    <defs>
      <clipPath id="sn-flag-round">
        <rect x="1" y="3" width="22" height="18" rx="4" />
      </clipPath>
    </defs>
    <g clipPath="url(#sn-flag-round)">{children}</g>
    <rect x="1" y="3" width="22" height="18" rx="4" fill="none" stroke="currentColor" opacity="0.15" />
  </svg>
)

export default function FlagIcon({ code, className = 'w-4 h-4 text-slate-900/60', title }: FlagIconProps) {
  switch (code) {
    case 'FR':
      return (
        <Svg className={className} title={title ?? 'France'}>
          <rect x="1" y="3" width="22" height="18" fill="#ffffff" />
          <rect x="1" y="3" width="7.333" height="18" fill="#1f4aa8" />
          <rect x="15.667" y="3" width="7.333" height="18" fill="#d61f2c" />
        </Svg>
      )

    case 'DE':
      return (
        <Svg className={className} title={title ?? 'Germany'}>
          <rect x="1" y="3" width="22" height="18" fill="#ffce00" />
          <rect x="1" y="3" width="22" height="6" fill="#000000" />
          <rect x="1" y="9" width="22" height="6" fill="#dd0000" />
        </Svg>
      )

    case 'IT':
      return (
        <Svg className={className} title={title ?? 'Italy'}>
          <rect x="1" y="3" width="22" height="18" fill="#ffffff" />
          <rect x="1" y="3" width="7.333" height="18" fill="#009246" />
          <rect x="15.667" y="3" width="7.333" height="18" fill="#ce2b37" />
        </Svg>
      )

    case 'ES':
      return (
        <Svg className={className} title={title ?? 'Spain'}>
          <rect x="1" y="3" width="22" height="18" fill="#aa151b" />
          <rect x="1" y="7" width="22" height="10" fill="#f1bf00" />
        </Svg>
      )

    case 'GB':
      // Simplified Union Jack (clean + recognizable at small size)
      return (
        <Svg className={className} title={title ?? 'United Kingdom'}>
          <rect x="1" y="3" width="22" height="18" fill="#012169" />

          {/* White diagonals */}
          <path d="M1 3 L3.2 3 L23 18.2 L23 21 L20.8 21 L1 5.8 Z" fill="#ffffff" opacity="0.95" />
          <path d="M23 3 L20.8 3 L1 18.2 L1 21 L3.2 21 L23 5.8 Z" fill="#ffffff" opacity="0.95" />

          {/* Red diagonals */}
          <path d="M1 3 L2.6 3 L23 17.4 L23 19.2 L21.4 19.2 L1 4.8 Z" fill="#c8102e" opacity="0.95" />
          <path d="M23 3 L21.4 3 L1 17.4 L1 19.2 L2.6 19.2 L23 4.8 Z" fill="#c8102e" opacity="0.95" />

          {/* White cross */}
          <rect x="1" y="10.2" width="22" height="3.6" fill="#ffffff" />
          <rect x="10.2" y="3" width="3.6" height="18" fill="#ffffff" />

          {/* Red cross */}
          <rect x="1" y="10.8" width="22" height="2.4" fill="#c8102e" />
          <rect x="10.8" y="3" width="2.4" height="18" fill="#c8102e" />
        </Svg>
      )

    default:
      return null
  }
}
