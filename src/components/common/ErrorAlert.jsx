// src/components/common/ErrorAlert.jsx
import React from 'react'
import { Box, Button } from '@dhis2/ui'
import styles from './ErrorAlert.module.css'

/**
 * Error Alert Component
 * Displays error messages with optional retry action
 * @param {Error} error - Error object or message
 * @param {Function} onRetry - Optional retry callback
 * @param {string} title - Error title (default: "Failed to load data")
 */
export default function ErrorAlert({ error, onRetry, title = 'Failed to load data' }) {
  const message = error?.message || String(error) || 'An unexpected error occurred.'

  return (
    <Box className={styles.container}>
      <div className={styles.alert}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
        {onRetry && (
          <Button
            onClick={onRetry}
            className={styles.button}
            secondary
            small
            icon={() => <span>↻</span>}
          >
            Retry
          </Button>
        )}
      </div>
    </Box>
  )
}