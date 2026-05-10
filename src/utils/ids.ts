/**
 * ID generation utilities
 */

export function makeId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export function makeSessionId(): string {
  return makeId("session");
}

export function makeStepId(): string {
  return makeId("step");
}
