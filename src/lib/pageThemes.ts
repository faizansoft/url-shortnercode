export type Theme = {
  palette: {
    primary: string
    secondary: string
    surface: string
    foreground: string
    muted: string
    border: string
  }
  gradient: {
    angle: number
    stops: { color: string; at: number }[]
  }
  typography: {
    font: 'system' | 'inter' | 'poppins' | 'outfit' | 'merriweather' | 'space-grotesk' | 'lora'
    baseSize: number
    weight: number
  }
  radius: number
  layout: {
    maxWidth: number
    sectionGap: number
    align: 'left' | 'center'
  }
}

export const defaultTheme: Theme = {
  palette: {
    primary: '#6366f1',
    secondary: '#22c55e',
    surface: '#0b0f1a',
    foreground: '#e5e7eb',
    muted: '#94a3b8',
    border: '#1f2937',
  },
  gradient: { angle: 135, stops: [ { color: '#6366f1', at: 0 }, { color: '#22c55e', at: 100 } ] },
  typography: { font: 'system', baseSize: 16, weight: 500 },
  radius: 12,
  layout: { maxWidth: 768, sectionGap: 24, align: 'left' },
}

export type ThemePreset = { id: string; name: string; theme: Theme }

export const themePresets: ThemePreset[] = [
  {
    id: 'neon-dark',
    name: 'Neon Dark',
    theme: {
      palette: { primary: '#22d3ee', secondary: '#a78bfa', surface: '#0a0a0f', foreground: '#e5e7eb', muted: '#94a3b8', border: '#1f2937' },
      gradient: { angle: 130, stops: [ { color: '#22d3ee', at: 0 }, { color: '#a78bfa', at: 100 } ] },
      typography: { font: 'inter', baseSize: 16, weight: 500 },
      radius: 14,
      layout: { maxWidth: 880, sectionGap: 28, align: 'center' },
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    theme: {
      palette: { primary: '#fb7185', secondary: '#f59e0b', surface: '#0b0b12', foreground: '#f3f4f6', muted: '#9ca3af', border: '#1f2937' },
      gradient: { angle: 160, stops: [ { color: '#fb7185', at: 0 }, { color: '#f59e0b', at: 100 } ] },
      typography: { font: 'poppins', baseSize: 16, weight: 600 },
      radius: 20,
      layout: { maxWidth: 820, sectionGap: 26, align: 'center' },
    }
  },
  {
    id: 'business',
    name: 'Business Blue',
    theme: {
      palette: { primary: '#2563eb', secondary: '#0ea5e9', surface: '#0b1220', foreground: '#e5e7eb', muted: '#9aa3b2', border: '#1e293b' },
      gradient: { angle: 135, stops: [ { color: '#2563eb', at: 0 }, { color: '#0ea5e9', at: 100 } ] },
      typography: { font: 'outfit', baseSize: 16, weight: 500 },
      radius: 12,
      layout: { maxWidth: 900, sectionGap: 30, align: 'left' },
    }
  },
  {
    id: 'pastel',
    name: 'Pastel Light',
    theme: {
      palette: { primary: '#60a5fa', secondary: '#f472b6', surface: '#0e1116', foreground: '#f3f4f6', muted: '#a1a1aa', border: '#1f2937' },
      gradient: { angle: 140, stops: [ { color: '#60a5fa', at: 0 }, { color: '#f472b6', at: 100 } ] },
      typography: { font: 'lora', baseSize: 17, weight: 500 },
      radius: 18,
      layout: { maxWidth: 760, sectionGap: 22, align: 'center' },
    }
  },
  {
    id: 'mono',
    name: 'Mono',
    theme: {
      palette: { primary: '#ffffff', secondary: '#94a3b8', surface: '#0a0a0a', foreground: '#f1f5f9', muted: '#94a3b8', border: '#1f2937' },
      gradient: { angle: 180, stops: [ { color: '#0f172a', at: 0 }, { color: '#111827', at: 100 } ] },
      typography: { font: 'system', baseSize: 15, weight: 500 },
      radius: 10,
      layout: { maxWidth: 840, sectionGap: 24, align: 'left' },
    }
  },
  {
    id: 'warm',
    name: 'Warm Glow',
    theme: {
      palette: { primary: '#f97316', secondary: '#f43f5e', surface: '#0d0f14', foreground: '#f8fafc', muted: '#94a3b8', border: '#1f2937' },
      gradient: { angle: 120, stops: [ { color: '#f97316', at: 0 }, { color: '#f43f5e', at: 100 } ] },
      typography: { font: 'merriweather', baseSize: 17, weight: 500 },
      radius: 16,
      layout: { maxWidth: 820, sectionGap: 26, align: 'center' },
    }
  },
  {
    id: 'mint',
    name: 'Mint Fresh',
    theme: {
      palette: { primary: '#34d399', secondary: '#22d3ee', surface: '#0a1012', foreground: '#e6f1f2', muted: '#86a2a9', border: '#15323a' },
      gradient: { angle: 150, stops: [ { color: '#34d399', at: 0 }, { color: '#22d3ee', at: 100 } ] },
      typography: { font: 'inter', baseSize: 16, weight: 500 },
      radius: 14,
      layout: { maxWidth: 800, sectionGap: 24, align: 'left' },
    }
  },
  {
    id: 'royal',
    name: 'Royal',
    theme: {
      palette: { primary: '#8b5cf6', secondary: '#f59e0b', surface: '#0c0a14', foreground: '#efe7ff', muted: '#b8a5ff', border: '#2a1f3a' },
      gradient: { angle: 125, stops: [ { color: '#8b5cf6', at: 0 }, { color: '#f59e0b', at: 100 } ] },
      typography: { font: 'poppins', baseSize: 16, weight: 600 },
      radius: 22,
      layout: { maxWidth: 860, sectionGap: 28, align: 'center' },
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    theme: {
      palette: { primary: '#06b6d4', secondary: '#2563eb', surface: '#081017', foreground: '#e6f3ff', muted: '#93b4c7', border: '#102436' },
      gradient: { angle: 145, stops: [ { color: '#06b6d4', at: 0 }, { color: '#2563eb', at: 100 } ] },
      typography: { font: 'outfit', baseSize: 16, weight: 500 },
      radius: 12,
      layout: { maxWidth: 900, sectionGap: 30, align: 'left' },
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    theme: {
      palette: { primary: '#16a34a', secondary: '#065f46', surface: '#08100a', foreground: '#ecfdf5', muted: '#6ee7b7', border: '#0d2617' },
      gradient: { angle: 160, stops: [ { color: '#16a34a', at: 0 }, { color: '#065f46', at: 100 } ] },
      typography: { font: 'lora', baseSize: 17, weight: 500 },
      radius: 18,
      layout: { maxWidth: 780, sectionGap: 22, align: 'center' },
    }
  },
  {
    id: 'playful',
    name: 'Playful',
    theme: {
      palette: { primary: '#f43f5e', secondary: '#06b6d4', surface: '#0d0b14', foreground: '#fde68a', muted: '#fca5a5', border: '#2e1f3a' },
      gradient: { angle: 135, stops: [ { color: '#f43f5e', at: 0 }, { color: '#06b6d4', at: 100 } ] },
      typography: { font: 'poppins', baseSize: 16, weight: 600 },
      radius: 20,
      layout: { maxWidth: 760, sectionGap: 24, align: 'center' },
    }
  },
  {
    id: 'pastel-green',
    name: 'Pastel Green',
    theme: {
      palette: { primary: '#a7f3d0', secondary: '#6ee7b7', surface: '#0a0f0d', foreground: '#ecfdf5', muted: '#a7f3d0', border: '#113d2f' },
      gradient: { angle: 140, stops: [ { color: '#a7f3d0', at: 0 }, { color: '#6ee7b7', at: 100 } ] },
      typography: { font: 'merriweather', baseSize: 17, weight: 500 },
      radius: 16,
      layout: { maxWidth: 820, sectionGap: 26, align: 'center' },
    }
  },
]
