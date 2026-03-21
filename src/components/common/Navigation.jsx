// src/components/common/LoadingSpinner.jsx
import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function LoadingSpinner({ message = 'Loading…', size = 28, fullPage = false }) {
  if (fullPage) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={size} sx={{ color: '#6366f1' }} />
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3 }}>
      <CircularProgress size={size} sx={{ color: '#6366f1' }} />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  )
}