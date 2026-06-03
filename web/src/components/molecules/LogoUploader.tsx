import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent, ReactElement } from "react";

import { Alert, Avatar, Button, Icon, Spinner, Text } from "../atoms";

export interface LogoUploaderProps {
  /** Current logo URL from the server (empty string / undefined when none). */
  currentLogo?: string;
  /** Club name, used for the preview's accessible alt text. */
  clubName: string;
  /**
   * Upload the chosen file. The page wires this to `clubsApi.uploadLogo`; the
   * molecule stays free of the `api` layer per atomic-design boundaries.
   */
  onUpload: (file: File) => Promise<void>;
  /** Remove the current logo. The page wires this to `clubsApi.removeLogo`. */
  onRemove: () => Promise<void>;
}

/**
 * Molecule: a clean two-state club-logo control. With no logo it shows a styled
 * dashed drop zone (click or drag-and-drop) with an upload prompt; once a logo
 * exists it shows a preview ({@link Avatar}) plus Replace and Remove actions. It
 * owns its upload/remove lifecycle and surfaces failures in an {@link Alert}.
 */
export function LogoUploader({
  currentLogo,
  clubName,
  onUpload,
  onRemove,
}: LogoUploaderProps): ReactElement {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (preview !== null) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const shownSrc =
    preview ?? (currentLogo !== undefined && currentLogo !== "" ? currentLogo : null);
  const busy = uploading || removing;

  function openPicker(): void {
    inputRef.current?.click();
  }

  async function handleFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev !== null) URL.revokeObjectURL(prev);
      return url;
    });
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch {
      setError("Could not upload the logo.");
      setPreview(null);
      URL.revokeObjectURL(url);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) return;
    void handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = event.dataTransfer.files.item(0);
    if (file !== null) void handleFile(file);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  async function handleRemove(): Promise<void> {
    setRemoving(true);
    setError(null);
    try {
      await onRemove();
      setPreview(null);
    } catch {
      setError("Could not remove the logo.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Stack spacing={2}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Club logo file"
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {shownSrc !== null ? (
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar src={shownSrc} alt={`${clubName} logo`} sx={{ width: 64, height: 64 }}>
            {clubName.charAt(0)}
          </Avatar>
          {busy && <Spinner size={24} />}
          <Button variant="outlined" onClick={openPicker} disabled={busy}>
            {uploading ? "Uploading…" : "Replace logo"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => void handleRemove()}
            disabled={busy}
          >
            {removing ? "Removing…" : "Remove"}
          </Button>
        </Stack>
      ) : (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Upload club logo"
          aria-disabled={busy}
          onClick={busy ? undefined : openPicker}
          onKeyDown={handleKeyDown}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => {
            setDragOver(false);
          }}
          onDrop={handleDrop}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            p: 4,
            border: "1px dashed",
            borderColor: dragOver ? "primary.main" : "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
            color: "text.secondary",
            cursor: busy ? "default" : "pointer",
            transition: "border-color 0.15s",
            "&:hover": { borderColor: "primary.main" },
          }}
        >
          {uploading ? (
            <Spinner size={32} />
          ) : (
            <Icon as={CloudUploadIcon} fontSize="large" color="action" />
          )}
          <Text variant="body2">Choose a file or drag it here</Text>
        </Box>
      )}

      {error !== null && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
