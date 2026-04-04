// src/pages/PatientList.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box, Button, Card, Chip, CircularProgress, Alert,
    InputAdornment, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TableSortLabel,
    TextField, Typography, Avatar, Tooltip,
} from '@mui/material'
import {
    Search, PersonAdd, FiberManualRecord,
    LocationOn, LocalHospital,
} from '@mui/icons-material'
import { usePatients } from '../hooks/usePatients.js'
import { getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'

const C = {
    text: '#0f172a', text2: '#64748b',
    bg: '#f8fafc', border: '#e2e8f0',
}

function RiskChip({ level }) {
    const cfg = RISK_COLORS[level] ?? RISK_COLORS.normal
    return (
        <Chip
            icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: `${cfg.main} !important` }} />}
            label={getRiskLabel(level)}
            size="small"
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

export default function PatientList() {
    const navigate = useNavigate()
    const { patients, loading, error, refetch } = usePatients()

    const [search,     setSearch]     = useState('')
    const [riskFilter, setRiskFilter] = useState('all')
    const [sortCol,    setSortCol]    = useState('name')
    const [sortDir,    setSortDir]    = useState('asc')

    const filtered = useMemo(() => {
        let list = [...patients]

        if (riskFilter !== 'all') {
            list = list.filter(p => p.assessment.level === riskFilter)
        }

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.village.toLowerCase().includes(q) ||
                p.facility.toLowerCase().includes(q)
            )
        }

        list.sort((a, b) => {
            let va, vb
            if (sortCol === 'name')     { va = a.name;              vb = b.name }
            if (sortCol === 'village')  { va = a.village;            vb = b.village }
            if (sortCol === 'facility') { va = a.facility;           vb = b.facility }
            if (sortCol === 'ga')       { va = a.gestationalAge ?? 0; vb = b.gestationalAge ?? 0 }
            if (sortCol === 'visits')   { va = a.totalVisits;         vb = b.totalVisits }
            if (sortCol === 'risk')     { va = a.assessment.score;    vb = b.assessment.score }
            if (sortCol === 'last')     { va = a.lastVisitDate ?? '';  vb = b.lastVisitDate ?? '' }
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })

        return list
    }, [patients, search, riskFilter, sortCol, sortDir])

    function handleSort(col) {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortCol(col); setSortDir('asc') }
    }

    const SortCell = ({ col, label, ...props }) => (
        <TableCell {...props} sx={{
            fontWeight: 700, fontSize: 11, color: C.text2,
            textTransform: 'uppercase', letterSpacing: '.05em',
            background: C.bg, whiteSpace: 'nowrap', py: 1.2,
            ...props.sx
        }}>
            <TableSortLabel
                active={sortCol === col}
                direction={sortCol === col ? sortDir : 'asc'}
                onClick={() => handleSort(col)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    )

    const counts = {
        all:      patients.length,
        high:     patients.filter(p => p.assessment.level === 'high').length,
        moderate: patients.filter(p => p.assessment.level === 'moderate').length,
        normal:   patients.filter(p => p.assessment.level === 'normal').length,
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Loading patients...</Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>}>
                    Failed to load patients: {error.message}
                </Alert>
            </Box>
        )
    }

    return (
        <Box sx={{ background: C.bg, minHeight: '100vh', p: { xs: 2, md: 3 } }}>

            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: C.text, letterSpacing: '-.02em' }}>
                        Patients
                    </Typography>
                    <Typography variant="body2" sx={{ color: C.text2, mt: 0.5 }}>
                        {patients.length} registered · {counts.high} high risk · {counts.moderate} moderate
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => navigate('/register')}
                    sx={{ background: 'linear-gradient(135deg,#e91e8c,#c2185b)', borderRadius: 2, fontWeight: 600 }}
                >
                    Register patient
                </Button>
            </Box>

            {/* Risk filter chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {[
                    { key: 'all',      label: `All (${counts.all})`,           color: 'default' },
                    { key: 'high',     label: `High risk (${counts.high})`,     color: 'error'   },
                    { key: 'moderate', label: `Moderate (${counts.moderate})`,  color: 'warning' },
                    { key: 'normal',   label: `Normal (${counts.normal})`,      color: 'success' },
                ].map(({ key, label, color }) => (
                    <Chip
                        key={key}
                        label={label}
                        color={riskFilter === key ? color : 'default'}
                        variant={riskFilter === key ? 'filled' : 'outlined'}
                        onClick={() => setRiskFilter(key)}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                    />
                ))}
            </Box>

            {/* Search */}
            <TextField
                placeholder="Search name, village or facility..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px', background: '#fff', fontSize: 13 } }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search sx={{ fontSize: 18, color: C.text2 }} />
                        </InputAdornment>
                    ),
                }}
            />

            {/* Table */}
            <Paper elevation={0} sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <SortCell col="name"     label="Patient" />
                                <SortCell col="village"  label="Village" />
                                <SortCell col="facility" label="Facility" />
                                <SortCell col="ga"       label="GA (wks)" sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                                <SortCell col="visits"   label="Visits"   sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                                <SortCell col="risk"     label="Risk level" />
                                <SortCell col="last"     label="Last visit" sx={{ display: { xs: 'none', lg: 'table-cell' } }} />
                                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', background: C.bg, py: 1.2 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                        <Typography color="text.secondary" variant="body2">
                                            {patients.length === 0
                                                ? 'No patients registered yet. Register your first patient.'
                                                : `No patients match "${search}"`}
                                        </Typography>
                                        {patients.length === 0 && (
                                            <Button
                                                variant="contained"
                                                startIcon={<PersonAdd />}
                                                onClick={() => navigate('/register')}
                                                sx={{ mt: 2, background: 'linear-gradient(135deg,#e91e8c,#c2185b)' }}
                                            >
                                                Register first patient
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(p => {
                                const cfg      = RISK_COLORS[p.assessment.level]
                                const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                return (
                                    <TableRow
                                        key={p.teiUid}
                                        onClick={() => navigate(`/patients/${p.teiUid}`)}
                                        sx={{
                                            cursor: 'pointer',
                                            borderLeft: `3px solid ${cfg.main}`,
                                            '&:hover': { background: cfg.light },
                                            transition: 'background .1s',
                                        }}
                                    >
                                        {/* Name */}
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, background: `${cfg.main}22`, color: cfg.main }}>
                                                    {initials}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700} sx={{ color: C.text, fontSize: 13 }}>
                                                        {p.name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: C.text2, fontSize: 10 }}>
                                                        Age {p.age ?? '—'} · {p.phoneNumber}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>

                                        {/* Village */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <LocationOn sx={{ fontSize: 13, color: C.text2 }} />
                                                <Typography variant="body2" sx={{ fontSize: 12, color: C.text2 }}>
                                                    {p.village}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        {/* Facility */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <LocalHospital sx={{ fontSize: 13, color: C.text2 }} />
                                                <Typography variant="body2" sx={{ fontSize: 12, color: C.text, maxWidth: 160 }} noWrap>
                                                    {p.facility}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        {/* GA */}
                                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                            <Typography variant="body2" sx={{ fontSize: 12, color: C.text }}>
                                                {p.gestationalAge ? `${p.gestationalAge} wks` : '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Visits */}
                                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                            <Typography variant="body2" sx={{ fontSize: 12, color: C.text }}>
                                                {p.totalVisits}
                                            </Typography>
                                        </TableCell>

                                        {/* Risk */}
                                        <TableCell>
                                            <RiskChip level={p.assessment.level} />
                                        </TableCell>

                                        {/* Last visit */}
                                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                            <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>
                                                {p.lastVisitDate
                                                    ? new Date(p.lastVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                                                    : '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <Tooltip title="View patient">
                                                    <Chip
                                                        label="View"
                                                        size="small"
                                                        onClick={e => { e.stopPropagation(); navigate(`/patients/${p.teiUid}`) }}
                                                        sx={{ cursor: 'pointer', fontSize: 10, height: 22, background: '#eff6ff', color: '#1d4ed8' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Record visit">
                                                    <Chip
                                                        label="Visit"
                                                        size="small"
                                                        onClick={e => { e.stopPropagation(); navigate(`/visit/${p.teiUid}`) }}
                                                        sx={{ cursor: 'pointer', fontSize: 10, height: 22, background: cfg.light, color: cfg.main }}
                                                    />
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Footer */}
                <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid ${C.border}`, background: C.bg, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: C.text2, fontSize: 11 }}>
                        Showing {filtered.length} of {patients.length} patients
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10 }}>
                        Click any row to view full patient record
                    </Typography>
                </Box>
            </Paper>
        </Box>
    )
}