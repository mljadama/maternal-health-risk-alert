// src/pages/RiskAlerts.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Risk Alerts page — lists all high-risk and moderate-risk pregnant women.
//
// Features:
//   • Summary banner cards (high / moderate counts)
//   • Search by name or village
//   • Filter by risk level (all / high / moderate)
//   • Sortable MUI table with expandable detail rows
//   • Per-row risk flags chips and recommendations
//   • Mock data fallback for development
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Search,
  Warning,
  ErrorOutline,
  KeyboardArrowDown,
  KeyboardArrowUp,
  LocationOn,
  LocalHospital,
  Phone,
  CalendarMonth,
  Favorite,
  Bloodtype,
  BugReport,
  FiberManualRecord,
  FilterList,
  PersonSearch,
  Refresh,
} from '@mui/icons-material'

import { useAlerts }    from '../hooks/useAlerts.js'
import { getRiskLabel } from '../services/riskEngine.js'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  high:     { main: '#dc2626', light: '#fef2f2', border: '#fecaca', dark: '#991b1b' },
  moderate: { main: '#d97706', light: '#fffbeb', border: '#fde68a', dark: '#92400e' },
  normal:   { main: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', dark: '#14532d' },
  text:     '#0f172a',
  text2:    '#64748b',
  text3:    '#94a3b8',
  border:   '#e2e8f0',
  bg:       '#f8fafc',
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — realistic Gambian patient records
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ALERTS = [
  {
    teiUid: 't1', name: 'Fatou Jallow',    age: 16, village: 'Bakau',      facility: 'Serrekunda General Hospital',        phone: '+220 7012345', parity: 0, totalVisits: 1, gestationalAge: 26, latestVisitDate: '2026-03-10', latestBpSystolic: 148, latestBpDiastolic: 96,  latestHaemoglobin: 10.1, latestMalariaResult: 'Negative',                   dangerSigns: ['Severe headache'], nurseNotes: 'Patient reports persistent headache since yesterday. Referred to obstetrics.',
    assessment: { level: 'high',     score: 95, flags: ['Adolescent pregnancy — age 16 (under 18)', 'Hypertension — 148/96 mmHg (≥ 140/90)', 'Danger sign: Severe headache'], rules: [ { id: 'AGE_YOUNG', recommendation: 'Refer to specialist ANC clinic. Screen for pre-eclampsia.' }, { id: 'BP_HYP', recommendation: 'Repeat BP in 15 min. Order urine protein. Refer to doctor.' }, { id: 'DANGER', recommendation: 'URGENT: Refer to hospital immediately.' } ] },
  },
  {
    teiUid: 't2', name: 'Aminata Touray',  age: 38, village: 'Brikama',    facility: 'Brikama Health Centre',              phone: '+220 7654321', parity: 5, totalVisits: 2, gestationalAge: 32, latestVisitDate: '2026-03-08', latestBpSystolic: 122, latestBpDiastolic: 80,  latestHaemoglobin: 6.2,  latestMalariaResult: 'Positive (P. falciparum)',    dangerSigns: [], nurseNotes: 'Malaria RDT positive. Started quinine as per protocol. Iron therapy initiated.',
    assessment: { level: 'high',     score: 85, flags: ['Severe anaemia — Hb 6.2 g/dL (threshold < 7)', 'Active malaria infection — P. falciparum', 'Grand multiparity — parity 5', 'Advanced maternal age — age 38'], rules: [ { id: 'HB_SEV', recommendation: 'URGENT: Consider blood transfusion. Admit patient.' }, { id: 'MAL_POS', recommendation: 'Continue antimalarial therapy. Monitor foetal wellbeing.' }, { id: 'MULTI', recommendation: 'Plan delivery at facility with blood bank.' } ] },
  },
  {
    teiUid: 't3', name: 'Mariama Ceesay',  age: 29, village: 'Farafenni',  facility: 'Farafenni Hospital',                 phone: '+220 7891234', parity: 2, totalVisits: 1, gestationalAge: 28, latestVisitDate: '2026-02-28', latestBpSystolic: 118, latestBpDiastolic: 74,  latestHaemoglobin: 9.8,  latestMalariaResult: 'Negative',                   dangerSigns: [], nurseNotes: 'First visit late in second trimester. Expedited booking for anatomy scan.',
    assessment: { level: 'high',     score: 50, flags: ['Late ANC booking — first visit at week 28 (after first trimester)', 'Mild anaemia — Hb 9.8 g/dL (< 11)'], rules: [ { id: 'LATE', recommendation: 'First visit in third trimester. Expedite all screening tests immediately.' }, { id: 'HB_MILD', recommendation: 'Increase iron and folic acid. Dietary counselling. Recheck Hb in 6 weeks.' } ] },
  },
  {
    teiUid: 't4', name: 'Isatou Jobe',     age: 22, village: 'Serekunda',  facility: 'Serrekunda General Hospital',        phone: '+220 7345678', parity: 1, totalVisits: 2, gestationalAge: 20, latestVisitDate: '2026-03-05', latestBpSystolic: 141, latestBpDiastolic: 92,  latestHaemoglobin: 11.4, latestMalariaResult: 'Negative',                   dangerSigns: [], nurseNotes: 'BP elevated on two consecutive readings. Dipstick negative for protein.',
    assessment: { level: 'high',     score: 55, flags: ['Hypertension — 141/92 mmHg (≥ 140/90)', 'Previous obstetric complication: Previous C-section'], rules: [ { id: 'BP_HYP', recommendation: 'Repeat BP in 15 min. Order urine protein. Refer to doctor.' }, { id: 'COMP', recommendation: 'Increase monitoring frequency. Document complication details.' } ] },
  },
  {
    teiUid: 't5', name: 'Binta Sanneh',    age: 33, village: 'Kanifing',   facility: 'Edward Francis Small Teaching Hosp', phone: '+220 7901234', parity: 3, totalVisits: 3, gestationalAge: 34, latestVisitDate: '2026-03-12', latestBpSystolic: 128, latestBpDiastolic: 84,  latestHaemoglobin: 7.8,  latestMalariaResult: 'Negative',                   dangerSigns: [], nurseNotes: 'Haemoglobin improving after 4 weeks of iron therapy. Continue current regimen.',
    assessment: { level: 'moderate', score: 30, flags: ['Moderate anaemia — Hb 7.8 g/dL (< 8)'], rules: [ { id: 'HB_MOD', recommendation: 'Continue oral iron therapy. Malaria test. Recheck Hb in 4 weeks.' } ] },
  },
  {
    teiUid: 't6', name: 'Ndey Sowe',       age: 26, village: 'Banjul',     facility: 'Royal Victoria Teaching Hospital',  phone: '+220 7234567', parity: 0, totalVisits: 2, gestationalAge: 18, latestVisitDate: '2026-03-01', latestBpSystolic: 116, latestBpDiastolic: 72,  latestHaemoglobin: 9.2,  latestMalariaResult: 'Negative',                   dangerSigns: [], nurseNotes: 'Mild anaemia detected. Iron supplementation started. Diet counselling given.',
    assessment: { level: 'moderate', score: 20, flags: ['Mild anaemia — Hb 9.2 g/dL (< 11)'], rules: [ { id: 'HB_MILD', recommendation: 'Increase iron and folic acid supplementation. Dietary counselling. Recheck in 6 weeks.' } ] },
  },
  {
    teiUid: 't7', name: 'Adama Baldeh',    age: 17, village: 'Soma',       facility: 'Soma District Hospital',            phone: '+220 7567890', parity: 0, totalVisits: 3, gestationalAge: 22, latestVisitDate: '2026-03-14', latestBpSystolic: 112, latestBpDiastolic: 70,  latestHaemoglobin: 10.8, latestMalariaResult: 'Negative',                   dangerSigns: [], nurseNotes: 'Adolescent patient. Social support assessment completed. School counselling referred.',
    assessment: { level: 'moderate', score: 25, flags: ['Adolescent pregnancy — age 17 (under 18)'], rules: [ { id: 'AGE_YOUNG', recommendation: 'Refer to specialist ANC clinic. Screen for pre-eclampsia and anaemia at every visit.' } ] },
  },
  {
    teiUid: 't8', name: 'Kumba Darboe',    age: 36, village: 'Lamin',      facility: 'Brikama Health Centre',             phone: '+220 7678901', parity: 4, totalVisits: 1, gestationalAge: 38, latestVisitDate: '2026-02-20', latestBpSystolic: 136, latestBpDiastolic: 88,  latestHaemoglobin: 10.4, latestMalariaResult: 'Negative',                   dangerSigns: ['Swelling of face/hands'], nurseNotes: 'Facial oedema noted. BP borderline. Referred for specialist review.',
    assessment: { level: 'high',     score: 75, flags: ['Grand multiparity — parity 4', 'Advanced maternal age — age 36', 'Danger sign: Swelling of face/hands', 'Insufficient visits — 1 recorded, min 4 required by week 36'], rules: [ { id: 'MULTI', recommendation: 'Plan delivery at facility with blood bank. Risk of PPH.' }, { id: 'DANGER', recommendation: 'URGENT: Refer to hospital immediately.' }, { id: 'INSUF', recommendation: 'Schedule urgent catch-up visits. Review overdue screening tests.' } ] },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Compact risk level chip */
function RiskChip({ level, size = 'small' }) {
  const cfg = C[level] ?? C.normal
  return (
    <Chip
      icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: `${cfg.main} !important` }} />}
      label={getRiskLabel(level)}
      size={size}
      sx={{
        background: cfg.light,
        border: `1.5px solid ${cfg.border}`,
        color: cfg.dark,
        fontWeight: 700,
        fontSize: 11,
        height: 24,
        '& .MuiChip-icon': { ml: '6px' },
      }}
    />
  )
}

