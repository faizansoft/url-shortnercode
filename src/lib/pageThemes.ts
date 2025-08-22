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

import type { Branding } from './pageBranding'
import type { Block } from '@/types/pageBlocks'

export type ThemePreset = {
  id: string
  name: string
  theme: Theme
  // Optional metadata for gallery
  useCases?: string[] // e.g., ['Link-in-bio','Products','Event']
  styles?: string[]   // e.g., ['Minimal','Bold','Gradient','Photo-heavy']
  popularity?: number // higher appears first when sorting by popularity
  preview?: string    // static path to preview image
  starterBranding?: Partial<Branding>
  starterBlocks?: Block[]
}

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
    },
    useCases: ['Link-in-bio','Digital business card'],
    styles: ['Bold','Gradient'],
    popularity: 95,
    preview: '/previews/neon-dark.svg',
    starterBranding: {
      brandColor: '#22d3ee',
      accentColor: '#a78bfa',
      hero: { height: 360, align: 'center' },
    },
    starterBlocks: [
      { id: 'h1', type: 'hero', heading: 'The Grand Hotel', subheading: 'Your new escape awaits' },
      { id: 'b1', type: 'button', label: 'Website', href: 'https://example.com' },
      { id: 'b2', type: 'button', label: 'Book your stay', href: 'https://example.com/book' },
      { id: 't1', type: 'text', text: 'Follow us on Instagram, YouTube, and X for updates.' },
    ]
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
    },
    useCases: ['Promotions','Products'],
    styles: ['Warm','Gradient','Photo-heavy'],
    popularity: 90,
    preview: '/previews/sunset.svg',
    starterBranding: {
      brandColor: '#fb7185',
      accentColor: '#f59e0b',
      hero: { height: 340, align: 'center' },
    },
    starterBlocks: [
      { id: 's-hero', type: 'hero', heading: 'Summer Pop-Up', subheading: 'Limited-time offers every week' },
      { id: 's-btn1', type: 'button', label: 'Shop Now', href: 'https://example.com/shop' },
      { id: 's-img1', type: 'image', src: 'https://images.unsplash.com/photo-1520975922323-2f680d2c1c6e?q=80&w=1200&auto=format', alt: 'Sunset product', rounded: true },
      { id: 's-text1', type: 'text', text: 'Free shipping on orders over $50. New drops every Friday.' },
    ]
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
    },
    useCases: ['Digital business card','Products','SaaS'],
    styles: ['Professional','Minimal'],
    popularity: 98,
    preview: '/previews/business.svg',
    starterBranding: {
      brandColor: '#2563eb',
      accentColor: '#0ea5e9',
      hero: { height: 300, align: 'left' },
      coverUrl: null,
    },
    starterBlocks: [
      { id: 'bb-hero', type: 'hero', heading: 'Apex Consulting', subheading: 'We help you ship faster' },
      { id: 'bb-text1', type: 'text', text: 'Strategy • Delivery • Training' },
      { id: 'bb-btn', type: 'button', label: 'Book a Call', href: 'https://cal.com/' },
      { id: 'bb-card', type: 'product-card', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format', title: 'Fractional CTO', subtitle: 'Hands-on leadership for your engineering org', ctaLabel: 'Learn more', ctaHref: 'https://example.com/cto' },
    ]
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
    },
    useCases: ['Portfolio','Link-in-bio'],
    styles: ['Soft','Minimal'],
    popularity: 80,
    preview: '/previews/pastel.svg',
    starterBranding: {
      brandColor: '#60a5fa',
      accentColor: '#f472b6',
      hero: { height: 320, align: 'center' },
    },
    starterBlocks: [
      { id: 'pl-hero', type: 'hero', heading: 'Ava Monroe', subheading: 'Designer & illustrator' },
      { id: 'pl-btn', type: 'button', label: 'Portfolio', href: 'https://example.com/portfolio' },
      { id: 'pl-img', type: 'image', src: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1200&auto=format', alt: 'Pastel artwork', rounded: true },
    ]
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
    },
    useCases: ['Portfolio','Digital business card'],
    styles: ['Minimal','Monochrome'],
    popularity: 75,
    preview: '/previews/mono.svg',
    starterBranding: {
      brandColor: '#ffffff',
      accentColor: '#94a3b8',
      hero: { height: 280, align: 'left' },
    },
    starterBlocks: [
      { id: 'm-hero', type: 'hero', heading: 'Alex Carter', subheading: 'Software Engineer' },
      { id: 'm-text', type: 'text', text: 'Building delightful products and scalable systems.' },
      { id: 'm-btn', type: 'button', label: 'GitHub', href: 'https://github.com/' },
    ]
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
    },
    useCases: ['Promotions','Event'],
    styles: ['Warm','Gradient'],
    popularity: 82,
    preview: '/previews/warm.svg',
    starterBranding: {
      brandColor: '#f97316',
      accentColor: '#f43f5e',
      hero: { height: 340, align: 'center' },
    },
    starterBlocks: [
      { id: 'w-hero', type: 'hero', heading: 'Autumn Fest', subheading: 'Live music • Food trucks • Local makers' },
      { id: 'w-btn', type: 'button', label: 'Get Tickets', href: 'https://example.com/tickets' },
      { id: 'w-text', type: 'text', text: 'Saturday 6PM • Riverfront Park' },
    ]
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
    },
    useCases: ['Products','Restaurant'],
    styles: ['Fresh','Minimal'],
    popularity: 70,
    preview: '/previews/mint.svg',
    starterBranding: {
      brandColor: '#34d399',
      accentColor: '#22d3ee',
      hero: { height: 320, align: 'left' },
    },
    starterBlocks: [
      { id: 'mf-hero', type: 'hero', heading: 'Green Bowl', subheading: 'Fresh & healthy eats' },
      { id: 'mf-card', type: 'product-card', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format', title: 'Signature Salad', subtitle: 'Kale • Avocado • Quinoa • Citrus', ctaLabel: 'Order', ctaHref: 'https://example.com/order' },
      { id: 'mf-btn', type: 'button', label: 'Find us', href: 'https://maps.google.com' },
    ]
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
    },
    useCases: ['Event','Portfolio'],
    styles: ['Luxury','Bold'],
    popularity: 78,
    preview: '/previews/royal.svg',
    starterBranding: {
      brandColor: '#8b5cf6',
      accentColor: '#f59e0b',
      hero: { height: 360, align: 'center' },
    },
    starterBlocks: [
      { id: 'r-hero', type: 'hero', heading: 'Golden Gala', subheading: 'A night to remember' },
      { id: 'r-btn', type: 'button', label: 'RSVP', href: 'https://example.com/rsvp' },
      { id: 'r-img', type: 'image', src: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format', alt: 'Elegant venue', rounded: true },
    ]
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
    },
    useCases: ['Link-in-bio','SaaS'],
    styles: ['Cool','Gradient'],
    popularity: 85,
    preview: '/previews/ocean.svg',
    starterBranding: {
      brandColor: '#06b6d4',
      accentColor: '#2563eb',
      hero: { height: 320, align: 'left' },
    },
    starterBlocks: [
      { id: 'o-hero', type: 'hero', heading: 'Wave Studio', subheading: 'Crafting calm digital experiences' },
      { id: 'o-text', type: 'text', text: 'UI/UX • Web • Motion' },
      { id: 'o-btn', type: 'button', label: 'Contact', href: 'mailto:hello@example.com' },
    ]
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
    },
    useCases: ['Nonprofit','Event'],
    styles: ['Nature','Soft'],
    popularity: 72,
    preview: '/previews/forest.svg',
    starterBranding: {
      brandColor: '#16a34a',
      accentColor: '#065f46',
      hero: { height: 340, align: 'center' },
    },
    starterBlocks: [
      { id: 'f-hero', type: 'hero', heading: 'Evergreen Fund', subheading: 'Protecting wild places' },
      { id: 'f-text', type: 'text', text: 'Join our monthly giving program to sustain conservation.' },
      { id: 'f-btn', type: 'button', label: 'Donate', href: 'https://example.com/donate' },
    ]
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
    },
    useCases: ['Promotions','Link-in-bio'],
    styles: ['Playful','Bold'],
    popularity: 77,
    preview: '/previews/playful.svg',
    starterBranding: {
      brandColor: '#f43f5e',
      accentColor: '#06b6d4',
      hero: { height: 320, align: 'center' },
    },
    starterBlocks: [
      { id: 'p-hero', type: 'hero', heading: 'Pop Lab', subheading: 'Colorful merch & gifts' },
      { id: 'p-card', type: 'product-card', image: 'https://images.unsplash.com/photo-1520975922323-2f680d2c1c6e?q=80&w=1200&auto=format', title: 'Sticker Pack', subtitle: 'Holographic • Matte • Vinyl', ctaLabel: 'Buy', ctaHref: 'https://example.com/buy' },
      { id: 'p-btn', type: 'button', label: 'Follow', href: 'https://instagram.com/' },
    ]
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
    },
    useCases: ['Products','Portfolio'],
    styles: ['Soft','Pastel'],
    popularity: 68,
    preview: '/previews/pastel-green.svg',
    starterBranding: {
      brandColor: '#a7f3d0',
      accentColor: '#6ee7b7',
      hero: { height: 320, align: 'center' },
    },
    starterBlocks: [
      { id: 'pg-hero', type: 'hero', heading: 'Leaf & Loom', subheading: 'Handmade home goods' },
      { id: 'pg-img', type: 'image', src: 'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=1200&auto=format', alt: 'Home goods', rounded: true },
      { id: 'pg-btn', type: 'button', label: 'Shop', href: 'https://example.com/shop' },
    ]
  },
]
