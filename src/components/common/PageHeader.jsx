// src/components/common/PageHeader.jsx
import React from 'react'
import { Box, Button, Chip, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export default function PageHeader({
  title,
  subtitle,
  backTo,
  badge,
  action,
}) {
  const navigate = useNavigate()

  return (
    <Box sx={{ mb: 3 }}>
      {backTo && (
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(backTo)}
          sx={{ mb: 1.5, color: '#64748b', textTransform: 'none', fontWeight: 500, p: 0 }}
        >
          Back
        </Button>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a', letterSpacing: '-.02em', lineHeight: 1.2 }}>
              {title}
            </Typography>
            {badge && (
              <Chip label={badge} size="small" sx={{ fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }} />
            )}
          </Box>
          {subtitle && (
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.4 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
    </Box>
  )
}