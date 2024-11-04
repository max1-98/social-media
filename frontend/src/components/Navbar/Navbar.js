import * as React from 'react';

import { Link } from 'react-router-dom';
import { useState } from 'react';

import { Collapse, Drawer, List, ListItemButton, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import StarBorder from '@mui/icons-material/StarBorder';
import { ColorModeContext, tokens } from '../../theme';

const Navbar = (props) => { 
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const colorMode = React.useContext(ColorModeContext);
    const {collapsed, setCollapsed} = props

    const [open, setOpen] = useState(false);

    const handleClick = () => {
      setOpen(!open);
    };

    return (
      
      <div className="sidebar-container">
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: collapsed ? 60 : 240, // This is where the collapsing occurs 
            boxSizing: 'border-box',
          },
        }}
      >
        <List>
          <ListItemButton onClick={handleClick}>
            <ListItemIcon>
              <StarBorder />
            </ListItemIcon>
            <ListItemText primary="Account" />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton component={Link} to="/account/profile" style={{textDecoration: 'none', color: 'inherit'}}> 
                <ListItemIcon>
                  <StarBorder />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItemButton>
              <ListItemButton component={Link} to="/club/myClubs" style={{textDecoration: 'none', color: 'inherit'}}>
                <ListItemIcon>
                  <StarBorder />
                </ListItemIcon>
                <ListItemText primary="My Clubs" />
              </ListItemButton>
              <ListItemButton component={Link} to="/account/past-games" style={{textDecoration: 'none', color: 'inherit'}}>
                <ListItemIcon>
                  <StarBorder />
                </ListItemIcon>
                <ListItemText primary="Past Games" />
              </ListItemButton>
            </List>
          </Collapse>
          <ListItemButton component={Link} to="/" style={{textDecoration: 'none', color: 'inherit'}}> 
            <ListItemIcon>
              <StarBorder />
            </ListItemIcon>
            <ListItemText primary="All Clubs" />
          </ListItemButton>
          <ListItemButton component={Link} to="/club/create" style={{textDecoration: 'none', color: 'inherit'}}>
            <ListItemIcon>
              <StarBorder />
            </ListItemIcon>
            <ListItemText primary="Create Club" />
          </ListItemButton>
          <ListItemButton component={Link} to="/account/logout" style={{textDecoration: 'none', color: 'inherit'}}>
            <ListItemIcon>
              <StarBorder />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
          <ListItemButton component={Link} onClick={colorMode.toggleColorMode} style={{textDecoration: 'none', color: 'inherit'}}>
            <ListItemIcon>
              <StarBorder />
            </ListItemIcon>
            {theme.palette.mode === 'dark' ? (
            <ListItemText primary="Light mode" />
            )
            :
            <ListItemText primary="Dark mode" />
            }
          </ListItemButton>
        </List>
      </Drawer>
    </div>
    )
}

export default Navbar

