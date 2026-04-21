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
export default function App() {
    return (
        <DataProvider config={dhis2Config}>
            <HashRouter>
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
            </HashRouter>
        </DataProvider>
    )
}
