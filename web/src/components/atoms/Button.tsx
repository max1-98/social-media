import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Atom: the lowest-level button primitive. In Phase 6 this wraps the MUI
 * primitive. Atoms must not import molecules/organisms (enforced by ESLint
 * `boundaries` in Phase 2).
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}
