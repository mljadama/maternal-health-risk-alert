// src/components/patients/PatientCard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import RiskBadge from './RiskBadge.jsx'
import { RISK_COLORS } from '../../config/dhis2.js'
import styles from './PatientCard.module.css'

/**
 * Patient Card Component
 * Displays patient information in a clickable card
 * @param {object} patient - Patient data object with: teiUid, name, age, village, facility, gestationalAge, totalVisits, assessment
 */
export default function PatientCard({ patient }) {
  const navigate = useNavigate()
  const { teiUid, name, age, village, facility, gestationalAge, totalVisits, assessment } = patient
  const riskLevel = assessment?.level || 'normal'
  const riskCfg = RISK_COLORS[riskLevel] || RISK_COLORS.normal
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const riskLevelClass = {
    high: styles.cardHigh,
    moderate: styles.cardModerate,
    normal: styles.cardNormal,
  }[riskLevel] || styles.cardNormal

  const avatarClass = {
    high: styles.avatarHigh,
    moderate: styles.avatarModerate,
    normal: styles.avatarNormal,
  }[riskLevel] || styles.avatarNormal

  return (
    <button
      className={`${styles.card} ${riskLevelClass}`}
      onClick={() => navigate(`/patients/${teiUid}`)}
      style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
      aria-label={`View patient ${name}`}
    >
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={`${styles.avatar} ${avatarClass}`}>
            {initials}
          </div>
          <div className={styles.nameSection}>
            <h3 className={styles.name}>{name}</h3>
            <p className={styles.age}>Age {age ?? '—'}</p>
          </div>
          <RiskBadge level={riskLevel} flags={assessment?.flags} />
        </div>

        <hr className={styles.divider} />

        {/* Details */}
        <div className={styles.details}>
          {village && (
            <div className={styles.detailRow}>
              <span className={styles.icon}>📍</span>
              <p className={styles.detailText}>{village}</p>
            </div>
          )}
          {facility && (
            <div className={styles.detailRow}>
              <span className={styles.icon}>🏥</span>
              <p className={styles.detailText}>{facility}</p>
            </div>
          )}
          <div className={styles.statsRow}>
            {gestationalAge && (
              <div className={styles.stat}>
                <span className={styles.statIcon}>📅</span>
                <span>{gestationalAge} wks</span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statIcon}>📋</span>
              <span>{totalVisits} visit{totalVisits !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}