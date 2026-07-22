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
  validateAppSettings,
  buildConfigValidationMessage,
} from '../config/appSettings.js'
import styles from './Configuration.module.css'

const FIELD_GROUPS = [
  {
    title: 'Program metadata',
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
  {
    title: 'Clinical risk scoring weights',
    fields: [
      ['ruleScores.BP_SEVERE_HYPERTENSION', 'Severe hypertension score'],
      ['ruleScores.BP_HYPERTENSION', 'Hypertension score'],
      ['ruleScores.HB_SEVERE_ANAEMIA', 'Severe anaemia score'],
      ['ruleScores.HB_MODERATE_ANAEMIA', 'Moderate anaemia score'],
      ['ruleScores.HB_MILD_ANAEMIA', 'Mild anaemia score'],
      ['ruleScores.MALARIA_POSITIVE', 'Active malaria score'],
      ['ruleScores.MALARIA_HISTORY', 'Malaria history score'],
      ['ruleScores.DANGER_SIGNS', 'Danger signs score (per sign)'],
      ['ruleScores.AGE_TOO_YOUNG', 'Adolescent age score'],
      ['ruleScores.AGE_TOO_OLD', 'Advanced age score'],
      ['ruleScores.LATE_FIRST_VISIT', 'Late booking score'],
      ['ruleScores.INSUFFICIENT_VISITS', 'Insufficient visits score'],
    ],
  },
  {
    title: 'Clinical decision thresholds & cutoffs',
    fields: [
      ['thresholds.SCORE_HIGH', 'High risk score cutoff (>= score)'],
      ['thresholds.SCORE_MODERATE', 'Moderate risk score cutoff (>= score)'],
      ['thresholds.BP_SYSTOLIC_SEVERE', 'Severe systolic BP cutoff (mmHg)'],
      ['thresholds.BP_DIASTOLIC_SEVERE', 'Severe diastolic BP cutoff (mmHg)'],
      ['thresholds.BP_SYSTOLIC_HIGH', 'High systolic BP cutoff (mmHg)'],
      ['thresholds.BP_DIASTOLIC_HIGH', 'High diastolic BP cutoff (mmHg)'],
      ['thresholds.HB_SEVERE_ANAEMIA', 'Severe anaemia cutoff (g/dL)'],
      ['thresholds.HB_MODERATE_ANAEMIA', 'Moderate anaemia cutoff (g/dL)'],
      ['thresholds.HB_NORMAL_MIN', 'Mild anaemia cutoff (g/dL)'],
      ['thresholds.AGE_MIN', 'Adolescent age cutoff (< years)'],
      ['thresholds.AGE_MAX', 'Advanced age cutoff (> years)'],
    ],
  },
  {
    title: 'Risk alert UI colors',
    fields: [
      ['riskColors.high', 'High Risk badge color'],
      ['riskColors.moderate', 'Moderate Risk badge color'],
      ['riskColors.normal', 'Normal Risk badge color'],
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

  const validation = useMemo(() => validateAppSettings(draft), [draft])
  const validationItems = useMemo(() => {
    const missing = validation.missingFields.map(label => `${label} (missing)`)
    const invalid = validation.invalidFields.map(label => `${label} (invalid UID format)`)
    return [...missing, ...invalid]
  }, [validation])

  const summaryRows = useMemo(() => [
    { label: 'Configuration status', value: validation.isValid ? 'Valid' : 'Needs attention' },
    { label: 'Program', value: draft.program?.name || 'Not set' },
    { label: 'Program stage', value: draft.programStage?.name || 'Not set' },
    { label: 'Tracked entity type', value: draft.trackedEntityType?.id || 'Not set' },
    { label: 'Attribute mappings', value: Object.keys(draft.attributes || {}).length },
    { label: 'Data element mappings', value: Object.keys(draft.dataElements || {}).length },
    { label: 'Clinical risk score rules', value: Object.keys(draft.ruleScores || {}).length },
    { label: 'Clinical decision cutoffs', value: Object.keys(draft.thresholds || {}).length },
    { label: 'Risk alert colors', value: `High: ${draft.riskColors?.high || 'default'}, Mod: ${draft.riskColors?.moderate || 'default'}` },
  ], [draft, validation.isValid])

  function handleChange(path) {
    return (event) => {
      setMessage(null)
      setDraft(current => updateValue(current, path, event.target.value))
    }
  }

  async function handleSave() {
    if (!validation.isValid) {
      setMessage({
        type: 'error',
        text: buildConfigValidationMessage(validation, 'Cannot save configuration.'),
      })
      return
    }

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
      setMessage({ type: 'success', text: 'Configuration cleared.' })
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
        Save the Program, Program Stage, Tracked Entity Type, Attributes, and Data Element UIDs for the DHIS2 instance you are deploying to. The app will use only the values stored in dataStore at runtime.
      </NoticeBox>

      {!validation.isValid && (
        <NoticeBox warning title="Configuration needs attention">
          Complete all required UID mappings before using Patients or Register Patient.
          {validationItems.length > 0 && (
            <Box marginTop="8px">
              {validationItems.join(', ')}
            </Box>
          )}
        </NoticeBox>
      )}

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
          Clear configuration
        </Button>
        <Button primary onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save configuration'}
        </Button>
      </div>
    </div>
  )
}
