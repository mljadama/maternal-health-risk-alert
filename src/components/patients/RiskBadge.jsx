// src/components/patients/RiskBadge.jsx
import React from 'react'
import { getRiskLabel } from '../../services/riskEngine.js'
import { useDhis2Config } from '../../hooks/useDhis2Config.js'
import { getConfiguredRiskColors } from '../../utils/riskColors.js'
import styles from './RiskBadge.module.css'

/**
 * Risk Badge Component
 * Displays a color-coded risk level indicator
 * @param {string} level - Risk level: 'high' | 'moderate' | 'normal'
 * @param {number} score - Optional numeric risk score
 * @param {array} flags - Optional array of triggered rule messages for tooltip
 * @param {string} size - Badge size: 'small' (default) | 'medium'
 * @param {boolean} showScore - Whether to show the score in points
 */
export default function RiskBadge({
  level = 'normal',
  score,
  flags = [],
  size = 'small',
  showScore = false,
}) {
  const { config } = useDhis2Config()
  const colors = getConfiguredRiskColors(config)[level] || getConfiguredRiskColors(config).normal
  const label = getRiskLabel(level)
  const levelClass = {
    high: styles.high,
    moderate: styles.moderate,
    normal: styles.normal,
  }[level] || styles.normal

  const scoreClass = {
    high: styles.scoreHigh,
    moderate: styles.scoreModerate,
    normal: styles.scoreNormal,
  }[level] || styles.scoreNormal

  const badge = (
    <div className={styles.badgeContainer}>
      <div
        className={`${styles.badge} ${styles[size]} ${levelClass}`}
        style={{
          backgroundColor: colors.light,
          borderColor: colors.border,
          color: colors.dark,
        }}
      >
        <span className={styles.dot} style={{ backgroundColor: colors.main }} />
        <span>{label}</span>
      </div>
      {showScore && score !== undefined && (
        <div
          className={`${styles.score} ${scoreClass}`}
          style={{
            backgroundColor: colors.light,
            borderColor: colors.border,
            color: colors.main,
          }}
        >
          {score} pts
        </div>
      )}
    </div>
  )

  // If no flags, return badge without tooltip
  if (!flags || flags.length === 0) {
    return badge
  }

  // With tooltip for flags
  return (
    <div className={styles.tooltip}>
      {badge}
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipTitle}>
          {flags.length} risk factor{flags.length !== 1 ? 's' : ''}
        </div>
        {flags.map((flag, idx) => (
          <div key={idx} className={styles.tooltipItem}>
            <span className={styles.tooltipIcon}>⚠️</span>
            <span>{flag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}