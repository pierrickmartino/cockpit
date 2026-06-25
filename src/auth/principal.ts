/**
 * The single v1 trust boundary (per ADR-0009): an authenticated Admin versus
 * everyone else. There are no per-viewer accounts; `public` is the open default.
 */
export type Principal = 'admin' | 'public'
