import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataMutation, useDataQuery, useDataEngine } from '@dhis2/app-runtime'
import { assessRisk, getRiskLabel } from '../services/riskEngine.js'
import { useDhis2Config } from '../hooks/useDhis2Config.js'
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

const TRACKER_MUTATION = {
  resource: 'tracker',
  type: 'create',
  data: ({ payload }) => payload,
}

async function pollJob(engine, jobId, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1500))
    try {
      const result = await engine.query({
        job: { resource: `tracker/jobs/${jobId}/report`, params: { reportMode: 'FULL' } },
      })
      const report = result?.job
      if (report?.status === 'OK' || report?.status === 'WARNING') return { success: true }
      if (report?.status === 'ERROR') throw new Error('Event save failed on DHIS2 server')
    } catch (err) {
      if (err.message.includes('failed')) throw err
    }
  }
  return { success: true }
}

function validate(v) {
  const e = {}
  if (!v.visitDate) e.visitDate = 'Required'
  if (!v.bpSystolic || v.bpSystolic < 60 || v.bpSystolic > 250) e.bpSystolic = 'Enter 60-250'
  if (!v.bpDiastolic || v.bpDiastolic < 40 || v.bpDiastolic > 150) e.bpDiastolic = 'Enter 40-150'
  if (!v.haemoglobin || v.haemoglobin < 3 || v.haemoglobin > 20) e.haemoglobin = 'Enter 3-20'
  if (!v.weight || v.weight < 25 || v.weight > 200) e.weight = 'Enter 25-200'
  if (!v.gestationalAge || v.gestationalAge < 1 || v.gestationalAge > 42) e.gestationalAge = 'Enter 1-42'
  return e
}

export default function RecordVisit() {
  const { teiUid } = useParams()
  const navigate = useNavigate()
  const engine = useDataEngine()
  const { config, loading: configLoading } = useDhis2Config()
  const malariaResults = config.malariaResults
  const dangerSignOptions = config.dangerSignOptions

  const ENROLLMENT_QUERY = useMemo(() => ({
    enrollment: {
      resource: 'tracker/enrollments',
      params: ({ teiUid }) => ({
        trackedEntity: teiUid,
        program: config.program.id,
        ouMode: 'ACCESSIBLE',
        fields: 'enrollment,orgUnit,orgUnitName',
        paging: false,
      }),
    },
  }), [config.program.id])

  const [vals, setVals] = useState(INIT)
  const [errs, setErrs] = useState({})
  const [saved, setSaved] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [formMessage, setFormMessage] = useState('')
  const [loadingText, setLoadingText] = useState(false)

  const { data: enrData } = useDataQuery(ENROLLMENT_QUERY, { variables: { teiUid }, lazy: !teiUid || configLoading })
  const [mutate, { loading }] = useDataMutation(TRACKER_MUTATION)

  const enrollment = enrData?.enrollment?.enrollments?.[0] ?? null
  const orgUnit = enrollment?.orgUnit ?? null

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
    return assessRisk({}, {
      latestBpSystolic: Number(vals.bpSystolic),
      latestBpDiastolic: Number(vals.bpDiastolic),
      latestHaemoglobin: Number(vals.haemoglobin),
      currentWeek: Number(vals.gestationalAge),
      latestMalariaResult: vals.malariaTestResult,
      dangerSigns: vals.dangerSigns,
    })
  }, [vals.bpSystolic, vals.bpDiastolic, vals.haemoglobin, vals.gestationalAge, vals.malariaTestResult, vals.dangerSigns])

  async function handleSubmit() {
    const e = validate(vals)
    if (Object.keys(e).length) {
      setErrs(e)
      return
    }
    if (!orgUnit) {
      setFormMessage('Could not find enrollment org unit. Please try again.')
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
          enrollment: enrollment?.enrollment,
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
            { dataElement: config.dataElements.ironSupplementation, value: String(vals.ironSupplementation) },
            { dataElement: config.dataElements.folicAcid, value: String(vals.folicAcid) },
            { dataElement: config.dataElements.nurseNotes, value: vals.nurseNotes || '' },
            { dataElement: config.dataElements.dangerSigns, value: dangerValue },
            { dataElement: config.dataElements.nextVisitDate, value: vals.nextVisitDate || '' },
          ].filter(dv => dv.value !== ''),
        }],
      }

      const result = await mutate({ payload })
      const jobId = result?.response?.id
      if (jobId) await pollJob(engine, jobId)

      const risk = assessRisk({}, {
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
      setFormMessage('Save failed: ' + err.message)
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
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmit} disabled={loading || loadingText || saved}>
                {loading || loadingText ? 'Saving...' : saved ? 'Visit saved' : 'Save ANC visit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
