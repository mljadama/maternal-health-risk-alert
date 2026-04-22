import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataQuery } from '@dhis2/app-runtime'
import { useRegisterPatient } from '../hooks/useRegisterPatient.js'
import { useDhis2Config } from '../hooks/useDhis2Config.js'
import styles from './FormPage.module.css'

const STEPS = ['Personal details', 'Pregnancy info', 'Review & submit']

const INIT = {
  fullName: '',
  age: '',
  village: '',
  phoneNumber: '',
  orgUnit: '',
  gestationalAge: '',
  parity: '',
  previousComplications: 'None',
}

const ORG_UNITS_QUERY = {
  orgUnits: {
    resource: 'organisationUnits',
    params: { fields: 'id,displayName', userOnly: true, paging: false },
  },
}

function validate(values, step) {
  const errors = {}
  if (step === 0 || step === 'all') {
    if (!values.fullName.trim()) errors.fullName = 'Required'
    if (!values.age || values.age < 10 || values.age > 60) errors.age = 'Enter valid age (10 to 60)'
    if (!values.village.trim()) errors.village = 'Required'
    if (!values.phoneNumber.trim()) errors.phoneNumber = 'Required'
    if (!values.orgUnit) errors.orgUnit = 'Select a facility'
  }
  if (step === 1 || step === 'all') {
    if (!values.gestationalAge || values.gestationalAge < 1 || values.gestationalAge > 42) {
      errors.gestationalAge = 'Enter weeks (1 to 42)'
    }
    if (values.parity === '' || values.parity < 0 || values.parity > 15) {
      errors.parity = 'Enter previous births (0 to 15)'
    }
  }
  return errors
}

