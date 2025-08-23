"use client";
import React from 'react'

// SVG Themes library: professional, sober templates with editable slots
// Each theme exposes a render function that consumes slots (text, colors, image URLs)

export type SvgTheme = {
  id: string
  name: string
  slots: string[] // expected editable keys
  render: (slots: Record<string, string>) => JSX.Element
}

function safe(v: string | undefined, fallback: string) {
  return (v ?? '').trim() || fallback
}

// Utility image placeholder rect with foreignObject fallback text
function ImageRect({ href, x, y, width, height, rx = 12 }: { href?: string; x: number; y: number; width: number; height: number; rx?: number }) {
  if (href) {
    return (
      <>
        <defs>
          <clipPath id={`clip-${x}-${y}`}>
            <rect x={x} y={y} width={width} height={height} rx={rx} ry={rx} />
          </clipPath>
        </defs>
        <image href={href} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${x}-${y})`} />
      </>
    )
  }
  return <rect x={x} y={y} width={width} height={height} rx={rx} ry={rx} fill="#1f2937" />
}

export const svgThemes: SvgTheme[] = [
  {
    id: 'theme-01',
    name: 'Hero Split',
    slots: ['title', 'subtitle', 'cta', 'brand', 'accent', 'image'],
    render: (s) => (
      <svg viewBox="0 0 1200 600" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="600" fill={safe(s.brand, '#0b0f1a')} />
        <rect width="1200" height="600" fill={safe(s.accent, '#111827')} opacity="0.25" />
        <ImageRect href={s.image} x={720} y={80} width={380} height={440} />
        <g transform="translate(120,140)" fill="#e5e7eb">
          <text x="0" y="0" fontSize="44" fontWeight={700}>{safe(s.title, 'Professional Headline')}</text>
          <text x="0" y="56" fontSize="18" opacity="0.8">{safe(s.subtitle, 'Sober subheading for advanced landing pages.')}</text>
          <rect x="0" y="96" width="220" height="48" rx="12" fill={safe(s.accent, '#22d3ee')} />
          <text x="24" y="128" fontSize="18" fontWeight={600} fill="#0b0f1a">{safe(s.cta, 'Get Started')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-02',
    name: 'Centered Statement',
    slots: ['title', 'subtitle', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 400" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="400" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(600,200)" textAnchor="middle" fill="#e5e7eb">
          <text y="-10" fontSize="40" fontWeight={700}>{safe(s.title, 'Elevate Your Presence')}</text>
          <text y="30" fontSize="18" opacity="0.8">{safe(s.subtitle, 'Clarity. Focus. Professionalism.')}</text>
          <circle cx="0" cy="-80" r="100" fill={safe(s.accent, '#22d3ee')} opacity="0.2" />
        </g>
      </svg>
    )
  },
  {
    id: 'theme-03',
    name: 'Feature Row',
    slots: ['title', 'f1', 'f2', 'f3', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 460" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="460" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="90" fontSize="32" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'What You Get')}</text>
        {[0,1,2].map((i)=> (
          <g key={i} transform={`translate(${120 + i*340}, 130)`}>
            <rect width="300" height="240" rx="16" fill="#111827" />
            <circle cx="44" cy="56" r="20" fill={safe(s.accent, '#22d3ee')} />
            <text x="44" y="110" fontSize="18" fill="#e5e7eb">{safe(s[`f${i+1}` as const], `Feature ${i+1}`)}</text>
          </g>
        ))}
      </svg>
    )
  },
  {
    id: 'theme-04',
    name: 'Testimonial',
    slots: ['quote', 'author', 'brand', 'accent', 'image'],
    render: (s) => (
      <svg viewBox="0 0 1200 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="380" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,100)">
          <ImageRect href={s.image} x={0} y={-40} width={120} height={120} rx={60} />
          <text x="160" y="0" fontSize="24" fill="#e5e7eb">“{safe(s.quote, 'A remarkable improvement in our metrics.')}”</text>
          <text x="160" y="36" fontSize="16" fill={safe(s.accent, '#22d3ee')}>— {safe(s.author, 'Alex Johnson, COO')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-05',
    name: 'Stats Trio',
    slots: ['title', 's1', 's2', 's3', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="340" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Outcomes that matter')}</text>
        {[0,1,2].map((i)=> (
          <g key={i} transform={`translate(${120 + i*340}, 120)`}>
            <rect width="300" height="160" rx="16" fill="#111827" />
            <text x="24" y="60" fontSize="36" fontWeight={800} fill={safe(s.accent, '#22d3ee')}>{safe(s[`s${i+1}` as const], `${(i+1)*20}%`)}</text>
            <text x="24" y="100" fontSize="14" fill="#e5e7eb" opacity="0.85">Key metric {i+1}</text>
          </g>
        ))}
      </svg>
    )
  },
  {
    id: 'theme-06',
    name: 'Pricing Card',
    slots: ['plan', 'price', 'desc', 'cta', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 420" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="420" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,100)">
          <rect width="360" height="220" rx="20" fill="#111827" />
          <text x="24" y="44" fontSize="20" fill="#e5e7eb">{safe(s.plan, 'Pro')}</text>
          <text x="24" y="88" fontSize="40" fontWeight={800} fill={safe(s.accent, '#22d3ee')}>{safe(s.price, '$29')}</text>
          <text x="24" y="128" fontSize="14" fill="#e5e7eb" opacity="0.85">{safe(s.desc, 'Best for professionals')}</text>
          <rect x="24" y="150" width="160" height="44" rx="12" fill={safe(s.accent, '#22d3ee')} />
          <text x="44" y="178" fontSize="16" fontWeight={600} fill="#0b0f1a">{safe(s.cta, 'Choose plan')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-07',
    name: 'Hero Minimal',
    slots: ['kicker', 'title', 'subtitle', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="360" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,120)" fill="#e5e7eb">
          <text x="0" y="0" fontSize="12" letterSpacing="2" opacity="0.8">{safe(s.kicker, 'ANNOUNCEMENT')}</text>
          <text x="0" y="36" fontSize="36" fontWeight={700}>{safe(s.title, 'Build with Confidence')}</text>
          <text x="0" y="72" fontSize="16" opacity="0.85">{safe(s.subtitle, 'Sober design system for serious teams.')}</text>
          <rect x="0" y="92" width="56" height="4" fill={safe(s.accent, '#22d3ee')} />
        </g>
      </svg>
    )
  },
  {
    id: 'theme-08',
    name: 'Grid Gallery',
    slots: ['title', 'brand', 'accent', 'img1', 'img2', 'img3', 'img4', 'img5', 'img6'],
    render: (s) => (
      <svg viewBox="0 0 1200 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="520" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Recent Work')}</text>
        {[
          {x:120,y:110,href:s.img1},{x:420,y:110,href:s.img2},{x:720,y:110,href:s.img3},
          {x:120,y:310,href:s.img4},{x:420,y:310,href:s.img5},{x:720,y:310,href:s.img6},
        ].map((it, idx) => (
          <g key={idx}>
            <ImageRect href={it.href} x={it.x} y={it.y} width={260} height={160} rx={16} />
          </g>
        ))}
        <rect x="1080" y="20" width="4" height="60" fill={safe(s.accent, '#22d3ee')} />
      </svg>
    )
  },
  {
    id: 'theme-09',
    name: 'Timeline',
    slots: ['title', 'step1', 'step2', 'step3', 'step4', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 420" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="420" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Our Process')}</text>
        <g transform="translate(160,140)">
          {[0,1,2,3].map(i => (
            <g key={i} transform={`translate(${i*240},0)`}>
              <circle cx="0" cy="0" r="10" fill={safe(s.accent, '#22d3ee')} />
              {i<3 && <rect x="10" y="-2" width="220" height="4" fill="#111827" />}
              <text x="0" y="36" fontSize="14" fill="#e5e7eb">{safe((s as any)[`step${i+1}`], `Step ${i+1}`)}</text>
            </g>
          ))}
        </g>
      </svg>
    )
  },
  {
    id: 'theme-10',
    name: 'FAQ Panel',
    slots: ['title', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="520" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Frequently Asked')}</text>
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(120, ${120 + i*120})`}>
            <rect width="960" height="96" rx="12" fill="#111827" />
            <text x="16" y="32" fontSize="16" fill="#e5e7eb">{safe((s as any)[`q${i+1}`], `Question ${i+1}`)}</text>
            <text x="16" y="64" fontSize="14" fill="#9ca3af">{safe((s as any)[`a${i+1}`], 'Answer text...')}</text>
          </g>
        ))}
        <circle cx="1120" cy="60" r="8" fill={safe(s.accent, '#22d3ee')} />
      </svg>
    )
  },
  {
    id: 'theme-11',
    name: 'Logos Strip',
    slots: ['title', 'brand', 'accent', 'logo1', 'logo2', 'logo3', 'logo4', 'logo5'],
    render: (s) => (
      <svg viewBox="0 0 1200 260" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="260" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="64" fontSize="18" fill="#9ca3af">{safe(s.title, 'Trusted by teams at')}</text>
        {[
          {x:120,href:s.logo1},{x:320,href:s.logo2},{x:520,href:s.logo3},{x:720,href:s.logo4},{x:920,href:s.logo5}
        ].map((it, idx) => (
          <g key={idx}>
            <ImageRect href={it.href} x={it.x} y={96} width={140} height={60} rx={8} />
          </g>
        ))}
        <rect x="1120" y="28" width="4" height="32" fill={safe(s.accent, '#22d3ee')} />
      </svg>
    )
  },
  {
    id: 'theme-12',
    name: 'Footer CTA',
    slots: ['title', 'subtitle', 'cta', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 280" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="280" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,100)" fill="#e5e7eb">
          <text x="0" y="0" fontSize="24" fontWeight={700}>{safe(s.title, 'Ready to start?')}</text>
          <text x="0" y="32" fontSize="14" opacity="0.85">{safe(s.subtitle, 'Get in touch to see how we can help.')}</text>
          <rect x="0" y="52" width="200" height="40" rx="10" fill={safe(s.accent, '#22d3ee')} />
          <text x="24" y="78" fontSize="16" fontWeight={600} fill="#0b0f1a">{safe(s.cta, 'Contact us')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-13',
    name: 'Comparison Table',
    slots: ['title', 'col1', 'col2', 'col3', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 420" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="420" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Compare plans')}</text>
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(${120 + i*320}, 120)`}>
            <rect width="280" height="220" rx="16" fill="#111827" />
            <rect x="0" y="0" width="280" height="48" rx="16" fill={safe(s.accent, '#22d3ee')} opacity="0.2" />
            <text x="20" y="32" fontSize="16" fill="#e5e7eb">{safe((s as any)[`col${i+1}`], `Column ${i+1}`)}</text>
            <text x="20" y="80" fontSize="14" fill="#9ca3af">Key benefit</text>
            <text x="20" y="110" fontSize="14" fill="#9ca3af">Another point</text>
            <text x="20" y="140" fontSize="14" fill="#9ca3af">Support</text>
          </g>
        ))}
      </svg>
    )
  },
  {
    id: 'theme-14',
    name: 'Contact Card',
    slots: ['name', 'role', 'email', 'phone', 'brand', 'accent', 'image'],
    render: (s) => (
      <svg viewBox="0 0 1200 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="320" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,80)">
          <ImageRect href={s.image} x={0} y={-20} width={96} height={96} rx={16} />
          <text x="120" y="0" fontSize="24" fontWeight={700} fill="#e5e7eb">{safe(s.name, 'Jordan Lee')}</text>
          <text x="120" y="28" fontSize="14" fill={safe(s.accent, '#22d3ee')}>{safe(s.role, 'Partnerships')}</text>
          <text x="120" y="56" fontSize="14" fill="#9ca3af">{safe(s.email, 'jordan@example.com')}</text>
          <text x="120" y="80" fontSize="14" fill="#9ca3af">{safe(s.phone, '+1 (555) 123-4567')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-15',
    name: 'Newsletter Signup',
    slots: ['title', 'subtitle', 'placeholder', 'button', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="320" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,110)">
          <text x="0" y="0" fontSize="24" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Stay in the loop')}</text>
          <text x="0" y="28" fontSize="14" fill="#9ca3af">{safe(s.subtitle, 'Industry insights, no spam.')}</text>
          <rect x="0" y="48" width="380" height="40" rx="10" fill="#111827" />
          <text x="16" y="74" fontSize="14" fill="#6b7280">{safe(s.placeholder, 'Enter your email')}</text>
          <rect x="396" y="48" width="160" height="40" rx="10" fill={safe(s.accent, '#22d3ee')} />
          <text x="426" y="74" fontSize="16" fontWeight={600} fill="#0b0f1a">{safe(s.button, 'Subscribe')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-16',
    name: 'Steps Vertical',
    slots: ['title', 's1', 's2', 's3', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 420" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="420" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'How it works')}</text>
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(120, ${120 + i*90})`}>
            <circle cx="0" cy="0" r="12" fill={safe(s.accent, '#22d3ee')} />
            <rect x="16" y="-12" width="860" height="40" rx="8" fill="#111827" />
            <text x="28" y="12" fontSize="14" fill="#e5e7eb">{safe((s as any)[`s${i+1}`], `Step ${i+1} description`)}</text>
          </g>
        ))}
      </svg>
    )
  },
  {
    id: 'theme-17',
    name: 'Hero Curve',
    slots: ['title', 'subtitle', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="360" fill={safe(s.brand, '#0b0f1a')} />
        <path d="M0,300 C300,240 900,360 1200,280 L1200,360 L0,360 Z" fill={safe(s.accent, '#22d3ee')} opacity="0.15" />
        <g transform="translate(120,140)" fill="#e5e7eb">
          <text x="0" y="0" fontSize="36" fontWeight={700}>{safe(s.title, 'Deliver with confidence')}</text>
          <text x="0" y="36" fontSize="16" opacity="0.85">{safe(s.subtitle, 'Reliable outcomes for modern teams.')}</text>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-18',
    name: 'Quote Wide',
    slots: ['quote', 'author', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="320" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="140" fontSize="24" fill="#e5e7eb">“{safe(s.quote, 'This changed the way we operate.')}”</text>
        <text x="120" y="176" fontSize="14" fill={safe(s.accent, '#22d3ee')}>— {safe(s.author, 'Taylor Nguyen')}</text>
        <rect x="1120" y="24" width="4" height="48" fill={safe(s.accent, '#22d3ee')} />
      </svg>
    )
  },
  {
    id: 'theme-19',
    name: 'Two Column',
    slots: ['title', 'left', 'right', 'brand', 'accent', 'image'],
    render: (s) => (
      <svg viewBox="0 0 1200 420" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="420" fill={safe(s.brand, '#0b0f1a')} />
        <g transform="translate(120,80)">
          <text x="0" y="0" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'Why choose us')}</text>
          <g transform="translate(0,24)">
            <text x="0" y="40" fontSize="14" fill="#9ca3af" style={{whiteSpace:'pre-line'}}>{safe(s.left, 'Left column content')}</text>
            <text x="440" y="40" fontSize="14" fill="#9ca3af" style={{whiteSpace:'pre-line'}}>{safe(s.right, 'Right column content')}</text>
            <ImageRect href={s.image} x={880} y={-20} width={160} height={120} rx={12} />
          </g>
        </g>
      </svg>
    )
  },
  {
    id: 'theme-20',
    name: 'Checklist',
    slots: ['title', 'i1', 'i2', 'i3', 'i4', 'brand', 'accent'],
    render: (s) => (
      <svg viewBox="0 0 1200 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="360" fill={safe(s.brand, '#0b0f1a')} />
        <text x="120" y="80" fontSize="28" fontWeight={700} fill="#e5e7eb">{safe(s.title, 'What you get')}</text>
        {[0,1,2,3].map(i => (
          <g key={i} transform={`translate(120, ${110 + i*56})`}>
            <rect x="0" y="-16" width="24" height="24" rx="6" fill={safe(s.accent, '#22d3ee')} opacity="0.25" />
            <path d="M5 0 L10 8 L20 -6" transform="translate(2,8)" stroke={safe(s.accent, '#22d3ee')} strokeWidth="2" fill="none" />
            <text x="36" y="0" fontSize="14" fill="#e5e7eb">{safe((s as any)[`i${i+1}`], `Checklist item ${i+1}`)}</text>
          </g>
        ))}
      </svg>
    )
  },
]

export function getTheme(themeId: string) {
  return svgThemes.find(t => t.id === themeId)
}

export function SvgThemeRender({ themeId, slots }: { themeId: string; slots: Record<string, string> }) {
  const t = getTheme(themeId)
  if (!t) return null
  return t.render(slots)
}
