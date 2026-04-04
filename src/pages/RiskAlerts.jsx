// src/pages/RiskAlerts.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box, Card, CardContent, Chip, CircularProgress,
    Collapse, Grid, IconButton, InputAdornment, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TableSortLabel, TextField, ToggleButton,
    ToggleButtonGroup, Typography, Divider,
} from '@mui/material'
import {
    Search, Warning, ErrorOutline, KeyboardArrowDown,
    KeyboardArrowUp, LocationOn, LocalHospital, Phone,
    CalendarMonth, CheckCircle,
} from '@mui/icons-material'
import { useAlerts } from '../hooks/useAlerts.js'
import { getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'

const C = {
    text: '#0f172a', text2: '#64748b', text3: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc',
}

function RiskChip({ level }) {
    const cfg = RISK_COLORS[level] ?? RISK_COLORS.normal
    return (
        <Chip size="small" label={getRiskLabel(level)}
            sx={{ background: cfg.light, border: `1.5px solid ${cfg.border}`, color: cfg.dark, fontWeight: 700, fontSize: 11, height: 24 }} />
    )
}

function DetailPanel({ patient, assessment }) {
    return (
        <Box sx={{ p: 2.5, background: C.bg, borderTop: `1px solid ${C.border}` }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10 }}>Contact</Typography>
                    {[
                        [Phone,         patient.phone],
                        [LocationOn,    patient.village],
                        [LocalHospital, patient.facility],
                    ].map(([Icon, val], i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.8 }}>
                            <Icon sx={{ fontSize: 13, color: C.text3 }} />
                            <Typography variant="caption" sx={{ fontSize: 12, color: C.text2 }}>{val || '—'}</Typography>
                        </Box>
                    ))}
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10 }}>Clinical</Typography>
                    {[
                        ['GA',      patient.gestationalAge ? `${patient.gestationalAge} wks` : '—'],
                        ['BP',      patient.latestBpSystolic ? `${patient.latestBpSystolic}/${patient.latestBpDiastolic} mmHg` : '—'],
                        ['Hb',      patient.latestHaemoglobin ? `${patient.latestHaemoglobin} g/dL` : '—'],
                        ['Malaria', patient.latestMalariaResult || '—'],
                        ['Visits',  patient.totalVisits],
                        ['Parity',  patient.parity],
                    ].map(([k, v]) => (
                        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>{k}</Typography>
                            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: C.text }}>{v}</Typography>
                        </Box>
                    ))}
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10 }}>Risk flags</Typography>
                    <Box sx={{ mt: 1 }}>
                        {assessment.flags.length === 0 ? (
                            <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>No specific flags</Typography>
                        ) : assessment.flags.map((f, i) => {
                            const cfg = RISK_COLORS[assessment.level]
                            return (
                                <Chip key={i} label={f} size="small"
                                    icon={<Warning sx={{ fontSize: '11px !important' }} />}
                                    sx={{ background: cfg.light, border: `1px solid ${cfg.border}`, color: cfg.dark, fontSize: 10, mb: 0.5, mr: 0.5, height: 22 }} />
                            )
                        })}
                    </Box>
                </Grid>

                {patient.nurseNotes && (
                    <Grid item xs={12}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10 }}>
                            Nurse notes
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, fontSize: 12, color: C.text2, fontStyle: 'italic', lineHeight: 1.6 }}>
                            "{patient.nurseNotes}"
                        </Typography>
                    </Grid>
                )}

                {assessment.rules && assessment.rules.length > 0 && (
                    <Grid item xs={12}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: C.text2, textTransform: 'uppercase', fontSize: 10 }}>
                            Recommended actions
                        </Typography>
                        {assessment.rules.map((r, i) => {
                            const cfg = RISK_COLORS[assessment.level]
                            return (
                                <Box key={i} sx={{ display: 'flex', gap: 1, mt: 0.8, alignItems: 'flex-start' }}>
                                    <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: cfg.light, border: `1.5px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Typography sx={{ fontSize: 9, fontWeight: 800, color: cfg.main }}>{i + 1}</Typography>
                                    </Box>
                                    <Typography variant="caption" sx={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                                        {r.recommendation}
                                    </Typography>
                                </Box>
                            )
                        })}
                    </Grid>
                )}
            </Grid>
        </Box>
    )
}

function AlertRow({ patient }) {
    const [open, setOpen] = useState(false)
    const navigate        = useNavigate()
    const { assessment }  = patient
    const cfg             = RISK_COLORS[assessment.level]

    return (
        <>
            <TableRow
                onClick={() => setOpen(o => !o)}
                sx={{
                    cursor: 'pointer',
                    borderLeft: `4px solid ${cfg.main}`,
                    '&:hover': { background: cfg.light },
                    background: open ? cfg.light : 'inherit',
                    transition: 'background .12s',
                }}
            >
                <TableCell sx={{ width: 36, pl: 1, pr: 0 }}>
                    <IconButton size="small" sx={{ color: C.text3 }}>
                        {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                    </IconButton>
                </TableCell>

                {/* Patient */}
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
                        <Typography variant="body2" sx={{ fontSize: 12, color: C.text, maxWidth: 180 }} noWrap>
                            {patient.facility}
                        </Typography>
                    </Box>
                </TableCell>

                {/* Risk */}
                <TableCell>
                    <RiskChip level={assessment.level} />
                    <Box sx={{ mt: 0.3 }}>
                        <Chip label={`${assessment.score} pts`} size="small"
                            sx={{ height: 18, fontSize: 10, fontWeight: 700, background: cfg.light, color: cfg.main, border: `1px solid ${cfg.border}` }} />
                    </Box>
                </TableCell>

                {/* Last visit */}
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarMonth sx={{ fontSize: 13, color: C.text3 }} />
                        <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>
                            {patient.lastVisitDate
                                ? new Date(patient.lastVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                                : '—'}
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: 10, color: C.text3, display: 'block', mt: 0.2 }}>
                        {patient.totalVisits} visit{patient.totalVisits !== 1 ? 's' : ''}
                    </Typography>
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <DetailPanel patient={patient} assessment={assessment} />
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    )
}

export default function RiskAlerts() {
    const { alerts, loading, error } = useAlerts()

    const [search,   setSearch]   = useState('')
    const [filter,   setFilter]   = useState('all')
    const [orderBy,  setOrderBy]  = useState('score')
    const [orderDir, setOrderDir] = useState('desc')

    const highCount = alerts.filter(a => a.assessment.level === 'high').length
    const modCount  = alerts.filter(a => a.assessment.level === 'moderate').length

    const filtered = useMemo(() => {
        let list = [...alerts]
        if (filter !== 'all') list = list.filter(a => a.assessment.level === filter)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.village.toLowerCase().includes(q) ||
                a.facility.toLowerCase().includes(q)
            )
        }
        list.sort((a, b) => {
            let va, vb
            if (orderBy === 'score')    { va = a.assessment.score;   vb = b.assessment.score }
            if (orderBy === 'name')     { va = a.name;                vb = b.name }
            if (orderBy === 'visit')    { va = a.lastVisitDate || ''; vb = b.lastVisitDate || '' }
            if (orderBy === 'village')  { va = a.village;             vb = b.village }
            if (orderBy === 'facility') { va = a.facility;            vb = b.facility }
            if (va < vb) return orderDir === 'asc' ? -1 : 1
            if (va > vb) return orderDir === 'asc' ? 1 : -1
            return 0
        })
        return list
    }, [alerts, search, filter, orderBy, orderDir])

    function sort(col) {
        if (orderBy === col) setOrderDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setOrderBy(col); setOrderDir('desc') }
    }

    const SortCell = ({ col, children, ...props }) => (
        <TableCell {...props} sx={{
            fontWeight: 700, fontSize: 11, color: C.text2,
            textTransform: 'uppercase', letterSpacing: '.05em',
            background: C.bg, whiteSpace: 'nowrap', py: 1.2,
            ...props.sx,
        }}>
            <TableSortLabel
                active={orderBy === col}
                direction={orderBy === col ? orderDir : 'desc'}
                onClick={() => sort(col)}
            >
                {children}
            </TableSortLabel>
        </TableCell>
    )

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Loading risk alerts...</Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Failed to load alerts: {error.message}</Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ background: C.bg, minHeight: '100vh', p: { xs: 2, md: 3 } }}>

            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <ErrorOutline sx={{ color: RISK_COLORS.high.main, fontSize: 22 }} />
                        <Typography variant="h5" fontWeight={800} sx={{ color: C.text, letterSpacing: '-.02em' }}>
                            Risk Alerts
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: C.text2 }}>
                        Pregnant women requiring elevated monitoring or immediate action
                    </Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}` }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: C.text2, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
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
                    <Card sx={{ borderRadius: '14px', border: `1.5px solid ${RISK_COLORS.high.border}`, background: RISK_COLORS.high.light }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: RISK_COLORS.high.dark, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                                High risk
                            </Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ color: RISK_COLORS.high.main, lineHeight: 1, mt: 0.5 }}>
                                {highCount}
                            </Typography>
                            <Typography variant="caption" sx={{ color: RISK_COLORS.high.dark, fontSize: 11 }}>
                                immediate attention needed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4}>
                    <Card sx={{ borderRadius: '14px', border: `1.5px solid ${RISK_COLORS.moderate.border}`, background: RISK_COLORS.moderate.light }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: RISK_COLORS.moderate.dark, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                                Moderate risk
                            </Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ color: RISK_COLORS.moderate.main, lineHeight: 1, mt: 0.5 }}>
                                {modCount}
                            </Typography>
                            <Typography variant="caption" sx={{ color: RISK_COLORS.moderate.dark, fontSize: 11 }}>
                                increased monitoring needed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    placeholder="Search name, village or facility..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '10px', background: '#fff', fontSize: 13 } }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ fontSize: 18, color: C.text3 }} />
                            </InputAdornment>
                        ),
                    }}
                />
                <ToggleButtonGroup
                    value={filter} exclusive
                    onChange={(_, v) => v && setFilter(v)}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { borderRadius: '8px !important', fontSize: 11, fontWeight: 600, px: 1.5, py: 0.6, textTransform: 'none', border: `1px solid ${C.border}` } }}
                >
                    <ToggleButton value="all">All ({alerts.length})</ToggleButton>
                    <ToggleButton value="high"
                        sx={{ color: RISK_COLORS.high.main, '&.Mui-selected': { background: RISK_COLORS.high.light, color: RISK_COLORS.high.main } }}>
                        High ({highCount})
                    </ToggleButton>
                    <ToggleButton value="moderate"
                        sx={{ color: RISK_COLORS.moderate.main, '&.Mui-selected': { background: RISK_COLORS.moderate.light, color: RISK_COLORS.moderate.main } }}>
                        Moderate ({modCount})
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Table */}
            <Paper elevation={0} sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ background: C.bg, width: 36, p: 0 }} />
                                <SortCell col="name">Patient</SortCell>
                                <SortCell col="village">Village</SortCell>
                                <SortCell col="facility" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Facility</SortCell>
                                <SortCell col="score">Risk level</SortCell>
                                <SortCell col="visit">Latest visit</SortCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                        <CheckCircle sx={{ fontSize: 40, color: RISK_COLORS.normal.main, mb: 1 }} />
                                        <Typography color="text.secondary" variant="body2">
                                            {alerts.length === 0
                                                ? 'No high-risk patients detected'
                                                : `No results for "${search}"`}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(p => <AlertRow key={p.teiUid} patient={p} />)}
                        </TableBody>
                    </Table>
                </TableContainer>

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