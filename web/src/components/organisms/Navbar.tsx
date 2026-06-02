import AddBoxIcon from "@mui/icons-material/AddBox";
import CasinoIcon from "@mui/icons-material/Casino";
import GroupsIcon from "@mui/icons-material/Groups";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import Person2Icon from "@mui/icons-material/Person2";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import Toolbar from "@mui/material/Toolbar";
import { useState } from "react";
import type { ComponentType, ReactElement } from "react";
import { Link as RouterLink, NavLink } from "react-router-dom";

import { Avatar, Button, Icon, Text } from "../atoms";

/** A single navigation destination rendered in the drawer. */
export interface NavItem {
  /** Visible label. */
  label: string;
  /** Client-side route (react-router path). */
  to: string;
  /** Leading MUI icon component. */
  icon: ComponentType<SvgIconProps>;
}

/** Minimal identity the navbar needs to render the signed-in user. */
export interface NavbarUserSummary {
  username: string;
}

export interface NavbarProps {
  /** The signed-in user, or `null` when anonymous. */
  user: NavbarUserSummary | null;
  /** Invoked when the user confirms logout (wire to `useAuth().logout`). */
  onLogout: () => void;
  /** Navigation destinations; defaults to the standard app sidebar. */
  items?: NavItem[];
}

/** Default sidebar destinations, mirroring the legacy navbar items. */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "All clubs", to: "/", icon: GroupsIcon },
  { label: "My clubs", to: "/club/my-clubs", icon: GroupsIcon },
  { label: "Discover clubs", to: "/clubs", icon: TravelExploreIcon },
  { label: "My events", to: "/events", icon: CasinoIcon },
  { label: "Create club", to: "/club/create", icon: AddBoxIcon },
  { label: "Past games", to: "/account/past-games", icon: CasinoIcon },
  { label: "Profile", to: "/account/profile", icon: Person2Icon },
];

/**
 * Organism: the application navigation shell. Replaces the legacy
 * `react-pro-sidebar` with a MUI `AppBar` + `Drawer`/`List`. Presentational —
 * the current user and logout action are injected as props so the organism does
 * not reach into hooks/contexts (Atomic Design boundary). Pages wire `useAuth`.
 */
export function Navbar({ user, onLogout, items = DEFAULT_NAV_ITEMS }: NavbarProps): ReactElement {
  const [open, setOpen] = useState(false);

  const closeDrawer = (): void => {
    setOpen(false);
  };

  return (
    <AppBar position="static" component="div">
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="Open navigation"
          onClick={() => {
            setOpen(true);
          }}
          sx={{ mr: 2 }}
        >
          <Icon as={MenuIcon} />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <RouterLink to="/" style={{ color: "inherit", textDecoration: "none" }}>
            <Text variant="h6" component="span" sx={{ color: "inherit" }}>
              Sports Social
            </Text>
          </RouterLink>
        </Box>

        {user !== null && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>{user.username.charAt(0).toUpperCase()}</Avatar>
            <Text variant="body2" sx={{ color: "inherit" }}>
              {user.username}
            </Text>
          </Box>
        )}
      </Toolbar>

      <Drawer anchor="left" open={open} onClose={closeDrawer}>
        <Box component="nav" aria-label="Main navigation" role="navigation" sx={{ width: 260 }}>
          <List>
            {items.map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton
                  component={NavLink}
                  to={item.to}
                  onClick={closeDrawer}
                  end={item.to === "/"}
                >
                  <ListItemIcon>
                    <Icon as={item.icon} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider />

          {user !== null && (
            <Box sx={{ p: 2 }}>
              <Button
                onClick={() => {
                  closeDrawer();
                  onLogout();
                }}
              >
                <Icon as={LogoutIcon} fontSize="small" /> Logout
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
}
