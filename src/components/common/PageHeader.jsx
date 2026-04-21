// src/components/common/PageHeader.jsx
import React from 'react'
import { Box, Button } from '@dhis2/ui'
import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.css'

/**
 * Page Header Component
 * Displays page title, subtitle, back button, badge, and optional action
 * @param {string} title - Page title
 * @param {string} subtitle - Optional subtitle
 * @param {string} backTo - Route path to navigate back to
 * @param {string} badge - Optional badge label
 * @param {ReactNode} action - Optional action element (buttons, etc.)
 */
export default function PageHeader({
  title,
  subtitle,
  backTo,
  badge,
  action,
}) {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className={styles.backButton}
        >
          ← Back
        </button>
      )}
      <div className={styles.header}>
        <div>
          <div className={styles.titleBox}>
            <h2 className={styles.title}>{title}</h2>
            {badge && (
              <span className={styles.badge}>{badge}</span>
            )}
          </div>
          {subtitle && (
            <div className={styles.subtitle}>{subtitle}</div>
          )}
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  )
}