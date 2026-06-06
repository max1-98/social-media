import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";

import { ApiRequestError, clubsApi, fixturesApi } from "../api";
import { Alert, Button, Input, Modal, Spinner, Text } from "../components/atoms";
import { ClubLeaderboard, FixturePanel } from "../components/organisms";
import type { ProposeFixtureDraft } from "../components/organisms";
import type { Club, ClubLadderEntry, Fixture } from "../types";

function parseIds(raw: string): string[] {
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
}

/**
 * Page — route `/club/:clubId/fixtures`. A club's inter-club schedule and the
 * club ELO ladder. Admins propose fixtures, respond to proposals, record a
 * played result, and confirm; members see the schedule. The club's own club-ELO
 * and member-strength are surfaced from the ladder. All ids are opaque strings.
 */
export function FixturesPage(): ReactElement {
  const { clubId } = useParams();
  const [club, setClub] = useState<Club | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [ladder, setLadder] = useState<ClubLadderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState<Fixture | null>(null);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [score, setScore] = useState("");
  const [recordError, setRecordError] = useState<string | null>(null);

  const loadFixtures = useCallback((): void => {
    if (clubId === undefined) return;
    void fixturesApi
      .listClubFixtures(clubId)
      .then(setFixtures)
      .catch(() => undefined);
  }, [clubId]);

  const loadLadder = useCallback((): void => {
    void fixturesApi
      .clubLeaderboard()
      .then(setLadder)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (clubId === undefined) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void clubsApi
      .clubDetail(clubId)
      .then((detail) => {
        if (!cancelled) setClub(detail);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load club.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    loadFixtures();
    loadLadder();
    return () => {
      cancelled = true;
    };
  }, [clubId, loadFixtures, loadLadder]);

  const ownEntry = useMemo(
    () => (club === null ? undefined : ladder.find((entry) => entry.id === club.id)),
    [club, ladder],
  );

  const handlePropose = useCallback(
    async (draft: ProposeFixtureDraft): Promise<void> => {
      if (clubId === undefined) throw new Error("No club");
      await fixturesApi.proposeFixture(clubId, {
        away_club: draft.awayClub,
        ...(draft.gameType === undefined ? {} : { game_type: draft.gameType }),
        ...(draft.date === undefined ? {} : { date: draft.date }),
      });
      loadFixtures();
    },
    [clubId, loadFixtures],
  );

  const handleAccept = useCallback(
    (fixture: Fixture): void => {
      void fixturesApi
        .acceptFixture(fixture.id)
        .then(loadFixtures)
        .catch(() => undefined);
    },
    [loadFixtures],
  );

  const handleDecline = useCallback(
    (fixture: Fixture): void => {
      void fixturesApi
        .declineFixture(fixture.id)
        .then(loadFixtures)
        .catch(() => undefined);
    },
    [loadFixtures],
  );

  const handleCancel = useCallback(
    (fixture: Fixture): void => {
      void fixturesApi
        .cancelFixture(fixture.id)
        .then(loadFixtures)
        .catch(() => undefined);
    },
    [loadFixtures],
  );

  const handleConfirm = useCallback(
    (fixture: Fixture): void => {
      void fixturesApi
        .confirmFixture(fixture.id)
        .then(() => {
          loadFixtures();
          loadLadder();
        })
        .catch(() => undefined);
    },
    [loadFixtures, loadLadder],
  );

  const openRecord = useCallback((fixture: Fixture): void => {
    setRecording(fixture);
    setHomeTeam("");
    setAwayTeam("");
    setScore("");
    setRecordError(null);
  }, []);

  const closeRecord = useCallback((): void => {
    setRecording(null);
  }, []);

  const submitRecord = useCallback((): void => {
    if (recording === null) return;
    const home = parseIds(homeTeam);
    const away = parseIds(awayTeam);
    if (home.length === 0 || away.length === 0) {
      setRecordError("Enter at least one member id for each team.");
      return;
    }
    if (!/^\d+,\d+$/.test(score.trim())) {
      setRecordError('Enter the score as "s1,s2".');
      return;
    }
    void fixturesApi
      .recordFixtureGame(recording.id, { home_team: home, away_team: away, score: score.trim() })
      .then(() => {
        setRecording(null);
        loadFixtures();
      })
      .catch((err: unknown) => {
        setRecordError(
          err instanceof ApiRequestError ? err.message : "Could not record that result.",
        );
      });
  }, [recording, homeTeam, awayTeam, score, loadFixtures]);

  if (clubId === undefined) {
    return <Alert severity="error">No club specified.</Alert>;
  }
  if (loading) return <Spinner />;
  if (club === null) {
    return <Alert severity="error">{error ?? "Failed to load club."}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <div>
        <Text variant="h1">{club.name} fixtures</Text>
        <Text variant="subtitle1" color="text.secondary">
          Club ELO: {ownEntry?.elo ?? "Unrated"} · Member strength:{" "}
          {ownEntry?.member_strength ?? "—"}
        </Text>
      </div>

      {error !== null && <Alert severity="error">{error}</Alert>}

      <FixturePanel
        fixtures={fixtures}
        clubId={club.id}
        isAdmin={club.is_club_admin}
        onPropose={handlePropose}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onCancel={handleCancel}
        onRecordResult={openRecord}
        onConfirm={handleConfirm}
      />

      <Box>
        <Divider sx={{ mb: 3 }} />
        <Text variant="h2" gutterBottom>
          Club ELO ladder
        </Text>
        <ClubLeaderboard entries={ladder} />
      </Box>

      <Modal
        open={recording !== null}
        onClose={closeRecord}
        title="Record fixture result"
        actions={
          <>
            <Button onClick={closeRecord}>Cancel</Button>
            <Button onClick={submitRecord}>Save result</Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          {recordError !== null && <Alert severity="error">{recordError}</Alert>}
          <Input
            label="Home team member ids (comma separated)"
            value={homeTeam}
            onChange={(event) => {
              setHomeTeam(event.target.value);
            }}
            fullWidth
          />
          <Input
            label="Away team member ids (comma separated)"
            value={awayTeam}
            onChange={(event) => {
              setAwayTeam(event.target.value);
            }}
            fullWidth
          />
          <Input
            label="Score (s1,s2)"
            value={score}
            onChange={(event) => {
              setScore(event.target.value);
            }}
            fullWidth
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
