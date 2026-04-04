// src/pages/Dashboard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box, Card, CardContent, Chip, CircularProgress,
    Grid, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography, LinearProgress,
} from '@mui/material'
import {
    PregnantWoman, Warning, CheckCircle, TrendingUp,
    FiberManualRecord, ArrowForward,
} from '@mui/icons-material'
import {
    PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from 'recharts'
import { useDashboardData } from '../hooks/useDashboardData.js'
import { getRiskLabel } from '../services/riskEngine.js'
import { RISK_COLORS } from '../config/dhis2.js'

const C = {
    text: '#0f172a', text2: '#64748b',
    bg: '#f8fafc', border: '#e2e8f0',
    blue: '#2563eb', indigo: '#6366f1',
}

function StatCard({ label, value, sub, icon: Icon, color, bg, border, trend }) {
    return (
        <Card sx={{ borderRadius: '14px', border: `1.5px solid ${border || C.border}`, background: bg || '#fff', height: '100%', position: 'relative', overflow: 'hidden', transition: 'transform .15s,box-shadow .15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,.08)' } }}>
            <Box sx={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: `${color}18` }} />
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: C.text2, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 10 }}>{label}</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: color || C.text, lineHeight: 1.1, mt: 0.5, fontSize: { xs: 26, sm: 32 } }}>{value}</Typography>
                        {sub && <Typography variant="caption" sx={{ color: C.text2, fontSize: 11, mt: 0.5, display: 'block' }}>{sub}</Typography>}
                    </Box>
                    <Box sx={{ width: 42, height: 42, borderRadius: '11px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon sx={{ color, fontSize: 21 }} />
                    </Box>
                </Box>
                {trend !== undefined && (
                    <Box sx={{ mt: 1.5 }}>
                        <LinearProgress variant="determinate" value={Math.min(trend, 100)} sx={{ height: 4, borderRadius: 2, backgroundColor: `${color}20`, '& .MuiLinearProgress-bar': { background: color, borderRadius: 2 } }} />
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10, mt: 0.5, display: 'block' }}>{trend}% of total</Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}

function Section({ title, sub, children, action }) {
    return (
        <Card sx={{ borderRadius: '14px', border: `1.5px solid ${C.border}`, height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: C.text, lineHeight: 1.2 }}>{title}</Typography>
                        {sub && <Typography variant="caption" sx={{ color: C.text2, fontSize: 11 }}>{sub}</Typography>}
                    </Box>
                    {action}
                </Box>
                {children}
            </CardContent>
        </Card>
    )
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
    if (percent < 0.05) return null
    const R = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * R)
    const y = cy + r * Math.sin(-midAngle * R)
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>
}

const barColor = r => r >= 80 ? '#16a34a' : r >= 50 ? '#d97706' : '#dc2626'

