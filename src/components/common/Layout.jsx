// src/components/common/Layout.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar, Box, Chip, Divider, Drawer, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Dashboard, People, PersonAdd, EventNote,
  Warning, Menu, Close, PregnantWoman,
} from '@mui/icons-material'

const DRAWER_WIDTH = 230

const NAV_ITEMS = [
  { label: 'Dashboard',         icon: <Dashboard />,     path: '/dashboard' },
  { label: 'Patients',          icon: <People />,        path: '/patients'  },
  { label: 'Register Patient',  icon: <PersonAdd />,     path: '/register'  },
  { label: 'Risk Alerts',       icon: <Warning />,       path: '/alerts',   badge: 'alerts' },
]

export default function Layout({ children }) {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen]   = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#e91e8c,#c2185b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PregnantWoman sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={800} sx={{ color: '#f8fafc', lineHeight: 1.1, fontSize: 13 }}>
            Maternal Health
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10 }}>
            Risk Alert System
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#1e293b', mx: 2 }} />

      {/* Nav items */}
      <List sx={{ flex: 1, px: 1.5, pt: 1.5 }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); if (isMobile) setOpen(false) }}
                sx={{
                  borderRadius: '9px',
                  py: 1,
                  background: active ? 'rgba(255,255,255,.08)' : 'transparent',
                  '&:hover': { background: 'rgba(255,255,255,.05)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#f8fafc' : '#64748b' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#f8fafc' : '#94a3b8' }}
                />
                {item.badge === 'alerts' && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', ml: 1 }} />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #1e293b' }}>
        <Typography variant="caption" sx={{ color: '#475569', fontSize: 10, display: 'block' }}>
          DHIS2 play.dhis2.org/40
        </Typography>
        <Typography variant="caption" sx={{ color: '#334155', fontSize: 10 }}>
          The Gambia · v1.0.0
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: DRAWER_WIDTH, border: 'none' } }}>
          {drawer}
        </Drawer>
      ) : (
        <Box sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
          <Box sx={{ position: 'fixed', top: 0, left: 0, width: DRAWER_WIDTH, height: '100vh', overflowY: 'auto' }}>
            {drawer}
          </Box>
        </Box>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isMobile && (
          <AppBar position="sticky" elevation={0} sx={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
            <Toolbar variant="dense">
              <IconButton onClick={() => setOpen(true)} sx={{ color: '#f8fafc', mr: 1 }}>
                <Menu />
              </IconButton>
              <Typography variant="body1" fontWeight={700} sx={{ color: '#f8fafc' }}>
                Maternal Health
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        <Box component="main" sx={{ flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}