// src/pages/PatientDetail.jsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box, Button, Card, CardContent, Chip, CircularProgress,
    Divider, Grid, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography, Avatar, Alert, AlertTitle,
} from '@mui/material'
import {
    ArrowBack, EventNote, LocationOn, Phone,
    LocalHospital, CheckCircle, FiberManualRecord, Add,
} from '@mui/icons-material'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { usePatients } from '../hooks/usePatients.js'
import { useVisits } from '../hooks/useVisits.js'
import { assessRisk, getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'

const C = {
    text: '#0f172a', text2: '#64748b',
    bg: '#f8fafc', border: '#e2e8f0',
}

function InfoRow({ icon: Icon, label, value }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.8 }}>
            <Icon sx={{ fontSize: 15, color: C.text2 }} />
            <Typography variant="caption" sx={{ color: C.text2, fontSize: 12, minWidth: 100 }}>{label}</Typography>
            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: C.text }}>{value || '—'}</Typography>
        </Box>
    )
}

export default function PatientDetail() {
    const { teiUid } = useParams()
    const navigate   = useNavigate()

    const { patients, loading: pLoading } = usePatients()
    const { visits, chartData, loading: vLoading } = useVisits(teiUid)

    const loading = pLoading || vLoading
    const patient = patients.find(p => p.teiUid === teiUid)

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Loading patient...</Typography>
            </Box>
        )
    }

    if (!patient) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/patients')} sx={{ mb: 2, color: C.text2 }}>Back</Button>
                <Typography color="text.secondary">Patient not found.</Typography>
            </Box>
        )
    }

    const latestVisit = visits[visits.length - 1] ?? null

    const assessment = assessRisk(
        { age: patient.age, parity: patient.parity, previousComplications: patient.prevComp },
        {
            totalVisits:         visits.length,
            currentWeek:         latestVisit?.gestationalAge ?? 0,
            firstVisitWeek:      visits[0]?.gestationalAge,
            latestBpSystolic:    latestVisit?.bpSystolic,
            latestBpDiastolic:   latestVisit?.bpDiastolic,
            latestHaemoglobin:   latestVisit?.haemoglobin,
            latestMalariaResult: latestVisit?.malariaResult,
            dangerSigns:         latestVisit?.dangerSigns ?? [],
        }
    )

    const cfg = RISK_COLORS[assessment.level]
    const initials = patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    return (
        <Box sx={{ background: C.bg, minHeight: '100vh', p: { xs: 2, md: 3 } }}>

            <Button startIcon={<ArrowBack />} onClick={() => navigate('/patients')} sx={{ mb: 2, color: C.text2, textTransform: 'none' }}>
                Back to patients
            </Button>

            {/* Header card */}
            <Card sx={{ mb: 2.5, borderRadius: '14px', border: `2px solid ${cfg.border}`, background: cfg.light }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Avatar sx={{ width: 52, height: 52, fontSize: 20, fontWeight: 800, background: `${cfg.main}22`, color: cfg.main }}>
                                {initials}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight={800} sx={{ color: C.text, lineHeight: 1.1 }}>{patient.name}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                    <Chip
                                        icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: `${cfg.main} !important` }} />}
                                        label={getRiskLabel(assessment.level)} size="small"
                                        sx={{ background: cfg.light, border: `1.5px solid ${cfg.border}`, color: cfg.dark, fontWeight: 700, fontSize: 11, height: 24, '& .MuiChip-icon': { ml: '6px' } }}
                                    />
                                    <Chip label={`Score: ${assessment.score} pts`} size="small" sx={{ background: cfg.light, color: cfg.main, border: `1px solid ${cfg.border}`, fontWeight: 700, fontSize: 11, height: 22 }} />
                                    <Chip label={`${visits.length} visit${visits.length !== 1 ? 's' : ''}`} size="small" sx={{ fontSize: 11, height: 22 }} />
                                </Box>
                            </Box>
                        </Box>
                        <Button variant="contained" startIcon={<Add />} onClick={() => navigate(`/visit/${patient.teiUid}`)}
                            sx={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: 2, fontWeight: 600 }}>
                            Record visit
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Risk alert */}
            {assessment.level !== 'normal' && assessment.flags.length > 0 && (
                <Alert severity={assessment.level === 'high' ? 'error' : 'warning'} sx={{ mb: 2.5, borderRadius: '12px' }}>
                    <AlertTitle sx={{ fontWeight: 700, fontSize: 13 }}>
                        {getRiskLabel(assessment.level)} — {assessment.flags.length} risk factor{assessment.flags.length > 1 ? 's' : ''} identified
                    </AlertTitle>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {assessment.flags.map((f, i) => (
                            <Chip key={i} label={f} size="small" color={assessment.level === 'high' ? 'error' : 'warning'} variant="outlined" sx={{ fontSize: 10 }} />
                        ))}
                    </Box>
                </Alert>
            )}

            <Grid container spacing={2.5}>
                {/* Left column */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, mb: 2 }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="overline" sx={{ color: C.text2, fontWeight: 700, fontSize: 10 }}>Patient information</Typography>
                            <Divider sx={{ my: 1 }} />
                            <InfoRow icon={LocationOn}    label="Village"    value={patient.village} />
                            <InfoRow icon={Phone}         label="Phone"      value={patient.phoneNumber} />
                            <InfoRow icon={LocalHospital} label="Facility"   value={patient.facility} />
                            <InfoRow icon={EventNote}     label="Enrolled"   value={patient.enrollmentDate ? new Date(patient.enrollmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, mb: 2 }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="overline" sx={{ color: C.text2, fontWeight: 700, fontSize: 10 }}>Obstetric history</Typography>
                            <Divider sx={{ my: 1 }} />
                            {[
                                ['Age',                   `${patient.age ?? '—'} years`],
                                ['Parity',                patient.parity ?? '—'],
                                ['Previous complications', patient.prevComp || 'None'],
                                ['Total ANC visits',      visits.length],
                                ['Current GA',            latestVisit?.gestationalAge ? `${latestVisit.gestationalAge} weeks` : '—'],
                            ].map(([k, v]) => (
                                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #f1f5f9', '&:last-child': { borderBottom: 'none' } }}>
                                    <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>{k}</Typography>
                                    <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: C.text }}>{v}</Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>

                    {assessment.rules.length > 0 && (
                        <Card sx={{ borderRadius: '14px', border: `1.5px solid ${cfg.border}`, background: cfg.light }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="overline" sx={{ color: cfg.dark, fontWeight: 700, fontSize: 10 }}>Recommendations</Typography>
                                <Divider sx={{ my: 1, borderColor: cfg.border }} />
                                {assessment.rules.map((r, i) => (
                                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
                                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: cfg.light, border: `1.5px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
                                            <Typography sx={{ fontSize: 9, fontWeight: 800, color: cfg.main }}>{i + 1}</Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{r.recommendation}</Typography>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </Grid>

                {/* Right column */}
                <Grid item xs={12} md={8}>

                    {/* BP trend */}
                    {chartData.length > 0 && (
                        <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, mb: 2 }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: C.text, mb: 1.5 }}>Blood pressure trend</Typography>
                                <ResponsiveContainer width="100%" height={160}>
                                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.text2 }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[60, 180]} tick={{ fontSize: 10, fill: C.text2 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11 }} />
                                        <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1.5} />
                                        <ReferenceLine y={90}  stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
                                        <Line type="monotone" dataKey="sys" name="Systolic"  stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4, fill: '#dc2626', strokeWidth: 0 }} />
                                        <Line type="monotone" dataKey="dia" name="Diastolic" stroke="#f59e0b" strokeWidth={2}   dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Hb trend */}
                    {chartData.length > 0 && (
                        <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, mb: 2 }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: C.text, mb: 1.5 }}>Haemoglobin trend</Typography>
                                <ResponsiveContainer width="100%" height={130}>
                                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.text2 }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[5, 16]} tick={{ fontSize: 10, fill: C.text2 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11 }} />
                                        <ReferenceLine y={11} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
                                        <Line type="monotone" dataKey="hb" name="Haemoglobin (g/dL)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Visit history */}
                    <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}` }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: C.text, mb: 1.5 }}>Visit history</Typography>
                            {visits.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Typography variant="body2" color="text.secondary">No ANC visits recorded yet.</Typography>
                                    <Button variant="outlined" size="small" onClick={() => navigate(`/visit/${patient.teiUid}`)} sx={{ mt: 1 }}>
                                        Record first visit
                                    </Button>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                {['Visit', 'Date', 'GA', 'BP', 'Hb', 'Weight', 'Malaria', 'Danger signs'].map(h => (
                                                    <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '.04em', background: C.bg, py: 1 }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {[...visits].reverse().map(v => {
                                                const bpBad = v.bpSystolic >= 140 || v.bpDiastolic >= 90
                                                const hbBad = v.haemoglobin < 11
                                                return (
                                                    <TableRow key={v.eventUid} sx={{ '&:hover': { background: C.bg } }}>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>#{v.visitNumber}</TableCell>
                                                        <TableCell sx={{ fontSize: 12, color: C.text2, whiteSpace: 'nowrap' }}>
                                                            {v.eventDate ? new Date(v.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: 12 }}>{v.gestationalAge ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: bpBad ? 700 : 400, color: bpBad ? '#dc2626' : C.text }}>
                                                                {v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: hbBad ? 700 : 400, color: hbBad ? '#d97706' : C.text }}>
                                                                {v.haemoglobin ?? '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: 12, color: C.text2 }}>{v.weight ? `${v.weight} kg` : '—'}</TableCell>
                                                        <TableCell>
                                                            <Chip label={v.malariaResult?.includes('Positive') ? 'Positive' : 'Negative'} size="small"
                                                                sx={{ fontSize: 9, height: 18, background: v.malariaResult?.includes('Positive') ? '#fef2f2' : '#f0fdf4', color: v.malariaResult?.includes('Positive') ? '#dc2626' : '#16a34a' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            {v.dangerSigns.length === 0
                                                                ? <CheckCircle sx={{ fontSize: 14, color: '#16a34a' }} />
                                                                : <Typography variant="caption" sx={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>{v.dangerSigns.length} sign{v.dangerSigns.length > 1 ? 's' : ''}</Typography>
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    )
}