export default function Dashboard() {
    const navigate = useNavigate()
    const { stats, loading, error } = useDashboardData()

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Loading dashboard...</Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Failed to load dashboard: {error.message}</Typography>
            </Box>
        )
    }

    const s = stats || {
        total: 0, highRisk: 0, moderate: 0, normal: 0,
        totalVisits: 0, avgVisits: '0', completionRate: 0,
        riskDistribution: [], monthlyTrend: [], completionStages: [], alertPatients: [],
    }

    const highPct = s.total > 0 ? Math.round((s.highRisk / s.total) * 100) : 0
    const modPct  = s.total > 0 ? Math.round((s.moderate  / s.total) * 100) : 0
    const H = RISK_COLORS.high
    const M = RISK_COLORS.moderate
    const N = RISK_COLORS.normal

    return (
        <Box sx={{ background: C.bg, minHeight: '100vh', p: { xs: 2, md: 3 } }}>

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: C.text, letterSpacing: '-.02em' }}>Maternal Health Dashboard</Typography>
                    <Typography variant="body2" sx={{ color: C.text2, mt: 0.5 }}>
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Typography>
                </Box>
                {s.total === 0 && (
                    <Chip label="No patients yet — register your first patient" size="small" sx={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 600 }} />
                )}
            </Box>

            {/* KPI row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard label="Total pregnancies" value={s.total} sub={`${s.totalVisits} total ANC visits`} icon={PregnantWoman} color={C.indigo} border="#e0e7ff" />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard label="High risk" value={s.highRisk} sub="Require immediate attention" icon={Warning} color={H.main} bg={H.light} border={H.border} trend={highPct} />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard label="Moderate risk" value={s.moderate} sub="Increased monitoring" icon={TrendingUp} color={M.main} bg={M.light} border={M.border} trend={modPct} />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard label="ANC completion" value={`${s.completionRate}%`} sub={`Avg ${s.avgVisits} visits/patient`} icon={CheckCircle} color={N.main} bg={N.light} border={N.border} trend={s.completionRate} />
                </Grid>
            </Grid>

            {/* Row 2: Pie + Trend */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                    <Section title="Risk distribution" sub="Current pregnancy risk breakdown">
                        {s.total === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body2" color="text.secondary">No data yet</Typography>
                            </Box>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={s.riskDistribution} cx="50%" cy="50%" outerRadius={88} innerRadius={44} dataKey="value" labelLine={false} label={PieLabel} strokeWidth={2} stroke="#fff">
                                            {s.riskDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {[{ level: 'high', count: s.highRisk, pct: highPct }, { level: 'moderate', count: s.moderate, pct: modPct }, { level: 'normal', count: s.normal, pct: 100 - highPct - modPct }].map(({ level, count, pct }) => {
                                    const cfg = RISK_COLORS[level]
                                    return (
                                        <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, borderBottom: `1px solid ${C.border}`, '&:last-child': { borderBottom: 'none' } }}>
                                            <FiberManualRecord sx={{ fontSize: 10, color: cfg.main }} />
                                            <Typography variant="caption" sx={{ flex: 1, color: C.text2, fontSize: 12 }}>{getRiskLabel(level)}</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: cfg.main, fontSize: 12 }}>{count}</Typography>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 11, minWidth: 30, textAlign: 'right' }}>{pct}%</Typography>
                                        </Box>
                                    )
                                })}
                            </>
                        )}
                    </Section>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Section title="Monthly ANC visits" sub="Total and high-risk visits — last 12 months">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={s.monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.text2 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: C.text2 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                                <Legend iconSize={9} formatter={v => <span style={{ fontSize: 11, color: C.text2 }}>{v}</span>} />
                                <Line type="monotone" dataKey="visits" name="Total visits"     stroke={C.blue}    strokeWidth={2.5} dot={{ r: 3, fill: C.blue,    strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="high"   name="High-risk visits" stroke={H.main}    strokeWidth={2}   dot={{ r: 3, fill: H.main,    strokeWidth: 0 }} strokeDasharray="4 3" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Section>
                </Grid>
            </Grid>

            {/* Row 3: Completion + Alert table */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Section title="ANC completion by stage" sub="% meeting WHO visit targets">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={s.completionStages} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: C.text2 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.text2 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                <Tooltip formatter={v => [`${v}%`, 'Completion']} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                                <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={52}>
                                    {s.completionStages.map((e, i) => <Cell key={i} fill={barColor(e.rate)} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Section>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Section
                        title="High-risk patient alerts"
                        sub="Patients requiring immediate or elevated care"
                        action={
                            <Typography variant="caption" onClick={() => navigate('/alerts')}
                                sx={{ color: C.blue, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 0.3, '&:hover': { textDecoration: 'underline' } }}>
                                View all <ArrowForward sx={{ fontSize: 11 }} />
                            </Typography>
                        }
                    >
                        {s.alertPatients.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <CheckCircle sx={{ fontSize: 36, color: N.main, mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">No high-risk patients</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {['Patient', 'Risk', 'Score', 'Last visit'].map(h => (
                                                <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: C.text2, background: C.bg, textTransform: 'uppercase', letterSpacing: '.04em', py: 1, border: 'none' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {s.alertPatients.map(p => {
                                            const cfg = RISK_COLORS[p.assessment.level]
                                            return (
                                                <TableRow key={p.teiUid} onClick={() => navigate(`/patients/${p.teiUid}`)}
                                                    sx={{ cursor: 'pointer', borderLeft: `3px solid ${cfg.main}`, '&:hover': { background: cfg.light }, transition: 'background .1s' }}>
                                                    <TableCell sx={{ py: 1.2 }}>
                                                        <Typography variant="body2" fontWeight={700} fontSize={12}>{p.name}</Typography>
                                                        <Typography variant="caption" sx={{ color: C.text2, fontSize: 10 }}>Age {p.age ?? '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={getRiskLabel(p.assessment.level)} size="small"
                                                            sx={{ background: cfg.light, color: cfg.dark, border: `1.5px solid ${cfg.border}`, fontWeight: 700, fontSize: 10, height: 20 }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: cfg.main }}>{p.assessment.score} pts</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" sx={{ fontSize: 11, color: C.text2 }}>
                                                            {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Section>
                </Grid>
            </Grid>
        </Box>
    )
}