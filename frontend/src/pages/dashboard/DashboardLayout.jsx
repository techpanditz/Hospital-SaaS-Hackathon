import React from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicationIcon from '@mui/icons-material/Medication';
import { useAuth } from '../../state/AuthContext';
import client from '../../api/client';

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await client.post('/auth/logout');
    } catch (_) {}
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/app', icon: <DashboardIcon /> },
    { label: 'Patients', path: '/app/patients', icon: <PeopleIcon /> },
   // { label: 'Prescriptions', path: '/app/prescriptions', icon: <MedicationIcon /> },
    { label: 'Users', path: '/app/users', icon: <LocalHospitalIcon /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* TOP APP BAR */}
      <AppBar position="static" sx={{ backgroundColor: '#0f172a' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Hospital Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex' }}>
        {/* SIDEBAR */}
        <Drawer
          variant="permanent"
          sx={{
            width: 260,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 260,
              boxSizing: 'border-box',
              backgroundColor: '#0f172a',
              color: '#e5e7eb',
              borderRight: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* BRAND */}
          <Box
            sx={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: 1,
              color: 'white',
              borderBottom: '1px solid #1e293b',
            }}
          >
            HOSPITAL CRM
          </Box>

          {/* MENU */}
          <List sx={{ mt: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={location.pathname === item.path}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    color: 'inherit',
                    '&.Mui-selected': {
                      backgroundColor: '#2563eb',
                      color: 'white',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: '#2563eb',
                    },
                    '&:hover': {
                      backgroundColor: '#1e293b',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {/* USER FOOTER */}
          <Box
            sx={{
              mt: 'auto',
              p: 2,
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar sx={{ bgcolor: '#2563eb' }}>
              {user?.fullName?.[0] || user?.email?.[0] || 'U'}
            </Avatar>

            <Box>
              <Typography fontSize={14} fontWeight={600}>
                {user?.fullName || 'User'}
              </Typography>
              <Typography fontSize={12} color="#9ca3af">
                {user?.role || 'Role'}
              </Typography>
            </Box>
          </Box>
        </Drawer>

        {/* MAIN CONTENT */}
        <Box sx={{ flex: 1, p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
