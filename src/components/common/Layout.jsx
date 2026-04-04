// src/components/common/Layout.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    Box, Divider, Drawer, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText,
    Typography, useMediaQuery, useTheme, AppBar, Toolbar,
} from '@mui/material'
import {
    Dashboard, People, PersonAdd, Warning,
    Menu, PregnantWoman,
} from '@mui/icons-material'

const DRAWER_WIDTH = 260
const DHIS2_HEADER_HEIGHT = 48

const NAV_ITEMS = [
    { label: 'Dashboard',        icon: <Dashboard />, path: '/dashboard' },
    { label: 'Patients',         icon: <People />,    path: '/patients'  },
    { label: 'Register Patient', icon: <PersonAdd />, path: '/register'  },
    { label: 'Risk Alerts',      icon: <Warning />,   path: '/alerts', badge: true },
]

function SidebarContent({ onNavigate }) {
    const navigate = useNavigate()
    const location = useLocation()

    function go(path) {
        navigate(path)
        if (onNavigate) onNavigate()
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', width: DRAWER_WIDTH }}>

            {/* Logo */}
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Box sx={{
                    width: 38, height: 38, borderRadius: '10px',
                    background: 'linear-gradient(135deg,#e91e8c,#c2185b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <PregnantWoman sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography sx={{ color: '#f8fafc', fontWeight: 800, fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                        Maternal Health
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 10, whiteSpace: 'nowrap' }}>
                        Risk Alert System
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ borderColor: '#1e293b', mx: 2, mb: 1 }} />

            {/* Nav items */}
            <List sx={{ flex: 1, px: 1.5, pt: 1 }}>
                {NAV_ITEMS.map(item => {
                    const active =
                        location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => go(item.path)}
                                sx={{
                                    borderRadius: '10px',
                                    py: 1.1, px: 1.5,
                                    background:  active ? 'rgba(233,30,140,.15)' : 'transparent',
                                    borderLeft:  active ? '3px solid #e91e8c' : '3px solid transparent',
                                    '&:hover':   { background: 'rgba(255,255,255,.06)' },
                                    transition:  'all .15s',
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 38, color: active ? '#e91e8c' : '#475569' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize:   13,
                                        fontWeight: active ? 700 : 400,
                                        color:      active ? '#f8fafc' : '#94a3b8',
                                        whiteSpace: 'nowrap',
                                    }}
                                />
                                {item.badge && (
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0, ml: 1 }} />
                                )}
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid #1e293b', flexShrink: 0 }}>
                <Typography sx={{ color: '#334155', fontSize: 11, display: 'block', mb: 0.3 }}>
                    DHIS2 v2.42 · Local instance
                </Typography>
                <Typography sx={{ color: '#1e293b', fontSize: 10 }}>
                    The Gambia · v1.0.0
                </Typography>
            </Box>
        </Box>
    )
}

export default function Layout({ children }) {
    const theme    = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [open, setOpen] = useState(false)

    return (
        <Box sx={{ display: 'flex', height: '100%' }}>

            {/* Desktop sidebar — does NOT overlap DHIS2 header */}
            {!isMobile && (
                <Box
                    sx={{
                        width:     DRAWER_WIDTH,
                        flexShrink: 0,
                        height:    '100%',
                    }}
                >
                    <Box
                        sx={{
                            position: 'fixed',
                            top:      DHIS2_HEADER_HEIGHT,
                            left:     0,
                            width:    DRAWER_WIDTH,
                            height:   `calc(100vh - ${DHIS2_HEADER_HEIGHT}px)`,
                            overflowY: 'auto',
                            zIndex:   10,
                        }}
                    >
                        <SidebarContent />
                    </Box>
                </Box>
            )}

            {/* Mobile drawer */}
            {isMobile && (
                <>
                    <AppBar
                        position="fixed"
                        elevation={0}
                        sx={{
                            top:          DHIS2_HEADER_HEIGHT,
                            background:   '#0f172a',
                            borderBottom: '1px solid #1e293b',
                            zIndex:       5,
                        }}
                    >
                        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
                            <IconButton onClick={() => setOpen(true)} sx={{ color: '#f8fafc', mr: 1 }}>
                                <Menu />
                            </IconButton>
                            <Box sx={{ width: 26, height: 26, borderRadius: '7px', background: 'linear-gradient(135deg,#e91e8c,#c2185b)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1 }}>
                                <PregnantWoman sx={{ color: '#fff', fontSize: 15 }} />
                            </Box>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#f8fafc', fontSize: 13 }}>
                                Maternal Health
                            </Typography>
                        </Toolbar>
                    </AppBar>
                    <Drawer
                        open={open}
                        onClose={() => setOpen(false)}
                        PaperProps={{
                            sx: {
                                width:    DRAWER_WIDTH,
                                border:   'none',
                                top:      DHIS2_HEADER_HEIGHT,
                                height:   `calc(100% - ${DHIS2_HEADER_HEIGHT}px)`,
                            },
                        }}
                    >
                        <SidebarContent onNavigate={() => setOpen(false)} />
                    </Drawer>
                </>
            )}

            {/* Main content */}
            <Box
                component="main"
                sx={{
                    flex:      1,
                    minWidth:  0,
                    overflowY: 'auto',
                    mt:        isMobile ? '48px' : 0,
                }}
            >
                {children}
            </Box>
        </Box>
    )
}