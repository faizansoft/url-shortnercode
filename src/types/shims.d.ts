// Temporary shims to satisfy TypeScript in the editor when node_modules are unavailable.
// Remove this file once dependencies are properly installed.

// JSX intrinsic elements to prevent "implicit any" JSX errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// React (very minimal)
declare module 'react' {
  export type FocusEvent<T = Element> = any;
  export type SetStateAction<T> = T | ((prevState: T) => T);
  export function useState<T>(initialState: T | (() => T)): [T, (value: SetStateAction<T>) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  const React: any;
  export default React;
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

declare module 'next/server' {
  export type NextRequest = any;
  export const NextResponse: any;
}