/** A single flag chip */
function FlagChip({ text, level }) {
  const cfg = C[level] ?? C.high
  return (
    <Chip
      label={text}
      size="small"
      icon={<Warning sx={{ fontSize: '11px !important', color: `${cfg.main} !important` }} />}
      sx={{
        background: cfg.light,
        border: `1px solid ${cfg.border}`,
        color: cfg.dark,
        fontSize: 10,
        fontWeight: 500,
        height: 22,
        '& .MuiChip-icon': { ml: '4px' },
        mb: 0.5,
        mr: 0.5,
      }}
    />
  )
}

/** Inline vitals strip */
function VitalsStrip({ bp_s, bp_d, hb, malaria }) {
  const bpHigh = bp_s >= 140 || bp_d >= 90
  const hbLow  = hb && hb < 11
  const malPos = malaria && malaria.includes('Positive')

  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
      {bp_s && bp_d && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <Favorite sx={{ fontSize: 11, color: bpHigh ? C.high.main : C.text3 }} />
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: bpHigh ? 700 : 400, color: bpHigh ? C.high.main : C.text2 }}>
            {bp_s}/{bp_d} mmHg
          </Typography>
        </Box>
      )}
      {hb && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <Bloodtype sx={{ fontSize: 11, color: hbLow ? C.moderate.main : C.text3 }} />
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: hbLow ? 700 : 400, color: hbLow ? C.moderate.main : C.text2 }}>
            Hb {hb} g/dL
          </Typography>
        </Box>
      )}
      {malPos && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <BugReport sx={{ fontSize: 11, color: C.high.main }} />
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: C.high.main }}>
            Malaria +
          </Typography>
        </Box>
      )}
    </Box>
  )
}

