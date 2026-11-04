/**
 * Shared application screen type.
 * Kept in types/ to avoid circular imports between App.tsx and screen files.
 * The old screen files reference this during compilation even though they are
 * no longer mounted by App.tsx — keeping them compiling prevents build errors.
 */
export type AppScreen =
  | 'home'
  | 'basics'
  | 'practice'
  | 'challenge'
  | 'progress'
  | 'arithmetic';
