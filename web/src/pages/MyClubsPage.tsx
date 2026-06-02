import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

import { ApiRequestError, clubsApi } from "../api";
import { Alert, Avatar, Spinner, Text } from "../components/atoms";
import { PageLayout } from "../components/templates";
import type { MyClub } from "../types";

/**
 * Page — route `/my-clubs`. The clubs the signed-in user belongs to, each a
 * tappable card linking to its detail page. Data comes from `clubsApi.myClubs`.
 */
export function MyClubsPage(): ReactElement {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    clubsApi
      .myClubs()
      .then((data) => {
        if (active) setClubs(data);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof ApiRequestError ? err.message : "Failed to load your clubs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        My clubs
      </Text>
      {error !== null && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Spinner />
      ) : clubs.length === 0 ? (
        <Text>You are not a member of any clubs yet.</Text>
      ) : (
        <Grid container spacing={2}>
          {clubs.map((club) => (
            <Grid key={club.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardActionArea
                  onClick={() => {
                    void navigate(`/club/${String(club.id)}`);
                  }}
                  aria-label={`View ${club.name}`}
                >
                  <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: "center" }}>
                    <Avatar src={club.logo || undefined} alt={`${club.name} logo`}>
                      {club.name.charAt(0)}
                    </Avatar>
                    <div>
                      <Text variant="subtitle1">{club.name}</Text>
                      <Text variant="caption" color="text.secondary">
                        {club.sport_type.name}
                      </Text>
                    </div>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </PageLayout>
  );
}
