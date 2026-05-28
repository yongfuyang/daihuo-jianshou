#!/usr/bin/env python3
import os

DIR = os.path.dirname(os.path.abspath(__file__))

def favicon_svg():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7B2FF7"/>
      <stop offset="50%" stop-color="#9B59B6"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <linearGradient id="bag" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E8D5FF"/>
    </linearGradient>
    <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#D4B8FF"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" ry="14" fill="url(#bg)"/>
  <path d="M20 28 L18 50 L46 50 L44 28 Z" fill="url(#bag)" opacity="0.95" stroke="#fff" stroke-width="0.5"/>
  <path d="M18 28 Q18 24 22 24 L42 24 Q46 24 46 28 Z" fill="#fff" opacity="0.9"/>
  <path d="M26 24 Q26 16 32 16 Q38 16 38 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse cx="22" cy="42" rx="4" ry="5.5" fill="none" stroke="url(#blade)" stroke-width="1.8" transform="rotate(-15,22,42)"/>
  <ellipse cx="42" cy="42" rx="4" ry="5.5" fill="none" stroke="url(#blade)" stroke-width="1.8" transform="rotate(15,42,42)"/>
  <line x1="24" y1="38" x2="34" y2="30" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <line x1="40" y1="38" x2="30" y2="30" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="1.5" fill="#fff"/>
  <circle cx="48" cy="14" r="1.2" fill="#FFD700" opacity="0.9"/>
  <circle cx="14" cy="16" r="0.8" fill="#FFD700" opacity="0.7"/>
  <circle cx="50" cy="22" r="0.6" fill="#FFD700" opacity="0.6"/>
</svg>'''

def icon_192_svg():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7B2FF7"/>
      <stop offset="40%" stop-color="#9333EA"/>
      <stop offset="70%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <linearGradient id="bag" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E8D5FF"/>
    </linearGradient>
    <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#D4B8FF"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.15"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="6" y="6" width="180" height="180" rx="42" ry="42" fill="url(#bg)"/>
  <rect x="6" y="6" width="180" height="180" rx="42" ry="42" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  <g filter="url(#shadow)">
    <path d="M58 84 L52 148 L140 148 L134 84 Z" fill="url(#bag)" opacity="0.95" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
    <path d="M52 84 Q52 72 64 72 L128 72 Q140 72 140 84 Z" fill="#fff" opacity="0.92"/>
    <path d="M76 72 Q76 48 96 48 Q116 48 116 72" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g filter="url(#glow)">
    <ellipse cx="70" cy="126" rx="12" ry="16" fill="none" stroke="url(#blade)" stroke-width="5" transform="rotate(-15,70,126)"/>
    <ellipse cx="122" cy="126" rx="12" ry="16" fill="none" stroke="url(#blade)" stroke-width="5" transform="rotate(15,122,126)"/>
    <line x1="76" y1="114" x2="102" y2="90" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>
    <line x1="116" y1="114" x2="90" y2="90" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="96" cy="96" r="4.5" fill="#fff" opacity="0.95"/>
    <circle cx="96" cy="96" r="2" fill="rgba(123,47,247,0.5)"/>
  </g>
  <circle cx="152" cy="38" r="3.5" fill="#FFD700" opacity="0.9"/>
  <circle cx="38" cy="44" r="2.5" fill="#FFD700" opacity="0.7"/>
  <circle cx="158" cy="60" r="1.8" fill="#FFD700" opacity="0.6"/>
  <circle cx="30" cy="66" r="1.2" fill="#FFD700" opacity="0.5"/>
</svg>'''

def icon_512_svg():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7B2FF7"/>
      <stop offset="30%" stop-color="#8B3FE8"/>
      <stop offset="60%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <linearGradient id="bag" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0CCFF"/>
    </linearGradient>
    <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#D4B8FF"/>
    </linearGradient>
    <linearGradient id="handle" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FFA500"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.2"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
  <g filter="url(#shadow)">
    <path d="M155 224 L140 394 L372 394 L357 224 Z" fill="url(#bag)" opacity="0.95" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    <line x1="256" y1="240" x2="256" y2="380" stroke="rgba(123,47,247,0.08)" stroke-width="1"/>
    <path d="M140 224 Q140 194 170 194 L342 194 Q372 194 372 224 Z" fill="#fff" opacity="0.93"/>
    <line x1="170" y1="206" x2="342" y2="206" stroke="rgba(123,47,247,0.1)" stroke-width="1"/>
    <path d="M204 194 Q204 130 256 130 Q308 130 308 194" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
    <path d="M204 194 Q204 130 256 130 Q308 130 308 194" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="8" stroke-linecap="round"/>
  </g>
  <g filter="url(#glow)">
    <path d="M220 310 L195 285 Q180 270 180 255 L180 250 Q180 240 190 240 L200 240 Q210 240 210 250 L210 260 Q210 270 220 280 Z" fill="url(#blade)" opacity="0.95"/>
    <path d="M292 310 L317 285 Q332 270 332 255 L332 250 Q332 240 322 240 L312 240 Q302 240 302 250 L302 260 Q302 270 292 280 Z" fill="url(#blade)" opacity="0.95"/>
    <ellipse cx="190" cy="340" rx="28" ry="38" fill="none" stroke="url(#handle)" stroke-width="8" transform="rotate(-10,190,340)"/>
    <ellipse cx="322" cy="340" rx="28" ry="38" fill="none" stroke="url(#handle)" stroke-width="8" transform="rotate(10,322,340)"/>
    <line x1="200" y1="305" x2="270" y2="235" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <line x1="312" y1="305" x2="242" y2="235" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <line x1="204" y1="300" x2="265" y2="240" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round"/>
    <line x1="308" y1="300" x2="247" y2="240" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="256" cy="252" r="10" fill="#fff" opacity="0.95"/>
    <circle cx="256" cy="252" r="5" fill="rgba(123,47,247,0.4)"/>
    <circle cx="256" cy="252" r="2" fill="#fff" opacity="0.6"/>
  </g>
  <circle cx="408" cy="100" r="8" fill="#FFD700" opacity="0.9"/>
  <circle cx="408" cy="100" r="4" fill="#FFF" opacity="0.5"/>
  <circle cx="96" cy="116" r="6" fill="#FFD700" opacity="0.7"/>
  <circle cx="424" cy="160" r="4.5" fill="#FFD700" opacity="0.6"/>
  <circle cx="78" cy="174" r="3" fill="#FFD700" opacity="0.5"/>
  <circle cx="440" cy="200" r="2.5" fill="#FFD700" opacity="0.4"/>
  <path d="M410 100 L414 96 L412 102 Z" fill="#FFF" opacity="0.6"/>
  <path d="M406 104 L410 100 L404 100 Z" fill="#FFF" opacity="0.4"/>
</svg>'''

def apple_touch_svg():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7B2FF7"/>
      <stop offset="30%" stop-color="#8B3FE8"/>
      <stop offset="60%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <linearGradient id="bag" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0CCFF"/>
    </linearGradient>
    <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#D4B8FF"/>
    </linearGradient>
    <linearGradient id="handle" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FFA500"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.2"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="512" height="512" fill="url(#bg)"/>
  <g filter="url(#shadow)">
    <path d="M155 224 L140 394 L372 394 L357 224 Z" fill="url(#bag)" opacity="0.95" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    <line x1="256" y1="240" x2="256" y2="380" stroke="rgba(123,47,247,0.08)" stroke-width="1"/>
    <path d="M140 224 Q140 194 170 194 L342 194 Q372 194 372 224 Z" fill="#fff" opacity="0.93"/>
    <line x1="170" y1="206" x2="342" y2="206" stroke="rgba(123,47,247,0.1)" stroke-width="1"/>
    <path d="M204 194 Q204 130 256 130 Q308 130 308 194" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
    <path d="M204 194 Q204 130 256 130 Q308 130 308 194" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="8" stroke-linecap="round"/>
  </g>
  <g filter="url(#glow)">
    <path d="M220 310 L195 285 Q180 270 180 255 L180 250 Q180 240 190 240 L200 240 Q210 240 210 250 L210 260 Q210 270 220 280 Z" fill="url(#blade)" opacity="0.95"/>
    <path d="M292 310 L317 285 Q332 270 332 255 L332 250 Q332 240 322 240 L312 240 Q302 240 302 250 L302 260 Q302 270 292 280 Z" fill="url(#blade)" opacity="0.95"/>
    <ellipse cx="190" cy="340" rx="28" ry="38" fill="none" stroke="url(#handle)" stroke-width="8" transform="rotate(-10,190,340)"/>
    <ellipse cx="322" cy="340" rx="28" ry="38" fill="none" stroke="url(#handle)" stroke-width="8" transform="rotate(10,322,340)"/>
    <line x1="200" y1="305" x2="270" y2="235" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <line x1="312" y1="305" x2="242" y2="235" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <line x1="204" y1="300" x2="265" y2="240" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round"/>
    <line x1="308" y1="300" x2="247" y2="240" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="256" cy="252" r="10" fill="#fff" opacity="0.95"/>
    <circle cx="256" cy="252" r="5" fill="rgba(123,47,247,0.4)"/>
    <circle cx="256" cy="252" r="2" fill="#fff" opacity="0.6"/>
  </g>
  <circle cx="408" cy="100" r="8" fill="#FFD700" opacity="0.9"/>
  <circle cx="408" cy="100" r="4" fill="#FFF" opacity="0.5"/>
  <circle cx="96" cy="116" r="6" fill="#FFD700" opacity="0.7"/>
  <circle cx="424" cy="160" r="4.5" fill="#FFD700" opacity="0.6"/>
  <circle cx="78" cy="174" r="3" fill="#FFD700" opacity="0.5"/>
  <circle cx="440" cy="200" r="2.5" fill="#FFD700" opacity="0.4"/>
  <path d="M410 100 L414 96 L412 102 Z" fill="#FFF" opacity="0.6"/>
  <path d="M406 104 L410 100 L404 100 Z" fill="#FFF" opacity="0.4"/>
</svg>'''

# Write all SVG files
icons = {
    "favicon.svg": favicon_svg(),
    "icon-192.svg": icon_192_svg(),
    "icon-512.svg": icon_512_svg(),
    "apple-touch-icon.svg": apple_touch_svg(),
}

for name, content in icons.items():
    path = os.path.join(DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] {path} ({os.path.getsize(path)} bytes)")

print("\nAll icons generated successfully!")
