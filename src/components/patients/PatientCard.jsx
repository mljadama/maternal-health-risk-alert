// src/components/patients/PatientCard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar, Box, Card, CardActionArea, CardContent,
  Chip, Divider, Typography,
} from '@mui/material'
import { LocationOn, LocalHospital, CalendarMonth, EventNote } from '@mui/icons-material'
import RiskBadge from './RiskBadge.jsx'
import { RISK_COLORS } from '../../config/dhis2.js'

export default function PatientCard({ patient }) {
  const navigate = useNavigate()
  const { teiUid, name, age, village, facility, gestationalAge, totalVisits, lastVisitDate, assessment } = patient
  const cfg     = RISK_COLORS[assessment?.level] ?? RISK_COLORS.normal
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: `1.5px solid ${cfg.border}`,
        background: '#fff',
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,.08)' },
      }}
    >
      <CardActionArea onClick={() => navigate(`/patients/${teiUid}`)} sx={{ borderRadius: '14px' }}>
        <CardContent sx={{ p: 2 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
            <Avatar sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 800, background: `${cfg.main}22`, color: cfg.main, flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a', lineHeight: 1.2 }} noWrap>{name}</Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11 }}>Age {age ?? '—'}</Typography>
            </Box>
            <RiskBadge level={assessment?.level} flags={assessment?.flags} />
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* Details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            {village && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <LocationOn sx={{ fontSize: 13, color: '#94a3b8' }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: '#64748b' }}>{village}</Typography>
              </Box>
            )}
            {facility && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <LocalHospital sx={{ fontSize: 13, color: '#94a3b8' }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: '#64748b' }} noWrap>{facility}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {gestationalAge && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <CalendarMonth sx={{ fontSize: 12, color: '#94a3b8' }} />
                  <Typography variant="caption" sx={{ fontSize: 11, color: '#64748b' }}>{gestationalAge} wks</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <EventNote sx={{ fontSize: 12, color: '#94a3b8' }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: '#64748b' }}>{totalVisits} visit{totalVisits !== 1 ? 's' : ''}</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}