import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

/**
 * Atom: the lowest-level button primitive. In Phase 6 this wraps the MUI
 * primitive. Atoms import nothing internal except shared types — consumers
 * import it via the layer barrel (`../atoms`), never the deep path.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function Button({ children, ...props }: ButtonProps): ReactElement {
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}
