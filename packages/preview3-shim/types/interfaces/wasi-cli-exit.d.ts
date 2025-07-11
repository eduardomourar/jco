/** @module Interface wasi:cli/exit@0.3.0 **/
/**
 * Exit the current instance and any linked instances.
 */
export function exit(status: Result<void, void>): void;
export type Result<T, E> = { tag: 'ok', val: T } | { tag: 'err', val: E };
