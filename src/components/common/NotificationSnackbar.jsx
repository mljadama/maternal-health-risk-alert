// src/components/common/NotificationSnackbar.jsx
import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext.jsx'
import styles from './NotificationSnackbar.module.css'

/**
 * Notification Snackbar Component
 * Displays temporary notifications at the bottom of the screen
 * Automatically dismisses after 5 seconds
 */
export default function NotificationSnackbar() {
  const { notification, closeNotification } = useAppContext()
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (notification.open) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(closeNotification, 300)
      }, 5000)
      return () => clearTimeout(timer)
    }
    setIsExiting(false)
  }, [notification.open, closeNotification])

  if (!notification.open) return null

  const getIconElement = (severity) => {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    }
    return icons[severity] || '•'
  }

  const getSeverityClass = (severity) => {
    const classes = {
      success: styles.success,
      error: styles.error,
      warning: styles.warning,
      info: styles.info,
    }
    return classes[severity] || styles.info
  }

  const getIconClass = (severity) => {
    const classes = {
      success: styles.successIcon,
      error: styles.errorIcon,
      warning: styles.warningIcon,
      info: styles.infoIcon,
    }
    return classes[severity] || styles.infoIcon
  }

  return (
    <div className={`${styles.container} ${isExiting ? styles.exit : ''}`}>
      <div className={`${styles.notification} ${getSeverityClass(notification.severity)}`}>
        <span className={getIconClass(notification.severity)}>
          {getIconElement(notification.severity)}
        </span>
        <span className={styles.message}>{notification.message}</span>
        <button
          className={styles.closeButton}
          onClick={() => {
            setIsExiting(true)
            setTimeout(closeNotification, 300)
          }}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  )
}