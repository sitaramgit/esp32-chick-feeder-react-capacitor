import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CallIcon from '@mui/icons-material/Call';
import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AddchartIcon from '@mui/icons-material/Addchart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { Capacitor } from '@capacitor/core';
 import InsightsIcon from '@mui/icons-material/Insights';
 import CameraIndoorIcon from '@mui/icons-material/CameraIndoor';
  import EngineeringIcon from '@mui/icons-material/Engineering';
import HomeIcon from '@mui/icons-material/Home';
const drawerWidth = 240;

const Layout = () => {
    const navigate = useNavigate();
  const [bottomNav, setBottomNav] = useState<number>(0);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // md = 960px+
const isAndroid = Capacitor.getPlatform() === 'android';
  const Sidebar = (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <List>
        <ListItem sx={{cursor: 'pointer'}} onClick={() => navigateToPage('/climate-chart')} >
          <ListItemIcon>
            <InsightsIcon />
          </ListItemIcon>
          <ListItemText primary="Climate Chart"  />
        </ListItem>
        <ListItem  sx={{cursor: 'pointer'}} onClick={() => navigateToPage('/operate-dispense')} >
          <ListItemIcon>
            <EngineeringIcon />
          </ListItemIcon>
          <ListItemText primary="Operate Dispenser" />
        </ListItem>
        <ListItem >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
    </Drawer>
  );

  const navigateToPage = (path: string) => {
    navigate(path);
  }
  return (
    <Box display="flex" height="100vh" overflow="hidden">
      {/* Side nav for desktop */}
      {isDesktop && Sidebar}

      {/* Main content */}
      <Box
        flexGrow={1}
        display="flex"
        flexDirection="column"
        sx={{
            mt: 1,
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: isDesktop ? 0 : 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Top App Bar */}
        <AppBar
          position="fixed"
          color="default"
          sx={{
            ...(isAndroid && { paddingTop: '25px' }),
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
        <Toolbar>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box onClick={() => navigateToPage('/')} display="flex" color={'rgb(58 168 142)'} alignItems="center" gap={1}>
                <ReceiptIcon />
                <Typography variant="h6" fontWeight="bold">
                  Chick Feeder
                </Typography>
              </Box>
              <NotificationsIcon sx={{color: 'rgb(58 168 142)'}} />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Spacer */}
        <Toolbar />

        {/* Scrollable Middle Content */}
        <Box
           flexGrow={1}
           overflow="auto"
           sx={{
             paddingBottom: isDesktop ? 0 : 'calc(56px + env(safe-area-inset-bottom))', // 56px is default BottomNavigation height
           }}
        >
          <Outlet></Outlet>
        </Box>

        {/* Bottom Navigation only for mobile/tablet */}
        {!isDesktop && (
         <BottomNavigation
         value={bottomNav}
         onChange={(_e, newValue: number) => setBottomNav(newValue)}
         sx={{
           position: 'fixed',
           bottom: 0,
           width: '100%',
           height: 56,
           borderTop: '1px solid #ccc',
           zIndex: 1100,
           backgroundColor: '#fff',
           ...(isAndroid && { paddingBottom: '25px' }),
         }}
       >
      <BottomNavigationAction onClick={() => {navigateToPage('/')}}  label="Settings" icon={<HomeIcon />} />
         <BottomNavigationAction onClick={() => navigateToPage('/climate-chart')} label="Climate Chart" icon={<InsightsIcon />} />
         <BottomNavigationAction onClick={() => navigateToPage('/operate-dispense')} label="Operate Dispense" icon={<EngineeringIcon />} />
         
       </BottomNavigation>
        )}
      </Box>
    </Box>
  );
};

export default Layout;