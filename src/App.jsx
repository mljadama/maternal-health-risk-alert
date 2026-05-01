// src/App.jsx
// ─────────────────────────────────────────────────────────────
// Root component — Maternal Health Risk Alert System
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { DataProvider } from '@dhis2/app-runtime'
import {
    HashRouter,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'

import { AppProvider } from './context/AppContext.jsx'
import Layout          from './components/common/Layout.jsx'
import ConfigurationGuard from './components/common/ConfigurationGuard.jsx'
import Dashboard       from './pages/Dashboard.jsx'
import PatientList     from './pages/PatientList.jsx'
import PatientDetail   from './pages/PatientDetail.jsx'
import RegisterPatient from './pages/RegisterPatient.jsx'
import RecordVisit     from './pages/RecordVisit.jsx'
import RiskAlerts      from './pages/RiskAlerts.jsx'
import Configuration   from './pages/Configuration.jsx'

// ─────────────────────────────────────────────────────────────
// DHIS2 DataProvider config
//
// When deployed as a DHIS2 app, the App Platform automatically
// injects the correct server URL. No baseUrl configuration needed.
// For local development with --proxy flag, the proxy handles routing.
// ─────────────────────────────────────────────────────────────
const dhis2Config = {
    apiVersion: 42,
}

// ─────────────────────────────────────────────────────────────
// Root component
//
// Uses DHIS2 UI library for consistent styling with other DHIS2 apps.
// See UI_MIGRATION.md for details on component migration.
// ─────────────────────────────────────────────────────────────
function AppRoutes() {
    return (
        <Routes>
            {/* Default — redirect root to dashboard */}
            <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
            />

            {/* Dashboard — KPI cards, charts, alert summary (no guard needed) */}
            <Route
                path="/dashboard"
                element={<Dashboard />}
            />

            {/* Configuration — metadata mapping (no guard needed) */}
            <Route
                path="/configuration"
                element={<Configuration />}
            />

            {/* Protected routes — guarded behind configuration check */}
            <Route
                path="/patients"
                element={
                    <ConfigurationGuard>
                        <PatientList />
                    </ConfigurationGuard>
                }
            />

            <Route
                path="/patients/:teiUid"
                element={
                    <ConfigurationGuard>
                        <PatientDetail />
                    </ConfigurationGuard>
                }
            />

            <Route
                path="/register"
                element={
                    <ConfigurationGuard>
                        <RegisterPatient />
                    </ConfigurationGuard>
                }
            />

            <Route
                path="/visit/:teiUid"
                element={
                    <ConfigurationGuard>
                        <RecordVisit />
                    </ConfigurationGuard>
                }
            />

            <Route
                path="/alerts"
                element={
                    <ConfigurationGuard>
                        <RiskAlerts />
                    </ConfigurationGuard>
                }
            />

            {/* Catch-all — redirect unknown paths to dashboard */}
            <Route
                path="*"
                element={<Navigate to="/dashboard" replace />}
            />
        </Routes>
    )
}

export default function App() {
    return (
        <DataProvider config={dhis2Config}>
            <HashRouter>
                <AppProvider>
                    <Layout>
                        <AppRoutes />
                    </Layout>
                </AppProvider>
            </HashRouter>
        </DataProvider>
    )
}
