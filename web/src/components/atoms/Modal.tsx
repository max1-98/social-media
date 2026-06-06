import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactElement, ReactNode } from "react";

export interface ModalProps {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called when the user dismisses the dialog (backdrop, escape, Cancel). */
  onClose: () => void;
  /** Heading text, also used as the dialog's accessible name. */
  title: string;
  /** Dialog body. */
  children: ReactNode;
  /** Footer action buttons (e.g. Cancel + a primary action). */
  actions?: ReactNode;
}

/**
 * Atom: a reusable modal built on MUI's `Dialog`. Wraps the
 * `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` structure so consumers
 * pass a `title`, `children`, and an `actions` footer without touching MUI's
 * dialog parts directly.
 */
export function Modal({ open, onClose, title, children, actions }: ModalProps): ReactElement {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="modal-title" fullWidth maxWidth="sm">
      <DialogTitle id="modal-title">{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions !== undefined ? <DialogActions>{actions}</DialogActions> : null}
    </Dialog>
  );
}
