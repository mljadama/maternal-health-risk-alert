// src/components/patients/RiskBadge.jsx
import React from 'react'
import { Box, Chip, Tooltip, Typography } from '@mui/material'
import { FiberManualRecord, Warning } from '@mui/icons-material'
import { getRiskLabel } from '../../services/riskEngine.js'
import { RISK_COLORS } from '../../config/dhis2.js'

/**
 * RiskBadge
 * Displays a colour-coded risk level pill.
 *
 * Props:
 *   level    - 'high' | 'moderate' | 'normal'
 *   score    - optional numeric score shown alongside
 *   flags    - optional array of triggered rule messages (shown in tooltip)
 *   size     - 'small' (default) | 'medium'
 *   showScore - whether to show score chip
 */
export default function RiskBadge({
  level = 'normal',
  score,
  flags = [],
  size = 'small',
  showScore = false,
}) {
  const cfg = RISK_COLORS[level] ?? RISK_COLORS.normal
  const label = getRiskLabel(level)

  const chip = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: showScore ? 0.6 : 0 }}>
      <Chip
        icon={
          <FiberManualRecord
            sx={{ fontSize: `${size === 'medium' ? 10 : 8}px !important`, color: `${cfg.main} !important` }}
          />
        }
        label={label}
        size={size}
        sx={{
          background:       cfg.light,
          border:           `1.5px solid ${cfg.border}`,
          color:            cfg.dark,
          fontWeight:       700,
          fontSize:         size === 'medium' ? 12 : 11,
          height:           size === 'medium' ? 28 : 24,
          '& .MuiChip-icon': { ml: '6px' },
        }}
      />
      {showScore && score !== undefined && (
        <Chip
          label={`${score} pts`}
          size="small"
          sx={{
            height: 20, fontSize: 10, fontWeight: 700,
            background: cfg.light, color: cfg.main,
            border: `1px solid ${cfg.border}`,
          }}
        />
      )}
    </Box>
  )

  if (flags.length === 0) return chip

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
            {flags.length} risk factor{flags.length > 1 ? 's' : ''}
          </Typography>
          {flags.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.3 }}>
              <Warning sx={{ fontSize: 11, mt: '2px', color: cfg.border }} />
              <Typography variant="caption" sx={{ fontSize: 11, lineHeight: 1.4 }}>{f}</Typography>
            </Box>
          ))}
        </Box>
      }
      arrow
      placement="top"
    >
      <span style={{ cursor: 'help' }}>{chip}</span>
    </Tooltip>
  )
}