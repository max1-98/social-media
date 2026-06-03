import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiRequestError, clubsApi } from "../api";
import type { AddressResponse } from "../api";
import { Alert, Avatar, Button, Spinner, Text } from "../components/atoms";
import { AddressForm, LogoUploader, SocialLink } from "../components/molecules";
import type { AddressResult } from "../components/molecules";
import { ClubRequests, MapView, MemberTable } from "../components/organisms";
import { useAuth } from "../hooks";
import type { Club, Member, MemberRequest, Social } from "../types";

const MEMBERSHIP_NONE = 0;
const MEMBERSHIP_PENDING = 1;
const MEMBERSHIP_MEMBER = 2;

/**
 * Page — route `/club/:clubId`. A club's detail screen: header (logo, name,
 * sport, info), a small location {@link MapView}, social links, and a join/leave
 * or cancel-request action. For admins it adds the member roster
 * ({@link MemberTable}), pending join requests ({@link ClubRequests}), logo
 * upload and an {@link AddressForm} wired to `clubsApi.addAddress`.
 */
export function ClubDetailPage(): ReactElement {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [socials, setSocials] = useState<Social[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadClub = useCallback((): void => {
    if (clubId === undefined) return;
    clubsApi
      .clubDetail(clubId)
      .then(setClub)
      .catch((err: unknown) => {
        setError(err instanceof ApiRequestError ? err.message : "Failed to load club.");
      });
  }, [clubId]);

  const loadAdminData = useCallback((): void => {
    if (clubId === undefined) return;
    void clubsApi
      .clubMembers(clubId)
      .then(setMembers)
      .catch(() => undefined);
    void clubsApi
      .clubRequests(clubId)
      .then(setRequests)
      .catch(() => undefined);
  }, [clubId]);

  useEffect(() => {
    if (clubId === undefined) return;
    loadClub();
    void clubsApi
      .clubSocials(clubId)
      .then(setSocials)
      .catch(() => undefined);
  }, [clubId, loadClub]);

  useEffect(() => {
    if (club?.is_club_admin === true) loadAdminData();
  }, [club?.is_club_admin, loadAdminData]);

  const handleAddress = useCallback(
    async (address: string): Promise<AddressResult> => {
      if (clubId === undefined) throw new Error("No club");
      const result: AddressResponse = await clubsApi.addAddress({
        club_id: Number(clubId),
        address,
      });
      loadClub();
      return result;
    },
    [clubId, loadClub],
  );

  const handleUploadLogo = useCallback(
    async (file: File): Promise<void> => {
      if (clubId === undefined) throw new Error("No club");
      await clubsApi.uploadLogo(clubId, file);
      loadClub();
    },
    [clubId, loadClub],
  );

  const handleRemoveLogo = useCallback(async (): Promise<void> => {
    if (clubId === undefined) throw new Error("No club");
    await clubsApi.removeLogo(clubId);
    loadClub();
  }, [clubId, loadClub]);

  const handleJoin = useCallback((): void => {
    if (club === null) return;
    void clubsApi
      .createRequest(club.id)
      .then(loadClub)
      .catch(() => undefined);
  }, [club, loadClub]);

  const handleCancel = useCallback((): void => {
    if (club === null) return;
    void clubsApi
      .cancelRequest(club.id)
      .then(loadClub)
      .catch(() => undefined);
  }, [club, loadClub]);

  const handleLeave = useCallback((): void => {
    if (club === null) return;
    void clubsApi
      .leaveClub(club.id)
      .then(loadClub)
      .catch(() => undefined);
  }, [club, loadClub]);

  const handlePromote = useCallback(
    (member: Member): void => {
      if (club === null) return;
      void clubsApi
        .promoteMember(club.id, member.id)
        .then(loadAdminData)
        .catch(() => undefined);
    },
    [club, loadAdminData],
  );

  const handleDemote = useCallback(
    (member: Member): void => {
      if (club === null) return;
      void clubsApi
        .demoteMember(club.id, member.id)
        .then(loadAdminData)
        .catch(() => undefined);
    },
    [club, loadAdminData],
  );

  const handleRemove = useCallback(
    (member: Member): void => {
      if (club === null) return;
      void clubsApi
        .removeMember(club.id, member.id)
        .then(loadAdminData)
        .catch(() => undefined);
    },
    [club, loadAdminData],
  );

  const handleAccept = useCallback(
    (request: MemberRequest): void => {
      if (club === null) return;
      void clubsApi
        .acceptRequest(club.id, request.id)
        .then(loadAdminData)
        .catch(() => undefined);
    },
    [club, loadAdminData],
  );

  const handleReject = useCallback(
    (request: MemberRequest): void => {
      if (club === null) return;
      void clubsApi
        .rejectRequest(club.id, request.id)
        .then(loadAdminData)
        .catch(() => undefined);
    },
    [club, loadAdminData],
  );

  if (clubId === undefined) {
    return <Alert severity="error">No club specified.</Alert>;
  }

  if (club === null) {
    return error !== null ? <Alert severity="error">{error}</Alert> : <Spinner />;
  }

  return (
    <Stack spacing={3}>
      {error !== null && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Avatar
          src={club.logo || undefined}
          alt={`${club.name} logo`}
          sx={{ width: 64, height: 64 }}
        >
          {club.name.charAt(0)}
        </Avatar>
        <div>
          <Text variant="h1">{club.name}</Text>
          <Text variant="subtitle1" color="text.secondary">
            {club.sport_type?.name ?? "No sport"} · @{club.club_username}
          </Text>
        </div>
      </Stack>
      <Text>{club.info}</Text>

      {socials.length > 0 && (
        <Stack direction="row" spacing={2}>
          {socials.map((social) => (
            <SocialLink key={social.platform} social={social} />
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={1}>
        {user !== null && club.membership_status === MEMBERSHIP_NONE && (
          <Button onClick={handleJoin}>Request to join</Button>
        )}
        {club.membership_status === MEMBERSHIP_PENDING && (
          <Button onClick={handleCancel}>Cancel request</Button>
        )}
        {club.membership_status === MEMBERSHIP_MEMBER && !club.is_club_president && (
          <Button onClick={handleLeave}>Leave club</Button>
        )}
        {club.is_club_admin && (
          <Button
            onClick={() => {
              void navigate(`/club/edit/${String(club.id)}`);
            }}
          >
            Edit club
          </Button>
        )}
      </Stack>

      {club.coordinates !== null && (
        <Box sx={{ height: 280, width: "100%" }}>
          <MapView
            center={club.coordinates}
            zoom={14}
            clubs={[{ id: club.id, name: club.name, coordinates: club.coordinates }]}
            ariaLabel={`${club.name} location map`}
          />
        </Box>
      )}

      {club.is_club_admin && (
        <Box>
          <Divider sx={{ mb: 3 }} />
          <Text variant="h2" gutterBottom>
            Members
          </Text>
          <MemberTable
            members={members}
            isPresident={club.is_club_president}
            isAdmin={club.is_club_admin}
            onPromote={handlePromote}
            onDemote={handleDemote}
            onRemove={handleRemove}
          />

          <Divider sx={{ my: 3 }} />
          <Text variant="h2" gutterBottom>
            Member requests
          </Text>
          <ClubRequests requests={requests} onAccept={handleAccept} onReject={handleReject} />

          <Divider sx={{ my: 3 }} />
          <Text variant="h2" gutterBottom>
            Club logo
          </Text>
          <LogoUploader
            currentLogo={club.logo}
            clubName={club.name}
            onUpload={handleUploadLogo}
            onRemove={handleRemoveLogo}
          />

          <Divider sx={{ my: 3 }} />
          <Text variant="h2" gutterBottom>
            Address
          </Text>
          <AddressForm onSubmit={handleAddress} />
        </Box>
      )}
    </Stack>
  );
}
