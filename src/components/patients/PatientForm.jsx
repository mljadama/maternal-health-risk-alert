// src/components/patients/PatientForm.jsx
// Shared demographic form fields used by the registration page.
import React from 'react'
import { COMPLICATION_OPTIONS } from '../../config/dhis2.js'
import styles from './PatientForm.module.css'

/**
 * Personal Details Form Fields
 * Captures basic patient demographics
 */
export function PersonalDetailsFields({ values, errors, onChange, orgUnits = [], orgUnitsLoading = false }) {
  return (
    <div className={styles.grid}>
      {/* Full Name */}
      <div className={styles.field}>
        <label className={`${styles.label} ${styles.required}`}>Full name</label>
        <div className={styles.inputWithIcon}>
          <span className={styles.icon}>👤</span>
          <input
            type="text"
            className={`${styles.input} ${errors.fullName ? styles.error : ''}`}
            value={values.fullName}
            onChange={e => onChange('fullName', e.target.value)}
            placeholder="e.g. Jane Smith"
            required
          />
        </div>
        {errors.fullName && <div className={`${styles.helperText} ${styles.error}`}>{errors.fullName}</div>}
      </div>

      {/* Age and Village in two columns */}
      <div className={styles.grid + ' ' + styles.twoColumn}>
        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`}>Age</label>
          <input
            type="number"
            className={`${styles.input} ${errors.age ? styles.error : ''}`}
            value={values.age}
            onChange={e => onChange('age', e.target.value)}
            min="10"
            max="60"
            required
          />
          <div className={styles.helperText}>
            {errors.age ? errors.age : (values.age && (Number(values.age) < 18 || Number(values.age) > 35) ? '⚠ Outside 18–35 normal range' : '')}
          </div>
        </div>

        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`}>Village</label>
          <div className={styles.inputWithIcon}>
            <span className={styles.icon}>📍</span>
            <input
              type="text"
              className={`${styles.input} ${errors.village ? styles.error : ''}`}
              value={values.village}
              onChange={e => onChange('village', e.target.value)}
              placeholder="e.g. Springfield"
              required
            />
          </div>
          {errors.village && <div className={`${styles.helperText} ${styles.error}`}>{errors.village}</div>}
        </div>
      </div>

      {/* Phone Number and Facility in two columns */}
      <div className={styles.grid + ' ' + styles.twoColumn}>
        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`}>Phone number</label>
          <div className={styles.inputWithIcon}>
            <span className={styles.icon}>📱</span>
            <input
              type="tel"
              className={`${styles.input} ${errors.phoneNumber ? styles.error : ''}`}
              value={values.phoneNumber}
              onChange={e => onChange('phoneNumber', e.target.value)}
              placeholder="+1 555-0123"
              required
            />
          </div>
          {errors.phoneNumber && <div className={`${styles.helperText} ${styles.error}`}>{errors.phoneNumber}</div>}
        </div>

        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`}>Health facility</label>
          <div className={styles.inputWithIcon}>
            <span className={styles.icon}>🏥</span>
            <select
              className={`${styles.input} ${styles.select} ${errors.orgUnit ? styles.error : ''}`}
              value={values.orgUnit}
              onChange={e => onChange('orgUnit', e.target.value)}
              required
            >
              <option value="">Select a facility...</option>
              {orgUnitsLoading ? (
                <option disabled>Loading…</option>
              ) : (
                orgUnits.map(o => (
                  <option key={o.id} value={o.id}>{o.displayName}</option>
                ))
              )}
            </select>
          </div>
          {errors.orgUnit && <div className={`${styles.helperText} ${styles.error}`}>{errors.orgUnit}</div>}
        </div>
      </div>
    </div>
  )
}

/**
 * Pregnancy Details Form Fields
 * Captures pregnancy-specific information
 */
export function PregnancyDetailsFields({ values, errors, onChange }) {
  return (
    <div className={styles.grid}>
      {/* Gestational Age and Parity in two columns */}
      <div className={styles.grid + ' ' + styles.twoColumn}>
        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`}>Gestational age</label>
          <div className={styles.inputWithIcon}>
            <input
              type="number"
              className={`${styles.input} ${errors.gestationalAge ? styles.error : ''}`}
              value={values.gestationalAge}
              onChange={e => onChange('gestationalAge', e.target.value)}
              min="1"
              max="42"
              required
            />
            <span className={styles.inputAdornment}>weeks</span>
          </div>
          <div className={styles.helperText}>{errors.gestationalAge || 'Weeks since LMP'}</div>
        </div>

        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`}>Parity</label>
          <input
            type="number"
            className={`${styles.input} ${errors.parity ? styles.error : ''}`}
            value={values.parity}
            onChange={e => onChange('parity', e.target.value)}
            min="0"
            max="15"
            required
          />
          <div className={styles.helperText}>{errors.parity || 'Number of previous births'}</div>
        </div>
      </div>

      {/* Previous Complications */}
      <div className={styles.field}>
        <label className={styles.label}>Previous complications</label>
        <select
          className={`${styles.input} ${styles.select}`}
          value={values.previousComplications}
          onChange={e => onChange('previousComplications', e.target.value)}
        >
          <option value="">None</option>
          {COMPLICATION_OPTIONS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className={styles.helperText}>Most significant previous complication</div>
      </div>
    </div>
  )
}