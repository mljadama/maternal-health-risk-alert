import React, { useEffect, useMemo, useState } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
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
import { paletteFromHex } from '../utils/riskColors.js'
import styles from './Configuration.module.css'

const PROGRAMS_QUERY = {
  programs: {
    resource: 'programs',
    params: {
      paging: false,
      filter: 'programType:eq:WITH_REGISTRATION',
      fields: [
        'id',
        'displayName',
        'trackedEntityType[id,displayName]',
        'programTrackedEntityAttributes[trackedEntityAttribute[id,displayName]]',
        'programStages[id,displayName,programStageDataElements[dataElement[id,displayName]]]',
      ].join(','),
    },
  },
}

const FIELD_GROUPS = [
  {
    title: 'Program metadata',
    fields: [
      ['program.id', 'Program UID', 'text'],
      ['program.name', 'Program name', 'text'],
      ['programStage.id', 'Program stage UID', 'text'],
      ['programStage.name', 'Program stage name', 'text'],
      ['trackedEntityType.id', 'Tracked entity type UID', 'text'],
    ],
  },
  {
    title: 'Tracked entity attributes',
    fields: [
      ['attributes.fullName', 'Full name attribute UID', 'text'],
      ['attributes.age', 'Age attribute UID', 'text'],
      ['attributes.village', 'Village / address attribute UID', 'text'],
      ['attributes.phoneNumber', 'Phone number attribute UID', 'text'],
      ['attributes.parity', 'Parity attribute UID', 'text'],
      ['attributes.previousComplications', 'Previous complications attribute UID', 'text'],
    ],
  },
  {
    title: 'Data elements',
    fields: [
      ['dataElements.bpSystolic', 'Blood pressure systolic UID', 'text'],
      ['dataElements.bpDiastolic', 'Blood pressure diastolic UID', 'text'],
      ['dataElements.haemoglobin', 'Haemoglobin UID', 'text'],
      ['dataElements.weight', 'Weight UID', 'text'],
      ['dataElements.gestationalAge', 'Gestational age UID', 'text'],
      ['dataElements.visitNumber', 'Visit number UID', 'text'],
      ['dataElements.malariaTestResult', 'Malaria test result UID', 'text'],
      ['dataElements.ironSupplementation', 'Iron supplementation UID', 'text'],
      ['dataElements.folicAcid', 'Folic acid UID', 'text'],
      ['dataElements.nurseNotes', 'Nurse notes UID', 'text'],
      ['dataElements.dangerSigns', 'Danger signs UID', 'text'],
      ['dataElements.nextVisitDate', 'Next visit date UID', 'text'],
    ],
  },
  {
    title: 'Clinical risk scoring weights',
    fields: [
      ['ruleScores.BP_SEVERE_HYPERTENSION', 'Severe hypertension score', 'number'],
      ['ruleScores.BP_HYPERTENSION', 'Hypertension score', 'number'],
      ['ruleScores.HB_SEVERE_ANAEMIA', 'Severe anaemia score', 'number'],
      ['ruleScores.HB_MODERATE_ANAEMIA', 'Moderate anaemia score', 'number'],
      ['ruleScores.HB_MILD_ANAEMIA', 'Mild anaemia score', 'number'],
      ['ruleScores.MALARIA_POSITIVE', 'Active malaria score', 'number'],
      ['ruleScores.MALARIA_HISTORY', 'Malaria history score', 'number'],
      ['ruleScores.DANGER_SIGNS', 'Danger signs score (per sign)', 'number'],
      ['ruleScores.AGE_TOO_YOUNG', 'Adolescent age score', 'number'],
      ['ruleScores.AGE_TOO_OLD', 'Advanced age score', 'number'],
      ['ruleScores.LATE_FIRST_VISIT', 'Late booking score', 'number'],
      ['ruleScores.INSUFFICIENT_VISITS', 'Insufficient visits score', 'number'],
      ['ruleScores.GRAND_MULTIPARA', 'Grand multiparity score', 'number'],
      ['ruleScores.PREVIOUS_COMPLICATIONS', 'Previous complications score', 'number'],
      ['ruleScores.MISSED_ANC_VISITS', 'Missed visits score', 'number'],
    ],
  },
  {
    title: 'Clinical decision thresholds & cutoffs',
    fields: [
      ['thresholds.SCORE_HIGH', 'High risk score cutoff (>= score)', 'number'],
      ['thresholds.SCORE_MODERATE', 'Moderate risk score cutoff (>= score)', 'number'],
      ['thresholds.BP_SYSTOLIC_SEVERE', 'Severe systolic BP cutoff (mmHg)', 'number'],
      ['thresholds.BP_DIASTOLIC_SEVERE', 'Severe diastolic BP cutoff (mmHg)', 'number'],
      ['thresholds.BP_SYSTOLIC_HIGH', 'High systolic BP cutoff (mmHg)', 'number'],
      ['thresholds.BP_DIASTOLIC_HIGH', 'High diastolic BP cutoff (mmHg)', 'number'],
      ['thresholds.HB_SEVERE_ANAEMIA', 'Severe anaemia cutoff (g/dL)', 'number'],
      ['thresholds.HB_MODERATE_ANAEMIA', 'Moderate anaemia cutoff (g/dL)', 'number'],
      ['thresholds.HB_NORMAL_MIN', 'Mild anaemia cutoff (g/dL)', 'number'],
      ['thresholds.AGE_MIN', 'Adolescent age cutoff (< years)', 'number'],
      ['thresholds.AGE_MAX', 'Advanced age cutoff (> years)', 'number'],
    ],
  },
  {
    title: 'Risk alert UI colors',
    fields: [
      ['riskColors.high', 'High risk colour', 'color'],
      ['riskColors.moderate', 'Moderate risk colour', 'color'],
      ['riskColors.normal', 'Normal risk colour', 'color'],
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

function FieldInput({ label, value, onChange, placeholder, type }) {
  if (type === 'color') {
    const hex = value?.main || '#16a34a'
    return (
      <label className={styles.field}>
        <span className={styles.label}>{label}</span>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorInput} value={hex} onChange={onChange} />
          <input className={styles.input} value={hex} onChange={onChange} placeholder="#16a34a" />
        </div>
      </label>
    )
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        type={type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  )
}

function guessMatch(options, keywords) {
  return options.find(option =>
    keywords.some(keyword => option.displayName.toLowerCase().includes(keyword))
  )
}

export default function Configuration() {
  const { appSettings, appSettingsLoading, saveAppSettings, resetAppSettings } = useAppContext()
  const [draft, setDraft] = useState(DEFAULT_APP_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const { data: programData, loading: programsLoading } = useDataQuery(PROGRAMS_QUERY)
  const programs = programData?.programs?.programs ?? []

  useEffect(() => {
    setDraft(normalizeAppSettings(appSettings))
  }, [appSettings])

  const selectedProgram = programs.find(program => program.id === draft.program?.id)
  const stages = selectedProgram?.programStages ?? []
  const attributes = selectedProgram?.programTrackedEntityAttributes?.map(item => item.trackedEntityAttribute).filter(Boolean) ?? []
  const selectedStage = stages.find(stage => stage.id === draft.programStage?.id) || stages[0]
  const dataElements = selectedStage?.programStageDataElements?.map(item => item.dataElement).filter(Boolean) ?? []

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
    { label: 'Clinical risk score rules', value: Object.keys(draft.ruleScores || {}).length },
    { label: 'Risk alert colors', value: `High ${draft.riskColors?.high?.main || 'default'}` },
  ], [draft, validation.isValid])

  function handleChange(path, type) {
    return (event) => {
      setMessage(null)
      const raw = event.target.value
      setDraft(current => {
        if (type === 'color') {
          const currentColor = readValue(current, path)
          return updateValue(current, path, paletteFromHex(raw, currentColor))
        }
        if (type === 'number') {
          return updateValue(current, path, raw === '' ? '' : Number(raw))
        }
        return updateValue(current, path, raw)
      })
    }
  }

  function applyProgram(programId) {
    const program = programs.find(item => item.id === programId)
    if (!program) return

    const stage = program.programStages?.[0]
    const programAttributes = program.programTrackedEntityAttributes?.map(item => item.trackedEntityAttribute).filter(Boolean) ?? []
    const stageDataElements = stage?.programStageDataElements?.map(item => item.dataElement).filter(Boolean) ?? []

    setDraft(current => ({
      ...current,
      program: { id: program.id, name: program.displayName },
      programStage: stage ? { id: stage.id, name: stage.displayName } : current.programStage,
      trackedEntityType: { id: program.trackedEntityType?.id || current.trackedEntityType?.id },
      attributes: {
        ...current.attributes,
        fullName: guessMatch(programAttributes, ['name', 'full'])?.id || current.attributes.fullName,
        age: guessMatch(programAttributes, ['age'])?.id || current.attributes.age,
        village: guessMatch(programAttributes, ['village', 'address', 'community'])?.id || current.attributes.village,
        phoneNumber: guessMatch(programAttributes, ['phone', 'mobile', 'tel'])?.id || current.attributes.phoneNumber,
        parity: guessMatch(programAttributes, ['parity', 'gravida'])?.id || current.attributes.parity,
        previousComplications: guessMatch(programAttributes, ['complicat', 'history'])?.id || current.attributes.previousComplications,
      },
      dataElements: {
        ...current.dataElements,
        bpSystolic: guessMatch(stageDataElements, ['systolic'])?.id || current.dataElements.bpSystolic,
        bpDiastolic: guessMatch(stageDataElements, ['diastolic'])?.id || current.dataElements.bpDiastolic,
        haemoglobin: guessMatch(stageDataElements, ['haemoglobin', 'hemoglobin', 'hb'])?.id || current.dataElements.haemoglobin,
        weight: guessMatch(stageDataElements, ['weight'])?.id || current.dataElements.weight,
        gestationalAge: guessMatch(stageDataElements, ['gestational', 'ga'])?.id || current.dataElements.gestationalAge,
        visitNumber: guessMatch(stageDataElements, ['visit number', 'anc visit'])?.id || current.dataElements.visitNumber,
        malariaTestResult: guessMatch(stageDataElements, ['malaria'])?.id || current.dataElements.malariaTestResult,
        ironSupplementation: guessMatch(stageDataElements, ['iron'])?.id || current.dataElements.ironSupplementation,
        folicAcid: guessMatch(stageDataElements, ['folic'])?.id || current.dataElements.folicAcid,
        nurseNotes: guessMatch(stageDataElements, ['note', 'comment'])?.id || current.dataElements.nurseNotes,
        dangerSigns: guessMatch(stageDataElements, ['danger'])?.id || current.dataElements.dangerSigns,
        nextVisitDate: guessMatch(stageDataElements, ['next visit', 'appointment'])?.id || current.dataElements.nextVisitDate,
      },
    }))
  }

  function applyStage(stageId) {
    const stage = stages.find(item => item.id === stageId)
    if (!stage) return
    setDraft(current => ({
      ...current,
      programStage: { id: stage.id, name: stage.displayName },
    }))
  }

  function applySelect(path) {
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
      setMessage({ type: 'success', text: 'Configuration cleared. Map this instance before using the app.' })
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
        subtitle="Map any DHIS2 ANC tracker program, then adjust risk scores and colours for this instance."
        backTo="/dashboard"
      />

      <NoticeBox info title="Works with any DHIS2 instance">
        Choose a tracker program below to fill UIDs from this server. You can still edit mappings, scoring weights, clinical cutoffs, and alert colours. Nothing is hard-coded to a country or a specific metadata set.
      </NoticeBox>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Map metadata from this DHIS2 instance</h3>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Tracker program</span>
            <select
              className={styles.input}
              value={draft.program?.id || ''}
              onChange={event => applyProgram(event.target.value)}
              disabled={programsLoading}
            >
              <option value="">{programsLoading ? 'Loading programs...' : 'Select a tracker program'}</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>{program.displayName}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Program stage</span>
            <select
              className={styles.input}
              value={draft.programStage?.id || ''}
              onChange={event => applyStage(event.target.value)}
              disabled={!stages.length}
            >
              <option value="">Select a program stage</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.displayName}</option>
              ))}
            </select>
          </label>

          {attributes.length > 0 && FIELD_GROUPS[1].fields.map(([path, label]) => (
            <label className={styles.field} key={`select-${path}`}>
              <span className={styles.label}>{label.replace(' UID', '')}</span>
              <select className={styles.input} value={readValue(draft, path)} onChange={applySelect(path)}>
                <option value="">Select attribute</option>
                {attributes.map(attribute => (
                  <option key={attribute.id} value={attribute.id}>{attribute.displayName}</option>
                ))}
              </select>
            </label>
          ))}

          {dataElements.length > 0 && FIELD_GROUPS[2].fields.map(([path, label]) => (
            <label className={styles.field} key={`select-${path}`}>
              <span className={styles.label}>{label.replace(' UID', '')}</span>
              <select className={styles.input} value={readValue(draft, path)} onChange={applySelect(path)}>
                <option value="">Select data element</option>
                {dataElements.map(dataElement => (
                  <option key={dataElement.id} value={dataElement.id}>{dataElement.displayName}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {!validation.isValid && (
        <NoticeBox warning title="Configuration needs attention">
          Complete all required mappings before using Patients or Register Patient.
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
              {group.fields.map(([path, label, type]) => (
                <FieldInput
                  key={path}
                  label={label}
                  type={type}
                  value={readValue(draft, path)}
                  onChange={handleChange(path, type)}
                  placeholder={type === 'number' ? '0' : 'Enter UID or name'}
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
