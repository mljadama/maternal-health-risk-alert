// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────
// Global application state — org unit selection, user preferences,
// and any cross-page data that multiple components need to share.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useDataQuery, useDataEngine, useDataMutation } from '@dhis2/app-runtime'
import {
  APP_SETTINGS_NAMESPACE,
  APP_SETTINGS_KEY,
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  buildAppSettingsPayload,
} from '../config/appSettings.js'

// ── DHIS2 me query ────────────────────────────────────────────
const ME_QUERY = {
  me: {
    resource: 'me',
    params: { fields: 'id,displayName,email,organisationUnits[id,displayName,level]' },
  },
}

const ORG_UNITS_QUERY = {
  orgUnits: {
    resource: 'organisationUnits',
    params: { fields: 'id,displayName,level', userOnly: true, paging: false },
  },
}

const CONFIG_RESOURCE = `dataStore/${APP_SETTINGS_NAMESPACE}/${APP_SETTINGS_KEY}`

// ── Context creation ──────────────────────────────────────────
const AppContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────
export function AppProvider({ children }) {
  // Current org unit (health facility) selected by user
  const [selectedOrgUnit, setSelectedOrgUnit] = useState(null)

  // Notification snackbar state
  const [notification, setNotification] = useState({
    open:     false,
    message:  '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  })

  // Currently viewed patient (for cross-page navigation)
  const [currentPatient, setCurrentPatient] = useState(null)

  // Fetch current user
  const { data: meData, loading: meLoading } = useDataQuery(ME_QUERY)

  // Fetch accessible org units
  const { data: ouData, loading: ouLoading } = useDataQuery(ORG_UNITS_QUERY)
  const engine = useDataEngine()
  const [createConfig] = useDataMutation({
    resource: CONFIG_RESOURCE,
    type: 'create',
    data: ({ settings }) => settings,
  })
  const [updateConfig] = useDataMutation({
    resource: CONFIG_RESOURCE,
    type: 'update',
    data: ({ settings }) => settings,
  })

  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS)
  const [appSettingsLoading, setAppSettingsLoading] = useState(true)
  const [appSettingsLoaded, setAppSettingsLoaded] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSettings() {
      setAppSettingsLoading(true)
      try {
        const result = await engine.query({
          appSettings: { resource: CONFIG_RESOURCE },
        })
        if (!active) return

        const storedSettings = result?.appSettings ?? null
        setAppSettings(normalizeAppSettings(storedSettings))
        setAppSettingsLoaded(Boolean(storedSettings))
      } catch (error) {
        if (!active) return
        setAppSettings(DEFAULT_APP_SETTINGS)
        setAppSettingsLoaded(false)
      } finally {
        if (active) setAppSettingsLoading(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [engine])

  const user     = meData?.me ?? null
  const orgUnits = ouData?.orgUnits?.organisationUnits ?? []

  // Auto-select first org unit if none selected
  React.useEffect(() => {
    if (!selectedOrgUnit && orgUnits.length > 0) {
      setSelectedOrgUnit(orgUnits[0])
    }
  }, [orgUnits, selectedOrgUnit])

  // Show a notification toast
  const notify = useCallback((message, severity = 'success') => {
    setNotification({ open: true, message, severity })
  }, [])

  const closeNotification = useCallback(() => {
    setNotification(n => ({ ...n, open: false }))
  }, [])

  const saveAppSettings = useCallback(async (nextSettings) => {
    const settings = buildAppSettingsPayload(nextSettings)

    if (appSettingsLoaded) {
      await updateConfig({ settings })
    } else {
      await createConfig({ settings })
      setAppSettingsLoaded(true)
    }

    setAppSettings(settings)
    return settings
  }, [appSettingsLoaded, createConfig, updateConfig])

  const resetAppSettings = useCallback(async () => {
    return saveAppSettings(DEFAULT_APP_SETTINGS)
  }, [saveAppSettings])

  const value = {
    // User
    user,
    meLoading,

    // Org units
    orgUnits,
    ouLoading,
    selectedOrgUnit,
    setSelectedOrgUnit,

    // App metadata settings
    appSettings,
    appSettingsLoading,
    saveAppSettings,
    resetAppSettings,

    // Current patient context
    currentPatient,
    setCurrentPatient,

    // Notifications
    notification,
    notify,
    closeNotification,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────
export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>')
  return ctx
}

export default AppContext