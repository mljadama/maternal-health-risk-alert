// src/components/common/NotificationSnackbar.jsx
import React from 'react'
import { Alert, Snackbar } from '@mui/material'
import { useAppContext } from '../../context/AppContext.jsx'

export default function NotificationSnackbar() {
  const { notification, closeNotification } = useAppContext()

  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={5000}
      onClose={closeNotification}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={notification.severity}
        variant="filled"
        onClose={closeNotification}
        sx={{ borderRadius: 2, minWidth: 320 }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  )
}