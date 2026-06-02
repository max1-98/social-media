import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import type { Coordinates } from "../../types";
import { Alert, Button, Input } from "../atoms";

/** The geocoded result a consumer resolves an address into. */
export interface AddressResult {
  lat_lng: Coordinates;
  formatted_address: string;
}

interface AddressFields {
  street: string;
  town: string;
  county: string;
  postcode: string;
}

const EMPTY_FIELDS: AddressFields = { street: "", town: "", county: "", postcode: "" };

export interface AddressFormProps {
  /**
   * Resolve the joined address to a geocoded result. The page wires this to
   * `clubsApi.addAddress` (POST `/api/club/add-address`, Nominatim server-side);
   * the molecule stays free of the `api` layer per atomic-design boundaries.
   */
  onSubmit: (address: string) => Promise<AddressResult>;
}

/**
 * Molecule: collects a club's address (street/town/county/postcode), joins the
 * parts into a single query and hands it to `onSubmit` for server-side geocoding
 * (Nominatim). On success it surfaces the `formatted_address` and coordinates;
 * on failure it shows the error in an `Alert`.
 */
export function AddressForm({ onSubmit }: AddressFormProps): ReactElement {
  const [fields, setFields] = useState<AddressFields>(EMPTY_FIELDS);
  const [result, setResult] = useState<AddressResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(name: keyof AddressFields, value: string): void {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const address = [fields.street, fields.town, fields.county, fields.postcode]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");
    if (address === "") {
      setError("Enter at least one part of the address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const resolved = await onSubmit(address);
      setResult(resolved);
    } catch {
      setError("We could not find that address. Add more detail and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} aria-label="Club address">
      <Alert severity="info">
        Enter as much of the club&apos;s address as you know, then submit. We look up the location
        automatically. If the result looks wrong, add more detail and resubmit.
      </Alert>
      <Input
        label="Street"
        name="street"
        value={fields.street}
        onChange={(event) => {
          update("street", event.target.value);
        }}
        fullWidth
        margin="normal"
      />
      <Input
        label="Town"
        name="town"
        value={fields.town}
        onChange={(event) => {
          update("town", event.target.value);
        }}
        fullWidth
        margin="normal"
      />
      <Input
        label="County"
        name="county"
        value={fields.county}
        onChange={(event) => {
          update("county", event.target.value);
        }}
        fullWidth
        margin="normal"
      />
      <Input
        label="Postcode"
        name="postcode"
        value={fields.postcode}
        onChange={(event) => {
          update("postcode", event.target.value);
        }}
        fullWidth
        margin="normal"
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit address"}
      </Button>
      {error !== null ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}
      {result !== null ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Found: {result.formatted_address} ({result.lat_lng.lat.toFixed(4)},{" "}
          {result.lat_lng.lng.toFixed(4)})
        </Alert>
      ) : null}
    </form>
  );
}
