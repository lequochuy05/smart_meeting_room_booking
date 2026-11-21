/**
 * Single injectable clock. Production code reads time through `now()` so that
 * tests and the standalone adapter can use a deterministic instant.
 */
type NowProvider = () => Date;

const systemClock: NowProvider = () => new Date();
let provider: NowProvider = systemClock;

export function now(): Date {
  return provider();
}

export function setNowProvider(next: NowProvider | null): void {
  provider = next ?? systemClock;
}
