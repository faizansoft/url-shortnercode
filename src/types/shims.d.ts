// Temporary shims to satisfy TypeScript in the editor when node_modules are unavailable.
// Remove this file once dependencies are properly installed.

// JSX intrinsic elements to prevent "implicit any" JSX errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}


// React namespace for types like React.ReactNode
declare namespace React {
  type ReactNode = any;
}

// dnd-kit core and sortable (only what we use)
declare module '@dnd-kit/core' {
  export const DndContext: any;
  export type DragStartEvent = any;
  export type DragEndEvent = any;
  export const DragOverlay: any;
  export const MouseSensor: any;
  export const TouchSensor: any;
  export function useSensor(sensor: any, options?: any): any;
  export function useSensors(...sensors: any[]): any;
}

declare module '@dnd-kit/sortable' {
  export const useSortable: any;
  export const SortableContext: any;
  export const arrayMove: any;
  export const rectSortingStrategy: any;
}

declare module '@dnd-kit/utilities' {
  export const CSS: any;
}

declare module 'lucide-react' {
  export const GripVertical: any;
  export const X: any;
  export const Plus: any;
}

declare module 'uuid' {
  export function v4(): string;
}

// Minimal Supabase types used across the app
declare module '@supabase/supabase-js' {
  export type User = any;
  export type SupabaseClient = any;
  export function createClient(...args: any[]): any;
}

declare module 'next/server' {
  export type NextRequest = any;
  export const NextResponse: any;
}

// Minimal Next.js types used in app/layout
declare module 'next' {
  export type Metadata = any;
}

// Minimal next/font/google exports used
declare module 'next/font/google' {
  export function Inter(options: any): { variable: string };
  export function Roboto_Mono(options: any): { variable: string };
}

// Global process shim for env access
declare var process: any;
