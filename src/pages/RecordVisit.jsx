import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataEngine } from '@dhis2/app-runtime'
import { getRiskLabel } from '../services/riskEngine.js'
import { useDhis2Config } from '../hooks/useDhis2Config.js'
import { useAppContext } from '../context/AppContext.jsx'
import { usePatient } from '../hooks/usePatients.js'
import { useVisits } from '../hooks/useVisits.js'
import { validateAppSettings, buildConfigValidationMessage } from '../config/appSettings.js'
import { validateVisitForm } from '../utils/validationUtils.js'
import { formatTrackerError } from '../utils/trackerErrors.js'
import { assessConfiguredRisk } from '../utils/assessWithConfig.js'
import styles from './FormPage.module.css'

const today = () => new Date().toISOString().split('T')[0]

const INIT = {
  visitDate: today(),
  visitNumber: 1,
  gestationalAge: '',
  bpSystolic: '',
  bpDiastolic: '',
  haemoglobin: '',
  weight: '',
  malariaTestDone: false,
  malariaTestResult: 'Not done',
  ironSupplementation: false,
  folicAcid: false,
  dangerSigns: [],
  nurseNotes: '',
  nextVisitDate: '',
}

function extractEventErrorDetails(report) {
  if (!report) return ''
  const msgs = []

  if (report.validationReport?.errorReports?.length) {
    report.validationReport.errorReports.forEach(err => {
      if (err.message) msgs.push(err.message)
    })
  }

  if (report.bundleReport?.typeReportMap) {
    Object.values(report.bundleReport.typeReportMap).forEach(tr => {
      tr?.objectReports?.forEach(obj => {
        obj?.errorReports?.forEach(err => {
          if (err.message) msgs.push(err.message)
        })
      })
    })
  }

  return msgs.length ? msgs.join(' | ') : (report.description || report.message || '')
}

function getImportReport(result) {
  return result?.response && typeof result.response === 'object'
    ? result.response
    : result
}

function importHasErrors(report) {
  if (!report) return false
  if (report.status === 'ERROR') return true
  return Boolean(report.validationReport?.errorReports?.length)
}

function asList(payload, nestedKey) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.[nestedKey])) return payload[nestedKey]
  if (Array.isArray(payload?.instances)) return payload.instances
  if (Array.isArray(payload?.enrollments)) return payload.enrollments
  return []
}

function validate(v) {
  const e = validateVisitForm(v, { requireClinical: true })
  if (!v.visitDate) e.visitDate = 'Visit date is required'
  return e
}

