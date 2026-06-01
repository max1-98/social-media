// Barrel for the atoms layer. Cross-layer imports MUST come through this file
// (enforced by ESLint `boundaries/entry-point`); every atom is re-exported here
// (enforced by the custom `barrel-complete` check).
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
