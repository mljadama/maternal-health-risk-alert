// src/App.jsx
// ─────────────────────────────────────────────────────────────
// Root component — Maternal Health Risk Alert System
//
// PROXY SETUP:
//   package.json "start" script runs:
//     d2-app-scripts start --proxy https://debug.dhis2.org/dev
//
//   This creates a local reverse proxy on port 8080.
//   debug.dhis2.org/dev is used because it does NOT redirect —
//   play.dhis2.org/demo redirects to another URL which causes
//   CORS preflight to fail.
//
//   Request flow:
//     Browser (localhost:3000)
//       → DataProvider calls localhost:8080
//         → proxy forwards to debug.dhis2.org/dev (server-side)
//           → response returned, no CORS issue
//
// LOGIN CREDENTIALS:
//   Server:   http://localhost:8080
//   Username: admin
//   Password: district
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { DataProvider } from '@dhis2/app-runtime'
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
} from '@mui/material'

import Layout          from './components/common/Layout.jsx'
import Dashboard       from './pages/Dashboard.jsx'
import PatientList     from './pages/PatientList.jsx'
import PatientDetail   from './pages/PatientDetail.jsx'
import RegisterPatient from './pages/RegisterPatient.jsx'
import RecordVisit     from './pages/RecordVisit.jsx'
import RiskAlerts      from './pages/RiskAlerts.jsx'

// ─────────────────────────────────────────────────────────────
// DHIS2 DataProvider config
//
// baseUrl = http://localhost:8080
// This is the local proxy port, NOT the remote server.
// The --proxy flag in package.json start script points the
// proxy at debug.dhis2.org/dev which serves directly
// without any redirects.
// ─────────────────────────────────────────────────────────────
const dhis2Config = {
    baseUrl:    'http://localhost:8080',
    apiVersion: 42,
}

// ─────────────────────────────────────────────────────────────
// MUI Theme
// ─────────────────────────────────────────────────────────────
const theme = createTheme({
    palette: {
        primary:    { main: '#1d4ed8' },
        secondary:  { main: '#e91e8c' },
        error:      { main: '#dc2626' },
        warning:    { main: '#d97706' },
        success:    { main: '#16a34a' },
        info:       { main: '#0891b2' },
        background: {
            default: '#f8fafc',
            paper:   '#ffffff',
        },
        text: {
            primary:   '#0f172a',
            secondary: '#64748b',
        },
    },
    typography: {
        fontFamily: '"DM Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
        h4:        { fontWeight: 800, letterSpacing: '-0.02em' },
        h5:        { fontWeight: 800, letterSpacing: '-0.02em' },
        h6:        { fontWeight: 700 },
        subtitle1: { fontWeight: 700 },
        subtitle2: { fontWeight: 600 },
        body1:     { lineHeight: 1.6 },
        body2:     { lineHeight: 1.6 },
        caption:   { lineHeight: 1.5 },
        button:    { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 10 },
    components: {
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    border:       '1.5px solid #e2e8f0',
                    borderRadius: 14,
                },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius:  8,
                    textTransform: 'none',
                    fontWeight:    600,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600 },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    background:    '#f8fafc',
                    fontWeight:    700,
                    fontSize:      11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color:         '#64748b',
                    borderBottom:  '1px solid #e2e8f0',
                    padding:       '10px 12px',
                },
                body: {
                    borderBottom: '1px solid #f8fafc',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#94a3b8',
                    },
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: 10 },
            },
        },
        MuiDivider: {
            styleOverrides: {
                root: { borderColor: '#e2e8f0' },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius:    8,
                    fontSize:        11,
                    backgroundColor: '#0f172a',
                    padding:         '6px 10px',
                },
                arrow: { color: '#0f172a' },
            },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    borderRadius:  '8px !important',
                    textTransform: 'none',
                    fontWeight:    600,
                    fontSize:      11,
                    padding:       '5px 12px',
                },
            },
        },
        MuiStepLabel: {
            styleOverrides: {
                label: { fontSize: 13, fontWeight: 500 },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: { borderRadius: 4 },
                bar:  { borderRadius: 4 },
            },
        },
    },
})

// ─────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────
export default function App() {
    return (
        <DataProvider config={dhis2Config}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <BrowserRouter>
                    <Layout>
                        <Routes>
                            {/* Default — redirect root to dashboard */}
                            <Route
                                path="/"
                                element={<Navigate to="/dashboard" replace />}
                            />

                            {/* Dashboard — KPI cards, charts, alert summary */}
                            <Route
                                path="/dashboard"
                                element={<Dashboard />}
                            />

                            {/* Patient list — search, filter, sort */}
                            <Route
                                path="/patients"
                                element={<PatientList />}
                            />

                            {/* Patient detail — visit history, trends, risk */}
                            <Route
                                path="/patients/:teiUid"
                                element={<PatientDetail />}
                            />

                            {/* Register — 3-step enrollment form */}
                            <Route
                                path="/register"
                                element={<RegisterPatient />}
                            />

                            {/* Record visit — ANC visit data entry form */}
                            <Route
                                path="/visit/:teiUid"
                                element={<RecordVisit />}
                            />

                            {/* Risk alerts — high and moderate risk patients */}
                            <Route
                                path="/alerts"
                                element={<RiskAlerts />}
                            />

                            {/* Catch-all — redirect unknown paths to dashboard */}
                            <Route
                                path="*"
                                element={<Navigate to="/dashboard" replace />}
                            />
                        </Routes>
                    </Layout>
                </BrowserRouter>
            </ThemeProvider>
        </DataProvider>
    )
}