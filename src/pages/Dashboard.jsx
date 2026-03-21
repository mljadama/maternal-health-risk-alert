// src/pages/Dashboard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, Chip, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, LinearProgress,
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

const C = {
  high:     { main:'#dc2626', light:'#fef2f2', border:'#fecaca', dark:'#991b1b' },
  moderate: { main:'#d97706', light:'#fffbeb', border:'#fde68a', dark:'#92400e' },
  normal:   { main:'#16a34a', light:'#f0fdf4', border:'#bbf7d0', dark:'#14532d' },
  blue:'#2563eb', indigo:'#6366f1',
  text:'#0f172a', text2:'#64748b', bg:'#f8fafc', border:'#e2e8f0',
}

// ── Mock data (replace with useDashboardData() when metadata is configured) ──
const MOCK = {
  total:142, highRisk:28, moderate:41, normal:73,
  totalVisits:387, avgVisits:'2.7', completionRate:68,
  pie:[
    { name:'High risk', value:28, color:'#dc2626' },
    { name:'Moderate',  value:41, color:'#d97706' },
    { name:'Normal',    value:73, color:'#16a34a' },
  ],
  trend:[
    {month:'Apr',visits:24,high:5},{month:'May',visits:29,high:7},{month:'Jun',visits:22,high:4},
    {month:'Jul',visits:31,high:8},{month:'Aug',visits:27,high:6},{month:'Sep',visits:35,high:9},
    {month:'Oct',visits:38,high:10},{month:'Nov',visits:33,high:7},{month:'Dec',visits:28,high:6},
    {month:'Jan',visits:41,high:11},{month:'Feb',visits:36,high:8},{month:'Mar',visits:43,high:12},
  ],
  completion:[
    { stage:'< 13 wks',  rate:82 },
    { stage:'13–26 wks', rate:71 },
    { stage:'27–36 wks', rate:58 },
    { stage:'37+ wks',   rate:44 },
  ],
  alerts:[
    { teiUid:'t1', name:'Fatou Jallow',   age:16, village:'Bakau',     totalVisits:1, lastVisit:'2026-03-10', assessment:{ level:'high',     score:95, flags:['Adolescent pregnancy — age 16','Hypertension 148/96 mmHg'] } },
    { teiUid:'t2', name:'Aminata Touray', age:38, village:'Brikama',   totalVisits:2, lastVisit:'2026-03-08', assessment:{ level:'high',     score:85, flags:['Severe anaemia — Hb 6.2 g/dL','Active malaria'] } },
    { teiUid:'t3', name:'Mariama Ceesay', age:29, village:'Farafenni', totalVisits:1, lastVisit:'2026-02-28', assessment:{ level:'high',     score:50, flags:['Late ANC booking — week 28'] } },
    { teiUid:'t4', name:'Isatou Jobe',    age:22, village:'Serekunda', totalVisits:2, lastVisit:'2026-03-05', assessment:{ level:'moderate', score:35, flags:['Hypertension 141/92 mmHg'] } },
    { teiUid:'t5', name:'Binta Sanneh',   age:33, village:'Kanifing',  totalVisits:3, lastVisit:'2026-03-12', assessment:{ level:'moderate', score:30, flags:['Moderate anaemia — Hb 7.8 g/dL'] } },
  ],
}

