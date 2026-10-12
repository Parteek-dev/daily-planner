/**
 * src/types/index.ts
 *
 * Shared TypeScript interfaces and type aliases used across the app.
 * Import from here rather than defining the same shape in multiple files.
 *
 * Example:
 *   import type { TopicColor } from '@/src/types'
 */

// Re-export domain types that are safe to share across layers.
// Add to this file as the codebase grows.
export type { Task } from '@/src/lib/firestoreMappers'
