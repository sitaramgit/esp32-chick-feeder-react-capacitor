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
  Divider,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import InsightsIcon from '@mui/icons-material/Insights';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SettingsIcon from '@mui/icons-material/Settings';
import PetsIcon from '@mui/icons-material/Pets';
import { Capacitor } from '@capacitor/core';

const drawerWidth = 260;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bottomNav, setBottomNav] = useState<number>(0);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isAndroid = Capacitor.getPlatform() === 'android';

  const navigateToPage = (path: string) => {
    navigate(path);
  };

  const menuItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Chicken Farm', path: '/chicken-farm', icon: <PetsIcon /> },
    { label: 'Climate Chart', path: '/climate-chart', icon: <InsightsIcon /> },
    { label: 'Controls', path: '/operate-dispense', icon: <EngineeringIcon /> },
  ];

  const Sidebar = (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #183b2a 0%, #1f4b39 100%)',
          color: '#eaf7ef',
          border: 'none',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.6, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.12)' }}>
          <PetsIcon sx={{ color: '#d4f7dc' }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#b8e7c4', letterSpacing: 1.4, textTransform: 'uppercase' }}>
            Smart farm
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            Chick Farm Automation
          </Typography>
        </Box>
      </Box>

      <List sx={{ px: 1.5, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.label}
            onClick={() => navigateToPage(item.path)}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              mb: 1,
              color: '#edf9f0',
              background: location.pathname === item.path ? 'rgba(255,255,255,0.14)' : 'transparent',
              '&:hover': { background: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ListItemIcon sx={{ color: '#d9fbe5', minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 1 }} />

      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="caption" sx={{ color: '#b8e7c4' }}>
          Live monitoring
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: '#edf9f0' }}>
          Home automation + chicken farm sensors
        </Typography>
      </Box>
    </Drawer>
  );

  return (
    <Box display="flex" height="100vh" overflow="hidden">
      {isDesktop && Sidebar}

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
        <AppBar
          position="fixed"
          color="default"
          sx={{
            ...(isAndroid && { paddingTop: '25px' }),
            zIndex: theme.zIndex.drawer + 1,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Toolbar>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box onClick={() => navigateToPage('/')} display="flex" color={'#1f9d5a'} alignItems="center" gap={1.2} sx={{ cursor: 'pointer' }}>
                <PetsIcon />
                <Typography variant="h6" fontWeight="bold">
                  Chick Farm Automation
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon sx={{ color: '#1f9d5a' }} />
                <Typography variant="body2" sx={{ color: '#2e3a2d', fontWeight: 600 }}>
                  Farm online
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Toolbar />

        <Box
          flexGrow={1}
          overflow="auto"
          sx={{
            paddingBottom: isDesktop ? 0 : 'calc(56px + env(safe-area-inset-bottom))',
          }}
        >
          <Outlet />
        </Box>

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
            <BottomNavigationAction onClick={() => navigateToPage('/')} label="Home" icon={<HomeIcon />} />
            <BottomNavigationAction onClick={() => navigateToPage('/chicken-farm')} label="Farm" icon={<PetsIcon />} />
            <BottomNavigationAction onClick={() => navigateToPage('/climate-chart')} label="Chart" icon={<InsightsIcon />} />
          </BottomNavigation>
        )}
      </Box>
    </Box>
  );
};

export default Layout;