export default function RegisterPatient() {
  const navigate = useNavigate()
  const { config } = useDhis2Config()
  const [step, setStep] = useState(0)
  const [vals, setVals] = useState(INIT)
  const [errs, setErrs] = useState({})
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: ouData, loading: ouLoading } = useDataQuery(ORG_UNITS_QUERY)
  const orgUnits = ouData?.orgUnits?.organisationUnits ?? []
  const { register, loading: submitting } = useRegisterPatient()

  function change(field, value) {
    setVals(prev => ({ ...prev, [field]: value }))
    if (errs[field]) setErrs(prev => ({ ...prev, [field]: undefined }))
    setFormError('')
  }

  function handleNext() {
    const e = validate(vals, step)
    if (Object.keys(e).length) {
      setErrs(e)
      return
    }
    setErrs({})
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    const e = validate(vals, 'all')
    if (Object.keys(e).length) {
      setErrs(e)
      setStep(0)
      return
    }

    try {
      await register(vals, vals.orgUnit)
      setSaved(true)
    } catch (err) {
      setFormError('Registration failed: ' + err.message)
    }
  }

  const progress = (step / (STEPS.length - 1)) * 100
  const facilityName = orgUnits.find(o => o.id === vals.orgUnit)?.displayName || vals.orgUnit

  const riskFlags = []
  if (vals.age && (Number(vals.age) < 18 || Number(vals.age) > 35)) riskFlags.push('Age risk')
  if (vals.gestationalAge && Number(vals.gestationalAge) > 13) riskFlags.push('Late presentation')
  if (vals.parity && Number(vals.parity) >= 4) riskFlags.push('Grand multipara')

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Register pregnant woman</h1>
          <p className={styles.subtitle}>Enroll a new patient in the Antenatal Care program</p>
        </div>

        <div className={styles.stepper}>
          {STEPS.map((label, idx) => (
            <div key={label} className={`${styles.step} ${idx === step ? styles.stepActive : ''}`}>
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.card}>
          {!saved && step === 0 && (
            <div className={styles.grid}>
              <h3 className={styles.sectionTitle}>Personal details</h3>

              <div className={styles.field}>
                <label className={styles.label}>Full name</label>
                <input className={styles.input} value={vals.fullName} onChange={e => change('fullName', e.target.value)} placeholder="e.g. Jane Smith" />
                {errs.fullName && <div className={styles.error}>{errs.fullName}</div>}
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Age</label>
                  <input type="number" className={styles.input} value={vals.age} onChange={e => change('age', e.target.value)} min="10" max="60" />
                  {errs.age && <div className={styles.error}>{errs.age}</div>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Village</label>
                  <input className={styles.input} value={vals.village} onChange={e => change('village', e.target.value)} placeholder="e.g. Springfield" />
                  {errs.village && <div className={styles.error}>{errs.village}</div>}
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Phone number</label>
                  <input className={styles.input} value={vals.phoneNumber} onChange={e => change('phoneNumber', e.target.value)} placeholder="+1 555-0123" />
                  {errs.phoneNumber && <div className={styles.error}>{errs.phoneNumber}</div>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Health facility</label>
                  <select className={styles.input} value={vals.orgUnit} onChange={e => change('orgUnit', e.target.value)}>
                    <option value="">Select facility</option>
                    {ouLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : (
                      orgUnits.map(o => <option key={o.id} value={o.id}>{o.displayName}</option>)
                    )}
                  </select>
                  {errs.orgUnit && <div className={styles.error}>{errs.orgUnit}</div>}
                </div>
              </div>
            </div>
          )}

          {!saved && step === 1 && (
            <div className={styles.grid}>
              <h3 className={styles.sectionTitle}>Pregnancy information</h3>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Gestational age</label>
                  <input type="number" className={styles.input} value={vals.gestationalAge} onChange={e => change('gestationalAge', e.target.value)} min="1" max="42" />
                  <div className={styles.hint}>{errs.gestationalAge || 'Weeks since LMP'}</div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Parity</label>
                  <input type="number" className={styles.input} value={vals.parity} onChange={e => change('parity', e.target.value)} min="0" max="15" />
                  <div className={styles.hint}>{errs.parity || 'Number of previous births'}</div>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Previous complications</label>
                <select className={styles.input} value={vals.previousComplications} onChange={e => change('previousComplications', e.target.value)}>
                  {config.complicationOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className={styles.hint}>Most significant previous complication</div>
              </div>

              {riskFlags.length > 0 && (
                <div className={styles.alert}>Risk factors detected: {riskFlags.join(', ')}</div>
              )}
            </div>
          )}

          {!saved && step === 2 && (
            <div>
              <h3 className={styles.sectionTitle}>Review registration</h3>
              {riskFlags.length > 0 && <div className={styles.badge}>High-risk pregnancy detected</div>}

              <div className={styles.reviewCard}>
                <p className={styles.reviewTitle}>Personal details</p>
                {[
                  ['Full name', vals.fullName],
                  ['Age', vals.age + ' years'],
                  ['Village', vals.village],
                  ['Phone', vals.phoneNumber],
                  ['Facility', facilityName || 'Not selected'],
                ].map(([k, v]) => (
                  <div className={styles.reviewRow} key={k}><span>{k}</span><strong>{v || 'Not provided'}</strong></div>
                ))}
              </div>

              <div className={styles.reviewCard}>
                <p className={styles.reviewTitle}>Pregnancy</p>
                {[
                  ['Gestational age', vals.gestationalAge + ' weeks'],
                  ['Parity', vals.parity],
                  ['Previous complications', vals.previousComplications],
                ].map(([k, v]) => (
                  <div className={styles.reviewRow} key={k}><span>{k}</span><strong>{v || 'Not provided'}</strong></div>
                ))}
              </div>
            </div>
          )}

          {saved && (
            <div className={styles.success}>
              <h2 className={styles.successTitle}>Patient registered</h2>
              <p className={styles.successText}>{vals.fullName} is now enrolled in the ANC program.</p>
              <div className={styles.actionsRight} style={{ justifyContent: 'center', marginTop: 12 }}>
                <button className={styles.btn} onClick={() => { setVals(INIT); setStep(0); setSaved(false) }}>Register another</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate('/patients')}>View patients</button>
              </div>
            </div>
          )}

          {formError && <div className={styles.alert}>{formError}</div>}

          {!saved && (
            <div className={styles.actions}>
              <button className={styles.btn} onClick={() => setStep(s => s - 1)} disabled={step === 0 || submitting}>Back</button>
              <div className={styles.hint}>Step {step + 1} of {STEPS.length}</div>
              <div className={styles.actionsRight}>
                {step < STEPS.length - 1 ? (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleNext}>Continue</button>
                ) : (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Registering...' : 'Register patient'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
