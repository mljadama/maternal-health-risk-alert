// src/components/common/ErrorAlert.jsx
import React from 'react'
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material'
import { Refresh } from '@mui/icons-material'

export default function ErrorAlert({ error, onRetry, title = 'Failed to load data' }) {
  const message = error?.message || String(error) || 'An unexpected error occurred.'

  return (
    <Box sx={{ p: 3 }}>
      <Alert
        severity="error"
        sx={{ borderRadius: 2 }}
        action={
          onRetry && (
            <Button color="error" size="small" startIcon={<Refresh />} onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        <AlertTitle sx={{ fontWeight: 700 }}>{title}</AlertTitle>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {message}
        </Typography>
      </Alert>
    </Box>
  )
}