export default function RecordVisit() {
  const { teiUid } = useParams()
  const navigate = useNavigate()
  const engine = useDataEngine()
  const { notifyTrackerChanged } = useAppContext()
  const { config, loading: configLoading } = useDhis2Config()
  const { patient } = usePatient(teiUid)
  const { visits, loading: visitsLoading } = useVisits(teiUid)
  const configValidation = useMemo(() => validateAppSettings(config), [config])
  const malariaResults = config.malariaResults
  const dangerSignOptions = config.dangerSignOptions

  const configError = useMemo(() => {
    if (configValidation.isValid) return null
    return new Error(
      buildConfigValidationMessage(
        configValidation,
        'Cannot record a visit because configuration is incomplete.'
      )
    )
  }, [configValidation])

  const [vals, setVals] = useState(INIT)
  const [errs, setErrs] = useState({})
  const [saved, setSaved] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [formMessage, setFormMessage] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [enrollment, setEnrollment] = useState(null)
  const [enrollmentError, setEnrollmentError] = useState(null)
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    setPrefilled(false)
  }, [teiUid])

  useEffect(() => {
    if (!teiUid || configLoading || configError || !config.program?.id) return undefined

    let active = true
    engine.query({
      tei: {
        resource: `tracker/trackedEntities/${teiUid}`,
        params: {
          program: config.program.id,
          fields: 'trackedEntity,orgUnit,enrollments[enrollment,orgUnit,orgUnitName,status]',
        },
      },
    }).then(result => {
      if (!active) return
      const list = asList(result?.tei?.enrollments, 'enrollments')
      const activeEnrollment = list.find(item => item?.status === 'ACTIVE') || list[0] || null
      setEnrollment(activeEnrollment ? {
        enrollment: activeEnrollment.enrollment,
        orgUnit: activeEnrollment.orgUnit || result?.tei?.orgUnit || null,
        orgUnitName: activeEnrollment.orgUnitName,
        status: activeEnrollment.status,
      } : null)
      setEnrollmentError(null)
    }).catch(err => {
      if (!active) return
      setEnrollmentError(err)
    })

    return () => {
      active = false
    }
  }, [teiUid, configLoading, configError, config.program?.id, engine])

  useEffect(() => {
    if (prefilled || visitsLoading) return
    const latest = visits[visits.length - 1]
    const ga = latest?.gestationalAge ?? patient?.gestationalAge
    setVals(current => ({
      ...current,
      visitNumber: visits.length + 1,
      gestationalAge: ga != null && ga !== '' ? String(ga) : current.gestationalAge,
    }))
    setPrefilled(true)
  }, [prefilled, visitsLoading, visits, patient])

  const orgUnit = enrollment?.orgUnit || patient?.orgUnit || null
  const enrollmentUid = enrollment?.enrollment || patient?.enrollmentUid || null
  const scopeError = configError || enrollmentError

  function ch(f, v) {
    setVals(p => ({ ...p, [f]: v }))
    if (errs[f]) setErrs(p => ({ ...p, [f]: undefined }))
    setFormMessage('')
  }

  function toggleDanger(sign) {
    setVals(p => ({
      ...p,
      dangerSigns: p.dangerSigns.includes(sign)
        ? p.dangerSigns.filter(x => x !== sign)
        : [...p.dangerSigns, sign],
    }))
  }

  const liveRisk = useMemo(() => {
    if (!vals.bpSystolic && !vals.haemoglobin) return null
    return assessConfiguredRisk(config, {}, {
      latestBpSystolic: Number(vals.bpSystolic),
      latestBpDiastolic: Number(vals.bpDiastolic),
      latestHaemoglobin: Number(vals.haemoglobin),
      currentWeek: Number(vals.gestationalAge),
      latestMalariaResult: vals.malariaTestResult,
      dangerSigns: vals.dangerSigns,
    })
  }, [vals.bpSystolic, vals.bpDiastolic, vals.haemoglobin, vals.gestationalAge, vals.malariaTestResult, vals.dangerSigns, config])

  async function handleSubmit() {
    const e = validate(vals)
    if (Object.keys(e).length) {
      setErrs(e)
      return
    }
    if (!orgUnit) {
      setFormMessage('Could not find the patient facility. Open the patient record and try again.')
      return
    }
    if (!enrollmentUid) {
      setFormMessage('Could not find the patient enrollment. Open the patient record and try again.')
      return
    }
    if (configError) {
      setFormMessage(configError.message)
      return
    }

    try {
      setLoadingText(true)
      const dangerValue = vals.dangerSigns.join(', ')
      const payload = {
        events: [{
          program: config.program.id,
          programStage: config.programStage.id,
          orgUnit,
          trackedEntity: teiUid,
          enrollment: enrollmentUid,
          occurredAt: vals.visitDate,
          scheduledAt: vals.visitDate,
          status: 'COMPLETED',
          dataValues: [
            { dataElement: config.dataElements.bpSystolic, value: String(vals.bpSystolic) },
            { dataElement: config.dataElements.bpDiastolic, value: String(vals.bpDiastolic) },
            { dataElement: config.dataElements.haemoglobin, value: String(vals.haemoglobin) },
            { dataElement: config.dataElements.weight, value: String(vals.weight) },
            { dataElement: config.dataElements.gestationalAge, value: String(vals.gestationalAge) },
            { dataElement: config.dataElements.visitNumber, value: String(vals.visitNumber) },
            { dataElement: config.dataElements.malariaTestResult, value: vals.malariaTestResult },
            { dataElement: config.dataElements.ironSupplementation, value: vals.ironSupplementation ? 'true' : '' },
            { dataElement: config.dataElements.folicAcid, value: vals.folicAcid ? 'true' : '' },
            { dataElement: config.dataElements.nurseNotes, value: vals.nurseNotes || '' },
            { dataElement: config.dataElements.dangerSigns, value: dangerValue },
            { dataElement: config.dataElements.nextVisitDate, value: vals.nextVisitDate || '' },
          ].filter(dv => dv.value !== ''),
        }],
      }

      const result = await engine.mutate({
        resource: 'tracker',
        type: 'create',
        params: { async: false },
        data: payload,
      })
      const report = getImportReport(result)
      if (importHasErrors(report)) {
        const detail = extractEventErrorDetails(report) || 'Event save failed on DHIS2 server'
        throw new Error(`DHIS2 server validation error: ${detail}`)
      }

      notifyTrackerChanged()

      const risk = assessConfiguredRisk(config, {}, {
        totalVisits: vals.visitNumber,
        currentWeek: Number(vals.gestationalAge),
        latestBpSystolic: Number(vals.bpSystolic),
        latestBpDiastolic: Number(vals.bpDiastolic),
        latestHaemoglobin: Number(vals.haemoglobin),
        latestMalariaResult: vals.malariaTestResult,
        dangerSigns: vals.dangerSigns,
      })

      setAssessment(risk)
      setSaved(true)
      setFormMessage('ANC visit saved successfully.')
    } catch (err) {
      setFormMessage(formatTrackerError(err, 'Save failed. Check the entered values and try again.'))
    } finally {
      setLoadingText(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.btn} onClick={() => navigate(-1)}>Back</button>

        <div className={styles.header}>
          <h1 className={styles.title}>Record ANC visit</h1>
          <p className={styles.subtitle}>Patient {teiUid?.slice(0, 8)}... - Visit {vals.visitNumber}</p>
          {liveRisk && <span className={styles.badge}>Live risk: {getRiskLabel(liveRisk.level)}</span>}
        </div>

        {scopeError && <div className={styles.error}>Cannot load enrollment: {scopeError.message}</div>}

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Visit details</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Visit date</label>
              <input type="date" className={styles.input} value={vals.visitDate} onChange={e => ch('visitDate', e.target.value)} />
              {errs.visitDate && <div className={styles.error}>{errs.visitDate}</div>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Visit number</label>
              <input type="number" className={styles.input} value={vals.visitNumber} onChange={e => ch('visitNumber', e.target.value)} min="1" max="20" />
            </div>
          </div>

          <div className={styles.grid2} style={{ marginTop: 12 }}>
            <div className={styles.field}>
              <label className={styles.label}>Gestational age (weeks)</label>
              <input type="number" className={styles.input} value={vals.gestationalAge} onChange={e => ch('gestationalAge', e.target.value)} min="1" max="42" />
              {errs.gestationalAge && <div className={styles.error}>{errs.gestationalAge}</div>}
            </div>
          </div>

          <h3 className={styles.sectionTitle} style={{ marginTop: 14 }}>Blood pressure</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Systolic</label>
              <input type="number" className={styles.input} value={vals.bpSystolic} onChange={e => ch('bpSystolic', e.target.value)} min="60" max="250" />
              {errs.bpSystolic && <div className={styles.error}>{errs.bpSystolic}</div>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Diastolic</label>
              <input type="number" className={styles.input} value={vals.bpDiastolic} onChange={e => ch('bpDiastolic', e.target.value)} min="40" max="150" />
              {errs.bpDiastolic && <div className={styles.error}>{errs.bpDiastolic}</div>}
            </div>
          </div>

          <h3 className={styles.sectionTitle} style={{ marginTop: 14 }}>Lab results</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Haemoglobin (g/dL)</label>
              <input type="number" step="0.1" className={styles.input} value={vals.haemoglobin} onChange={e => ch('haemoglobin', e.target.value)} min="3" max="20" />
              {errs.haemoglobin && <div className={styles.error}>{errs.haemoglobin}</div>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Weight (kg)</label>
              <input type="number" step="0.1" className={styles.input} value={vals.weight} onChange={e => ch('weight', e.target.value)} min="25" max="200" />
              {errs.weight && <div className={styles.error}>{errs.weight}</div>}
            </div>
          </div>

          <h3 className={styles.sectionTitle} style={{ marginTop: 14 }}>Malaria test</h3>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Test performed</span>
              <input type="checkbox" checked={vals.malariaTestDone} onChange={e => ch('malariaTestDone', e.target.checked)} />
            </label>
            <div className={styles.field}>
              <label className={styles.label}>Test result</label>
              <select className={styles.input} value={vals.malariaTestResult} onChange={e => ch('malariaTestResult', e.target.value)} disabled={!vals.malariaTestDone}>
                {malariaResults.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <h3 className={styles.sectionTitle} style={{ marginTop: 14 }}>Supplementation given</h3>
          <div className={styles.grid2}>
            <label className={styles.field}><span className={styles.label}>Iron supplementation</span><input type="checkbox" checked={vals.ironSupplementation} onChange={e => ch('ironSupplementation', e.target.checked)} /></label>
            <label className={styles.field}><span className={styles.label}>Folic acid</span><input type="checkbox" checked={vals.folicAcid} onChange={e => ch('folicAcid', e.target.checked)} /></label>
          </div>

          <h3 className={styles.sectionTitle} style={{ marginTop: 14 }}>Danger signs</h3>
          <div className={styles.grid2}>
            {dangerSignOptions.map(sign => (
              <label key={sign} className={styles.field}>
                <span className={styles.label}>{sign}</span>
                <input type="checkbox" checked={vals.dangerSigns.includes(sign)} onChange={() => toggleDanger(sign)} />
              </label>
            ))}
          </div>

          {vals.dangerSigns.length > 0 && (
            <div className={styles.alert}>Danger signs flagged: {vals.dangerSigns.length}. Refer patient immediately.</div>
          )}

          <h3 className={styles.sectionTitle} style={{ marginTop: 14 }}>Nurse notes</h3>
          <div className={styles.field}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.input} rows={3} value={vals.nurseNotes} onChange={e => ch('nurseNotes', e.target.value)} placeholder="Clinical observations and actions" />
          </div>
          <div className={styles.field} style={{ marginTop: 10 }}>
            <label className={styles.label}>Next visit date</label>
            <input type="date" className={styles.input} value={vals.nextVisitDate} onChange={e => ch('nextVisitDate', e.target.value)} />
          </div>

          {saved && assessment && (
            <div className={styles.alert} style={{ marginTop: 12 }}>
              Risk assessment: {getRiskLabel(assessment.level)} (score {assessment.score})
            </div>
          )}

          {formMessage && <div className={styles.alert} style={{ marginTop: 12 }}>{formMessage}</div>}

          <div className={styles.actions}>
            {saved ? (
              <button className={styles.btn} onClick={() => navigate(`/patients/${teiUid}`)}>View patient record</button>
            ) : (
              <div />
            )}
            <div className={styles.actionsRight}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmit} disabled={loadingText || saved}>
                {loadingText ? 'Saving...' : saved ? 'Visit saved' : 'Save ANC visit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