/** Expandable detail panel shown inside a collapsed row */
function DetailPanel({ patient }) {
  return (
    <Box sx={{ p: 2.5, background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <Grid container spacing={2}>

        {/* Contact info */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.06em' }}>
            Contact
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Phone sx={{ fontSize: 13, color: C.text3 }} />
              <Typography variant="caption" sx={{ fontSize: 12, color: C.text2 }}>{patient.phone}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <LocationOn sx={{ fontSize: 13, color: C.text3 }} />
              <Typography variant="caption" sx={{ fontSize: 12, color: C.text2 }}>{patient.village}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <LocalHospital sx={{ fontSize: 13, color: C.text3 }} />
              <Typography variant="caption" sx={{ fontSize: 12, color: C.text2 }}>{patient.facility}</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Clinical summary */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.06em' }}>
            Clinical summary
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[
              { label: 'Gestational age', value: patient.gestationalAge ? `${patient.gestationalAge} weeks` : '—' },
              { label: 'Parity',          value: patient.parity ?? '—' },
              { label: 'Total visits',    value: patient.totalVisits },
              { label: 'Previous complication', value: patient.prevComp || 'None' },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>{label}</Typography>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: C.text }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Grid>

        {/* Risk flags + recommendations */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.06em' }}>
            Risk flags
          </Typography>
          <Box sx={{ mt: 1 }}>
            {patient.assessment.flags.map((f, i) => (
              <FlagChip key={i} text={f} level={patient.assessment.level} />
            ))}
          </Box>
        </Grid>

        {/* Nurse notes */}
        {patient.nurseNotes && (
          <Grid item xs={12}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.06em' }}>
              Nurse notes
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: 12, color: C.text2, lineHeight: 1.6, fontStyle: 'italic' }}>
              "{patient.nurseNotes}"
            </Typography>
          </Grid>
        )}

        {/* Recommendations */}
        <Grid item xs={12}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.06em' }}>
            Recommended actions
          </Typography>
          <Box sx={{ mt: 0.8, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            {patient.assessment.rules.map((rule, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: C[patient.assessment.level]?.light,
                  border: `1.5px solid ${C[patient.assessment.level]?.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, mt: 0.1,
                }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 800, color: C[patient.assessment.level]?.main }}>
                    {i + 1}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                  {rule.recommendation}
                </Typography>
              </Box>
            ))}
          </Box>
        </Grid>

      </Grid>
    </Box>
  )
}

/** One full table row with expand/collapse */
function AlertRow({ patient }) {
  const [open, setOpen] = useState(false)
  const cfg             = C[patient.assessment.level] ?? C.normal
  const fmtDate         = d => d
    ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    : '—'
  const topFlag = patient.assessment.flags[0] ?? '—'

  return (
    <>
      <TableRow
        onClick={() => setOpen(o => !o)}
        sx={{
          cursor: 'pointer',
          borderLeft: `4px solid ${cfg.main}`,
          transition: 'background .12s',
          '&:hover': { background: cfg.light },
          background: open ? cfg.light : 'inherit',
        }}
      >
        {/* Expand toggle */}
        <TableCell sx={{ width: 36, pl: 1, pr: 0 }}>
          <IconButton size="small" sx={{ color: C.text3 }}>
            {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </TableCell>

        {/* Name */}
        <TableCell sx={{ py: 1.5 }}>
          <Typography variant="body2" fontWeight={700} sx={{ color: C.text, lineHeight: 1.2 }}>
            {patient.name}
          </Typography>
          <Typography variant="caption" sx={{ color: C.text2, fontSize: 11 }}>
            Age {patient.age ?? '—'} · GA {patient.gestationalAge ?? '—'} wks
          </Typography>
        </TableCell>

        {/* Village */}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 13, color: C.text3 }} />
            <Typography variant="body2" sx={{ fontSize: 12, color: C.text2 }}>{patient.village}</Typography>
          </Box>
        </TableCell>

        {/* Facility */}
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocalHospital sx={{ fontSize: 13, color: C.text3 }} />
            <Typography variant="body2" sx={{ fontSize: 12, color: C.text2, maxWidth: 160 }} noWrap>
              {patient.facility}
            </Typography>
          </Box>
        </TableCell>

        {/* Risk level */}
        <TableCell>
          <RiskChip level={patient.assessment.level} />
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={`${patient.assessment.score} pts`}
              size="small"
              sx={{
                height: 18, fontSize: 10, fontWeight: 700,
                background: cfg.light, color: cfg.main, border: `1px solid ${cfg.border}`,
              }}
            />
          </Box>
        </TableCell>

        {/* Top risk reason */}
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, maxWidth: 200 }}>
          <Typography variant="caption" sx={{ fontSize: 11, color: C.text, lineHeight: 1.5, display: 'block' }} noWrap>
            {topFlag}
          </Typography>
          <VitalsStrip
            bp_s={patient.latestBpSystolic}
            bp_d={patient.latestBpDiastolic}
            hb={patient.latestHaemoglobin}
            malaria={patient.latestMalariaResult}
          />
        </TableCell>

        {/* Latest visit */}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 13, color: C.text3 }} />
            <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>
              {fmtDate(patient.latestVisitDate)}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ fontSize: 10, color: C.text3, display: 'block', mt: 0.2 }}>
            {patient.totalVisits} visit{patient.totalVisits !== 1 ? 's' : ''} total
          </Typography>
        </TableCell>
      </TableRow>

      {/* Expandable detail row */}
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <DetailPanel patient={patient} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function RiskAlerts() {
  const { alerts: liveAlerts, loading, error } = useAlerts()

  const alerts     = liveAlerts?.length > 0 ? liveAlerts : MOCK_ALERTS
  const usingMock  = !liveAlerts?.length

  const [search,     setSearch]     = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [orderBy,    setOrderBy]    = useState('score')
  const [orderDir,   setOrderDir]   = useState('desc')

  const highCount     = alerts.filter(a => a.assessment.level === 'high').length
  const moderateCount = alerts.filter(a => a.assessment.level === 'moderate').length

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...alerts]

    // Level filter
    if (levelFilter !== 'all') list = list.filter(a => a.assessment.level === levelFilter)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q)    ||
        a.village.toLowerCase().includes(q) ||
        a.facility.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      let va, vb
      if (orderBy === 'score')   { va = a.assessment.score;     vb = b.assessment.score }
      if (orderBy === 'name')    { va = a.name;                 vb = b.name }
      if (orderBy === 'visit')   { va = a.latestVisitDate ?? ''; vb = b.latestVisitDate ?? '' }
      if (orderBy === 'village') { va = a.village;              vb = b.village }
      if (va < vb) return orderDir === 'asc' ? -1 : 1
      if (va > vb) return orderDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [alerts, search, levelFilter, orderBy, orderDir])

  function handleSort(col) {
    if (orderBy === col) setOrderDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setOrderBy(col); setOrderDir('desc') }
  }

  const SortCell = ({ col, children, ...props }) => (
    <TableCell {...props} sx={{ fontWeight: 700, fontSize: 11, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', background: C.bg, whiteSpace: 'nowrap', py: 1.2, ...props.sx }}>
      <TableSortLabel
        active={orderBy === col}
        direction={orderBy === col ? orderDir : 'desc'}
        onClick={() => handleSort(col)}
        sx={{ '& .MuiTableSortLabel-icon': { fontSize: 14 } }}
      >
        {children}
      </TableSortLabel>
    </TableCell>
  )

  if (loading) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4 }}>
      <CircularProgress size={22} />
      <Typography color="text.secondary">Loading patient alerts from DHIS2...</Typography>
    </Box>
  )

  return (
    <Box sx={{ background: C.bg, minHeight: '100vh', p: { xs: 2, md: 3 } }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <ErrorOutline sx={{ color: C.high.main, fontSize: 22 }} />
            <Typography variant="h5" fontWeight={800} sx={{ color: C.text, letterSpacing: '-.02em' }}>
              Risk Alerts
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: C.text2 }}>
            Pregnant women requiring elevated monitoring or immediate action
          </Typography>
        </Box>
        {usingMock && (
          <Chip label="Demo data" size="small" sx={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 600 }} />
        )}
        {error && (
          <Alert severity="warning" sx={{ py: 0.5, fontSize: 12 }}>DHIS2 error — showing demo data</Alert>
        )}
      </Box>

      {/* ── Summary banner cards ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, background: C.card }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: C.text2, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Total alerts
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ color: C.text, lineHeight: 1, mt: 0.5 }}>
                {alerts.length}
              </Typography>
              <Typography variant="caption" sx={{ color: C.text2, fontSize: 11 }}>
                patients flagged for review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card elevation={0} sx={{ borderRadius: '14px', border: `1.5px solid ${C.high.border}`, background: C.high.light }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: C.high.dark, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                High risk
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ color: C.high.main, lineHeight: 1, mt: 0.5 }}>
                {highCount}
              </Typography>
              <Typography variant="caption" sx={{ color: C.high.dark, fontSize: 11 }}>
                immediate attention needed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card elevation={0} sx={{ borderRadius: '14px', border: `1.5px solid ${C.moderate.border}`, background: C.moderate.light }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: C.moderate.dark, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Moderate risk
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ color: C.moderate.main, lineHeight: 1, mt: 0.5 }}>
                {moderateCount}
              </Typography>
              <Typography variant="caption" sx={{ color: C.moderate.dark, fontSize: 11 }}>
                increased monitoring needed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Filters & search ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search by name, village or facility..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{
            flex: 1, minWidth: 220,
            '& .MuiOutlinedInput-root': { borderRadius: '10px', background: C.card, fontSize: 13 },
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: C.text3 }} /></InputAdornment>,
          }}
        />

        <ToggleButtonGroup
          value={levelFilter}
          exclusive
          onChange={(_, v) => v && setLevelFilter(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { borderRadius: '8px !important', fontSize: 11, fontWeight: 600, px: 1.5, py: 0.6, border: `1px solid ${C.border}`, textTransform: 'none' } }}
        >
          <ToggleButton value="all">All ({alerts.length})</ToggleButton>
          <ToggleButton value="high" sx={{ color: C.high.main, '&.Mui-selected': { background: C.high.light, color: C.high.main } }}>
            High ({highCount})
          </ToggleButton>
          <ToggleButton value="moderate" sx={{ color: C.moderate.main, '&.Mui-selected': { background: C.moderate.light, color: C.moderate.main } }}>
            Moderate ({moderateCount})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ background: C.bg, width: 36, p: 0 }} />
                <SortCell col="name">Patient</SortCell>
                <SortCell col="village">Village</SortCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', background: C.bg, display: { xs: 'none', md: 'table-cell' }, py: 1.2 }}>
                  Health facility
                </TableCell>
                <SortCell col="score">Risk level</SortCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', background: C.bg, display: { xs: 'none', lg: 'table-cell' }, py: 1.2 }}>
                  Risk reason
                </TableCell>
                <SortCell col="visit">Latest ANC visit</SortCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                    <PersonSearch sx={{ fontSize: 40, color: C.text3, mb: 1 }} />
                    <Typography color="text.secondary" variant="body2">
                      {search ? `No results for "${search}"` : 'No alerts match the current filter'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(patient => (
                  <AlertRow key={patient.teiUid} patient={patient} />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg }}>
          <Typography variant="caption" sx={{ color: C.text2, fontSize: 11 }}>
            Showing {filtered.length} of {alerts.length} alerts · click any row to expand details
          </Typography>
          <Typography variant="caption" sx={{ color: C.text3, fontSize: 10 }}>
            Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      </Paper>

    </Box>
  )
}