/**
 * ID generation utilities
 */
export function makeId(prefix = "id") {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}
export function makeSessionId() {
    return makeId("session");
}
export function makeStepId() {
    return makeId("step");
}