function StatCard({ label, value, sub, icon: Icon, color, bg, border, trend }) {
  return (
    <Card sx={{ borderRadius:'14px', border:`1.5px solid ${border||C.border}`, background:bg||'#fff', height:'100%', position:'relative', overflow:'hidden', transition:'transform .15s,box-shadow .15s', '&:hover':{ transform:'translateY(-2px)', boxShadow:'0 8px 24px rgba(0,0,0,.08)' } }}>
      <Box sx={{ position:'absolute', top:-20, right:-20, width:90, height:90, borderRadius:'50%', background:`${color}18` }} />
      <CardContent sx={{ p:2.5, '&:last-child':{ pb:2.5 } }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ color:C.text2, fontWeight:700, letterSpacing:'.04em', textTransform:'uppercase', fontSize:10 }}>{label}</Typography>
            <Typography variant="h3" sx={{ fontWeight:800, color:color||C.text, lineHeight:1.1, mt:0.5, fontSize:{ xs:26, sm:32 } }}>{value}</Typography>
            {sub && <Typography variant="caption" sx={{ color:C.text2, fontSize:11, mt:0.5, display:'block' }}>{sub}</Typography>}
          </Box>
          <Box sx={{ width:42, height:42, borderRadius:'11px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon sx={{ color, fontSize:21 }} />
          </Box>
        </Box>
        {trend !== undefined && (
          <Box sx={{ mt:1.5 }}>
            <LinearProgress variant="determinate" value={Math.min(trend,100)} sx={{ height:4, borderRadius:2, backgroundColor:`${color}20`, '& .MuiLinearProgress-bar':{ background:color, borderRadius:2 } }} />
            <Typography variant="caption" sx={{ color:'#94a3b8', fontSize:10, mt:0.5, display:'block' }}>{trend}% of total</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

function Section({ title, sub, children, action }) {
  return (
    <Card sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}`, height:'100%' }}>
      <CardContent sx={{ p:2.5, '&:last-child':{ pb:2.5 } }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color:C.text, lineHeight:1.2 }}>{title}</Typography>
            {sub && <Typography variant="caption" sx={{ color:C.text2, fontSize:11 }}>{sub}</Typography>}
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
  const R = Math.PI/180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * R)
  const y = cy + r * Math.sin(-midAngle * R)
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>
}

const barColor = r => r >= 80 ? C.normal.main : r >= 50 ? C.moderate.main : C.high.main

export default function Dashboard() {
  const navigate = useNavigate()
  const s = MOCK
  const highPct = Math.round((s.highRisk / s.total) * 100)
  const modPct  = Math.round((s.moderate  / s.total) * 100)

  return (
    <Box sx={{ background:C.bg, minHeight:'100vh', p:{ xs:2, md:3 } }}>

      {/* Header */}
      <Box sx={{ mb:3, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ color:C.text, letterSpacing:'-.02em' }}>Maternal Health Dashboard</Typography>
          <Typography variant="body2" sx={{ color:C.text2, mt:0.5 }}>
            Antenatal care overview · {new Date().toLocaleDateString('en-GB',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </Typography>
        </Box>
        <Chip label="Demo data" size="small" sx={{ background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', fontSize:11, fontWeight:600 }} />
      </Box>

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb:3 }}>
        <Grid item xs={6} sm={6} md={3}><StatCard label="Total pregnancies"  value={s.total}              sub={`${s.totalVisits} total ANC visits`}    icon={PregnantWoman} color={C.indigo}           border="#e0e7ff" /></Grid>
        <Grid item xs={6} sm={6} md={3}><StatCard label="High risk"          value={s.highRisk}           sub="Require immediate attention"            icon={Warning}       color={C.high.main}     bg={C.high.light}     border={C.high.border}     trend={highPct} /></Grid>
        <Grid item xs={6} sm={6} md={3}><StatCard label="Moderate risk"      value={s.moderate}           sub="Increased monitoring needed"            icon={TrendingUp}    color={C.moderate.main} bg={C.moderate.light} border={C.moderate.border} trend={modPct}  /></Grid>
        <Grid item xs={6} sm={6} md={3}><StatCard label="ANC completion"     value={`${s.completionRate}%`} sub={`Avg ${s.avgVisits} visits/patient`}  icon={CheckCircle}   color={C.normal.main}   bg={C.normal.light}   border={C.normal.border}   trend={s.completionRate} /></Grid>
      </Grid>

      {/* Row 2: Pie + Trend */}
      <Grid container spacing={2} sx={{ mb:2 }}>
        <Grid item xs={12} md={4}>
          <Section title="Risk distribution" sub="Current pregnancy risk breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={s.pie} cx="50%" cy="50%" outerRadius={88} innerRadius={44} dataKey="value" labelLine={false} label={PieLabel} strokeWidth={2} stroke="#fff">
                  {s.pie.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
            {[{ level:'high', count:s.highRisk, pct:highPct }, { level:'moderate', count:s.moderate, pct:modPct }, { level:'normal', count:s.normal, pct:100-highPct-modPct }].map(({ level, count, pct }) => {
              const cfg = C[level]
              return (
                <Box key={level} sx={{ display:'flex', alignItems:'center', gap:1, py:0.6, borderBottom:`1px solid ${C.border}`, '&:last-child':{ borderBottom:'none' } }}>
                  <FiberManualRecord sx={{ fontSize:10, color:cfg.main }} />
                  <Typography variant="caption" sx={{ flex:1, color:C.text2, fontSize:12 }}>{level==='high'?'High risk':level==='moderate'?'Moderate':'Normal'}</Typography>
                  <Typography variant="caption" sx={{ fontWeight:700, color:cfg.main, fontSize:12 }}>{count}</Typography>
                  <Typography variant="caption" sx={{ color:'#94a3b8', fontSize:11, minWidth:30, textAlign:'right' }}>{pct}%</Typography>
                </Box>
              )
            })}
          </Section>
        </Grid>
        <Grid item xs={12} md={8}>
          <Section title="Monthly ANC visits" sub="Total and high-risk visits — last 12 months">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={s.trend} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:C.text2 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.text2 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
                <Legend iconSize={9} formatter={v => <span style={{ fontSize:11, color:C.text2 }}>{v}</span>} />
                <Line type="monotone" dataKey="visits" name="Total visits"      stroke={C.blue}       strokeWidth={2.5} dot={{ r:3, fill:C.blue,       strokeWidth:0 }} activeDot={{ r:5 }} />
                <Line type="monotone" dataKey="high"   name="High-risk visits"  stroke={C.high.main}  strokeWidth={2}   dot={{ r:3, fill:C.high.main,  strokeWidth:0 }} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        </Grid>
      </Grid>

      {/* Row 3: Completion bar + Alert table */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Section title="ANC completion rate by stage" sub="% meeting WHO visit targets">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={s.completion} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize:11, fill:C.text2 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize:11, fill:C.text2 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                <Tooltip formatter={(v)=>[`${v}%`,'Completion']} contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
                <Bar dataKey="rate" radius={[6,6,0,0]} maxBarSize={52}>
                  {s.completion.map((e,i) => <Cell key={i} fill={barColor(e.rate)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Box sx={{ display:'flex', gap:2, mt:1, flexWrap:'wrap' }}>
              {[{ color:C.normal.main, label:'≥80% on track' },{ color:C.moderate.main, label:'50–79%' },{ color:C.high.main, label:'<50% critical' }].map(({ color, label }) => (
                <Box key={label} sx={{ display:'flex', alignItems:'center', gap:0.6 }}>
                  <Box sx={{ width:8, height:8, borderRadius:1, background:color }} />
                  <Typography variant="caption" sx={{ color:C.text2, fontSize:10 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Section>
        </Grid>

        <Grid item xs={12} md={7}>
          <Section
            title="High-risk patient alerts"
            sub="Patients requiring immediate or elevated care"
            action={
              <Box sx={{ display:'flex', gap:1, alignItems:'center' }}>
                <Chip label={`${s.alerts.length} patients`} size="small" sx={{ background:C.high.light, color:C.high.main, border:`1px solid ${C.high.border}`, fontWeight:600, fontSize:11 }} />
                <Typography variant="caption" onClick={() => navigate('/alerts')} sx={{ color:C.blue, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:0.3, '&:hover':{ textDecoration:'underline' } }}>
                  View all <ArrowForward sx={{ fontSize:11 }} />
                </Typography>
              </Box>
            }
          >
            <TableContainer sx={{ maxHeight:300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Patient','Risk','Top risk factor','Last visit'].map(h => (
                      <TableCell key={h} sx={{ fontSize:10, fontWeight:700, color:C.text2, background:C.bg, textTransform:'uppercase', letterSpacing:'.04em', py:1, border:'none' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {s.alerts.map(p => {
                    const cfg = C[p.assessment.level]
                    return (
                      <TableRow key={p.teiUid} onClick={() => navigate(`/patients/${p.teiUid}`)}
                        sx={{ cursor:'pointer', borderLeft:`3px solid ${cfg.main}`, '&:hover':{ background:cfg.light }, transition:'background .1s' }}>
                        <TableCell sx={{ py:1.2 }}>
                          <Typography variant="body2" fontWeight={700} fontSize={12}>{p.name}</Typography>
                          <Typography variant="caption" sx={{ color:C.text2, fontSize:10 }}>Age {p.age}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={p.assessment.level==='high'?'High':'Moderate'} size="small"
                            sx={{ background:cfg.light, color:cfg.dark, border:`1.5px solid ${cfg.border}`, fontWeight:700, fontSize:10, height:20 }} />
                        </TableCell>
                        <TableCell sx={{ maxWidth:160 }}>
                          <Typography variant="caption" sx={{ fontSize:11, color:C.text2 }} noWrap>{p.assessment.flags[0]}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontSize:11, color:C.text2 }}>
                            {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('en-GB',{ day:'numeric', month:'short' }) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Section>
        </Grid>
      </Grid>
    </Box>
  )
}