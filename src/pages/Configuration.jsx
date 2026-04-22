import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Center,
  CircularLoader,
  DataTable,
  DataTableCell,
  DataTableColumnHeader,
  DataTableRow,
  NoticeBox,
  TableBody,
  TableHead,
} from '@dhis2/ui'
import PageHeader from '../components/common/PageHeader.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
} from '../config/appSettings.js'
import styles from './Configuration.module.css'

const FIELD_GROUPS = [
  {
    title: 'Program',
    fields: [
      ['program.id', 'Program UID'],
      ['program.name', 'Program name'],
      ['programStage.id', 'Program stage UID'],
      ['programStage.name', 'Program stage name'],
      ['trackedEntityType.id', 'Tracked entity type UID'],
    ],
  },
  {
    title: 'Tracked entity attributes',
    fields: [
      ['attributes.fullName', 'Full name attribute UID'],
      ['attributes.age', 'Age attribute UID'],
      ['attributes.village', 'Village attribute UID'],
      ['attributes.phoneNumber', 'Phone number attribute UID'],
      ['attributes.parity', 'Parity attribute UID'],
      ['attributes.previousComplications', 'Previous complications attribute UID'],
    ],
  },
  {
    title: 'Data elements',
    fields: [
      ['dataElements.bpSystolic', 'Blood pressure systolic UID'],
      ['dataElements.bpDiastolic', 'Blood pressure diastolic UID'],
      ['dataElements.haemoglobin', 'Haemoglobin UID'],
      ['dataElements.weight', 'Weight UID'],
      ['dataElements.gestationalAge', 'Gestational age UID'],
      ['dataElements.visitNumber', 'Visit number UID'],
      ['dataElements.malariaTestResult', 'Malaria test result UID'],
      ['dataElements.ironSupplementation', 'Iron supplementation UID'],
      ['dataElements.folicAcid', 'Folic acid UID'],
      ['dataElements.nurseNotes', 'Nurse notes UID'],
      ['dataElements.dangerSigns', 'Danger signs UID'],
      ['dataElements.nextVisitDate', 'Next visit date UID'],
    ],
  },
]

function readValue(source, path) {
  return path.split('.').reduce((current, key) => current?.[key], source) ?? ''
}

function updateValue(source, path, value) {
  const keys = path.split('.')
  const next = { ...source }
  let cursor = next

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value
      return
    }

    cursor[key] = { ...(cursor[key] || {}) }
    cursor = cursor[key]
  })

  return next
}

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  )
}

export default function Configuration() {
  const { appSettings, appSettingsLoading, saveAppSettings, resetAppSettings } = useAppContext()
  const [draft, setDraft] = useState(DEFAULT_APP_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    setDraft(normalizeAppSettings(appSettings))
  }, [appSettings])

  const summaryRows = useMemo(() => [
    { label: 'Program', value: draft.program?.name || 'Not set' },
    { label: 'Program stage', value: draft.programStage?.name || 'Not set' },
    { label: 'Tracked entity type', value: draft.trackedEntityType?.id || 'Not set' },
    { label: 'Attribute mappings', value: Object.keys(draft.attributes || {}).length },
    { label: 'Data element mappings', value: Object.keys(draft.dataElements || {}).length },
  ], [draft])

  function handleChange(path) {
    return (event) => {
      setMessage(null)
      setDraft(current => updateValue(current, path, event.target.value))
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      await saveAppSettings(draft)
      setMessage({ type: 'success', text: 'Configuration saved to dataStore.' })
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Failed to save configuration.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setSaving(true)
    setMessage(null)
    try {
      const defaults = await resetAppSettings()
      setDraft(defaults)
      setMessage({ type: 'success', text: 'Configuration reset to defaults.' })
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Failed to reset configuration.' })
    } finally {
      setSaving(false)
    }
  }

  if (appSettingsLoading) {
    return (
      <div className={styles.page}>
        <Center>
          <CircularLoader large />
        </Center>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Configuration"
        subtitle="Map the DHIS2 metadata used by the app and persist it in dataStore."
        backTo="/dashboard"
      />

      <NoticeBox info title="How this works">
        Save the Program, Program Stage, Tracked Entity Type, Attributes, and Data Element UIDs for the DHIS2 instance you are deploying to. The app will use these values at runtime instead of hardcoded Gambia-specific metadata.
      </NoticeBox>

      {message && (
        <div className={message.type === 'error' ? styles.alertError : styles.alertSuccess}>
          {message.text}
        </div>
      )}

      <div className={styles.summaryPanel}>
        <DataTable>
          <TableHead>
            <DataTableRow>
              <DataTableColumnHeader large>Mapping</DataTableColumnHeader>
              <DataTableColumnHeader large>Current value</DataTableColumnHeader>
            </DataTableRow>
          </TableHead>
          <TableBody>
            {summaryRows.map(row => (
              <DataTableRow key={row.label}>
                <DataTableCell large>{row.label}</DataTableCell>
                <DataTableCell large>{String(row.value)}</DataTableCell>
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>
      </div>

      <div className={styles.grid}>
        {FIELD_GROUPS.map(group => (
          <section className={styles.card} key={group.title}>
            <h3 className={styles.cardTitle}>{group.title}</h3>
            <div className={styles.fieldGrid}>
              {group.fields.map(([path, label]) => (
                <FieldInput
                  key={path}
                  label={label}
                  value={readValue(draft, path)}
                  onChange={handleChange(path)}
                  placeholder="Enter UID or name"
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className={styles.actions}>
        <Button secondary onClick={handleReset} disabled={saving}>
          Restore defaults
        </Button>
        <Button primary onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save configuration'}
        </Button>
      </div>
    </div>
  )
}
