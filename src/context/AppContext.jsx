// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────
// Global application state — org unit selection, user preferences,
// and any cross-page data that multiple components need to share.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useDataQuery, useDataEngine, useDataMutation } from '@dhis2/app-runtime'
import {
  APP_SETTINGS_NAMESPACE,
  APP_SETTINGS_KEY,
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  buildAppSettingsPayload,
  validateAppSettings,
} from '../config/appSettings.js'

// ── DHIS2 me query ────────────────────────────────────────────
const ME_QUERY = {
  me: {
    resource: 'me',
    params: {
      fields: [
        'id', 'displayName', 'email',
        'organisationUnits[id,displayName,level]',
        'dataViewOrganisationUnits[id]',
        'teiSearchOrganisationUnits[id]',
      ].join(','),
    },
  },
}

const ORG_UNITS_QUERY = {
  orgUnits: {
    resource: 'organisationUnits',
    params: { fields: 'id,displayName,level', userOnly: true, pageSize: 500 },
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

  // ── Tracker org-unit scope (computed once, shared across pages) ──
  const trackerOrgUnitIds = useMemo(() => {
    if (!user) return []
    const byPriority = [
      ...(user.teiSearchOrganisationUnits ?? []),
      ...(user.dataViewOrganisationUnits ?? []),
    ]
    return Array.from(new Set(byPriority.map(ou => ou?.id).filter(Boolean)))
  }, [user])

  const fallbackOrgUnitIds = useMemo(() => {
    if (!user) return []
    return Array.from(new Set((user.organisationUnits ?? []).map(ou => ou?.id).filter(Boolean)))
  }, [user])

  const preferredOrgUnitId = trackerOrgUnitIds[0] ?? fallbackOrgUnitIds[0] ?? null

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

  // ── Shared Tracker data (fetched once, used by every page) ────
  const [trackerData, setTrackerData] = useState(null)
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [trackerError, setTrackerError] = useState(null)
  const [trackerEpoch, setTrackerEpoch] = useState(0)
  const [pendingPatients, setPendingPatients] = useState([])

  const config = useMemo(() => normalizeAppSettings(appSettings), [appSettings])
  const configValid = useMemo(() => validateAppSettings(config).isValid, [config])

  useEffect(() => {
    if (appSettingsLoading || meLoading || !configValid || !config.program?.id) return undefined

    let active = true
    const orgParams = preferredOrgUnitId
      ? { orgUnit: preferredOrgUnitId, ou: preferredOrgUnitId, orgUnitMode: 'DESCENDANTS', ouMode: 'DESCENDANTS' }
      : { orgUnitMode: 'ACCESSIBLE', ouMode: 'ACCESSIBLE' }

    const query = {
      patients: {
        resource: 'tracker/trackedEntities',
        params: {
          program: config.program.id,
          ...orgParams,
          fields: 'trackedEntity,trackedEntityInstance,id,orgUnit,attributes,enrollments[enrollment,enrolledAt,orgUnit,orgUnitName,status]',
          page: 1, pageSize: 500, order: 'enrolledAt:desc',
        },
      },
      events: {
        resource: 'tracker/events',
        params: {
          program: config.program.id,
          programStage: config.programStage?.id,
          ...orgParams,
          fields: 'event,trackedEntity,trackedEntityInstance,tei,occurredAt,orgUnit,orgUnitName,status,dataValues',
          page: 1, pageSize: 500, order: 'occurredAt:desc',
        },
      },
      orgUnits: {
        resource: 'organisationUnits',
        params: { fields: 'id,displayName', userOnly: true, pageSize: 500 },
      },
    }

    if (!trackerData) setTrackerLoading(true)

    const doFetch = () => {
      engine.query(query)
        .then(result => {
          if (!active) return
          setTrackerData(result)
          setTrackerError(null)
          setTrackerLoading(false)
        })
        .catch(err => {
          if (!active) return
          setTrackerError(err)
          setTrackerLoading(false)
        })
    }

    doFetch()

    const timers = trackerEpoch
      ? [800, 2200, 4500].map(ms => window.setTimeout(doFetch, ms))
      : []

    return () => {
      active = false
      timers.forEach(window.clearTimeout)
    }
  }, [appSettingsLoading, meLoading, configValid, config.program?.id, config.programStage?.id, preferredOrgUnitId, trackerEpoch, engine])

  const refreshTracker = useCallback(() => setTrackerEpoch(Date.now()), [])

  const notifyTrackerChanged = useCallback((draftPatient) => {
    setTrackerEpoch(Date.now())
    if (draftPatient && typeof draftPatient === 'object') {
      setPendingPatients(prev => {
        const id = draftPatient.teiUid
        const rest = id ? prev.filter(p => p.teiUid !== id) : prev
        return [draftPatient, ...rest]
      })
    }
  }, [])

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

    // Tracker org-unit scope (shared – no per-page /api/me re-fetch)
    trackerOrgUnitIds,
    fallbackOrgUnitIds,
    preferredOrgUnitId,

    trackerData,
    trackerLoading,
    trackerError,
    refreshTracker,
    trackerEpoch,
    pendingPatients,
    notifyTrackerChanged,
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