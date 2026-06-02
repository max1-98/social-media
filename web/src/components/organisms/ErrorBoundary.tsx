import Box from "@mui/material/Box";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { Button, Text } from "../atoms";

/**
 * Organism: a React error boundary (ported from the legacy `ErrorBoundary.jsx`).
 * Catches render errors in its subtree and shows a recoverable fallback. Pass a
 * custom `fallback` to override the default message.
 */
export interface ErrorBoundaryProps {
  /** Subtree to guard. */
  children: ReactNode;
  /** Optional custom fallback rendered when an error is caught. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
          <Text variant="h5" gutterBottom>
            Something went wrong
          </Text>
          <Text variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            An unexpected error occurred. Please try again.
          </Text>
          <Button onClick={this.handleReset}>Try Again</Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
