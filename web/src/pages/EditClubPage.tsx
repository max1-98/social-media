import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiRequestError, clubsApi } from "../api";
import type { SocialLinksPayload } from "../api";
import { Alert, Button, Input, Spinner, Text } from "../components/atoms";
import { SportForm } from "../components/molecules";
import type { Club, Social, Sport } from "../types";

const SOCIAL_PLATFORMS: readonly (keyof SocialLinksPayload)[] = [
  "facebook",
  "instagram",
  "whatsapp",
  "website",
];

function socialsToFields(socials: Social[]): SocialLinksPayload {
  const fields: SocialLinksPayload = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const match = socials.find((s) => s.platform.toLowerCase() === platform);
    fields[platform] = match?.url ?? "";
  }
  return fields;
}

/**
 * Page — route `/club/edit/:clubId`. Admin edit screen: rename a club, update
 * its info blurb, change its sport ({@link SportForm}) and set/clear social
 * links. Wires `clubsApi.editClub`, `addSport` and `updateSocials`.
 */
export function EditClubPage(): ReactElement {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [socials, setSocials] = useState<SocialLinksPayload>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clubId === undefined) return;
    let active = true;
    Promise.all([clubsApi.clubDetail(clubId), clubsApi.listSports(), clubsApi.clubSocials(clubId)])
      .then(([detail, sportList, socialList]) => {
        if (!active) return;
        setClub(detail);
        setName(detail.name);
        setInfo(detail.info);
        setSports(sportList);
        setSocials(socialsToFields(socialList));
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof ApiRequestError ? err.message : "Failed to load club.");
      });
    return () => {
      active = false;
    };
  }, [clubId]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (clubId === undefined) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await clubsApi.editClub(clubId, { name, info });
      await clubsApi.updateSocials(clubId, socials);
      setNotice("Club updated.");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const handleAddSport = useCallback(
    async (sportName: string): Promise<void> => {
      if (clubId === undefined) return;
      await clubsApi.addSport({ club_id: Number(clubId), sport_name: sportName });
    },
    [clubId],
  );

  if (clubId === undefined) {
    return <Alert severity="error">No club specified.</Alert>;
  }

  if (club === null) {
    return error !== null ? <Alert severity="error">{error}</Alert> : <Spinner />;
  }

  return (
    <Stack spacing={3}>
      <Text variant="h1">Edit {club.name}</Text>
      <form
        onSubmit={(event) => {
          void handleSave(event);
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {error !== null && <Alert severity="error">{error}</Alert>}
          {notice !== null && <Alert severity="success">{notice}</Alert>}
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Input
            label="Info"
            value={info}
            onChange={(event) => {
              setInfo(event.target.value);
            }}
            multiline
            minRows={3}
          />
          <Text variant="h2">Social links</Text>
          {SOCIAL_PLATFORMS.map((platform) => (
            <Input
              key={platform}
              label={platform.charAt(0).toUpperCase() + platform.slice(1)}
              value={socials[platform] ?? ""}
              onChange={(event) => {
                setSocials((prev) => ({ ...prev, [platform]: event.target.value }));
              }}
            />
          ))}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Stack>
      </form>
      <Divider />
      <Text variant="h2">Sport</Text>
      <SportForm sports={sports} initialSport={club.sport_type.name} onSubmit={handleAddSport} />
      <Divider />
      <Box>
        <Button
          onClick={() => {
            void navigate(`/club/${clubId}`);
          }}
        >
          Back to club
        </Button>
      </Box>
    </Stack>
  );
}
