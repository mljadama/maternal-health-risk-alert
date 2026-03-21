// src/pages/PatientDetail.jsx
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, CardContent, Chip, Divider, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Avatar, Alert, AlertTitle, Paper,
} from '@mui/material'
import {
  ArrowBack, EventNote, LocationOn, Phone, LocalHospital,
  Favorite, Bloodtype, MonitorWeight, BugReport, Warning,
  CheckCircle, FiberManualRecord, Add,
} from '@mui/icons-material'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { assessRisk, getRiskLabel } from '../services/riskEngine.js'

const C = {
  high:{ main:'#dc2626', light:'#fef2f2', border:'#fecaca', dark:'#991b1b' },
  moderate:{ main:'#d97706', light:'#fffbeb', border:'#fde68a', dark:'#92400e' },
  normal:{ main:'#16a34a', light:'#f0fdf4', border:'#bbf7d0', dark:'#14532d' },
  text:'#0f172a', text2:'#64748b', bg:'#f8fafc', border:'#e2e8f0',
}

const MOCK_PATIENT = {
  teiUid:'t1', name:'Fatou Jallow', age:16, village:'Bakau', facility:'Serrekunda General Hospital',
  phone:'+220 7012345', parity:0, prevComp:'None', enrollmentDate:'2026-01-15',
  visits:[
    { id:'v1', date:'2026-01-15', ga:14, sys:132, dia:84, hb:11.2, weight:58.5, malaria:'Negative',   iron:true,  folic:true,  danger:[],                   notes:'First ANC visit. All routine tests done.', visitNum:1 },
    { id:'v2', date:'2026-02-10', ga:19, sys:138, dia:88, hb:10.8, weight:60.1, malaria:'Negative',   iron:true,  folic:true,  danger:['Severe headache'],   notes:'BP elevated. Headache reported. Referred to doctor.', visitNum:2 },
    { id:'v3', date:'2026-03-10', ga:26, sys:148, dia:96, hb:10.1, weight:62.4, malaria:'Negative',   iron:true,  folic:true,  danger:['Severe headache','Blurred vision'], notes:'BP dangerously elevated. Urgent referral to obstetrics.', visitNum:3 },
  ],
}

function RiskChip({ level }) {
  const cfg = C[level]??C.normal
  return (
    <Chip icon={<FiberManualRecord sx={{ fontSize:'8px !important', color:`${cfg.main} !important` }}/>} label={getRiskLabel(level)} size="small"
      sx={{ background:cfg.light, border:`1.5px solid ${cfg.border}`, color:cfg.dark, fontWeight:700, fontSize:11, height:24, '& .MuiChip-icon':{ ml:'6px' } }}/>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:1, py:0.8 }}>
      <Icon sx={{ fontSize:15, color:C.text2 }} />
      <Typography variant="caption" sx={{ color:C.text2, fontSize:12, minWidth:100 }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontSize:12, fontWeight:600, color:C.text }}>{value}</Typography>
    </Box>
  )
}

export default function PatientDetail() {
  const { teiUid } = useParams()
  const navigate   = useNavigate()
  const p          = MOCK_PATIENT

  const assessment = assessRisk(
    { age:p.age, parity:p.parity, previousComplications:p.prevComp },
    {
      totalVisits:p.visits.length,
      currentWeek:p.visits[p.visits.length-1]?.ga??0,
      firstVisitWeek:p.visits[0]?.ga,
      latestBpSystolic:p.visits[p.visits.length-1]?.sys,
      latestBpDiastolic:p.visits[p.visits.length-1]?.dia,
      latestHaemoglobin:p.visits[p.visits.length-1]?.hb,
      latestMalariaResult:p.visits[p.visits.length-1]?.malaria,
      dangerSigns:p.visits[p.visits.length-1]?.danger??[],
    }
  )

  const cfg = C[assessment.level]
  const chartData = p.visits.map(v=>({ date:new Date(v.date).toLocaleDateString('en-GB',{month:'short',day:'numeric'}), sys:v.sys, dia:v.dia, hb:v.hb, weight:v.weight, ga:v.ga }))

  return (
    <Box sx={{ background:C.bg, minHeight:'100vh', p:{ xs:2, md:3 } }}>

      {/* Back nav */}
      <Button startIcon={<ArrowBack />} onClick={()=>navigate('/patients')} sx={{ mb:2, color:C.text2, fontWeight:500, textTransform:'none' }}>Back to patients</Button>

      {/* Header card */}
      <Card sx={{ mb:2.5, borderRadius:'14px', border:`2px solid ${cfg.border}`, background:cfg.light }}>
        <CardContent sx={{ p:2.5 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:2 }}>
            <Box sx={{ display:'flex', gap:2, alignItems:'center' }}>
              <Avatar sx={{ width:52, height:52, fontSize:20, fontWeight:800, background:`${cfg.main}22`, color:cfg.main }}>
                {p.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color:C.text, lineHeight:1.1 }}>{p.name}</Typography>
                <Box sx={{ display:'flex', gap:1, mt:0.5, flexWrap:'wrap' }}>
                  <RiskChip level={assessment.level} />
                  <Chip label={`Score: ${assessment.score} pts`} size="small" sx={{ background:cfg.light, color:cfg.main, border:`1px solid ${cfg.border}`, fontWeight:700, fontSize:11, height:22 }} />
                  <Chip label={`${p.visits.length} visits`} size="small" sx={{ fontSize:11, height:22 }} />
                </Box>
              </Box>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={()=>navigate(`/visit/${p.teiUid}`)}
              sx={{ background:'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius:2, fontWeight:600 }}>
              Record visit
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Risk alert banner */}
      {assessment.level !== 'normal' && (
        <Alert severity={assessment.level==='high'?'error':'warning'} sx={{ mb:2.5, borderRadius:'12px' }}>
          <AlertTitle sx={{ fontWeight:700, fontSize:13 }}>{getRiskLabel(assessment.level)} — {assessment.flags.length} risk factor{assessment.flags.length>1?'s':''} identified</AlertTitle>
          <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, mt:0.5 }}>
            {assessment.flags.map((f,i)=>(
              <Chip key={i} label={f} size="small" color={assessment.level==='high'?'error':'warning'} variant="outlined" sx={{ fontSize:10 }} />
            ))}
          </Box>
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Left column: patient info */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}`, mb:2 }}>
            <CardContent sx={{ p:2.5 }}>
              <Typography variant="overline" sx={{ color:C.text2, fontWeight:700, fontSize:10 }}>Patient information</Typography>
              <Divider sx={{ my:1 }} />
              <InfoRow icon={LocationOn}    label="Village"     value={p.village} />
              <InfoRow icon={Phone}         label="Phone"       value={p.phone} />
              <InfoRow icon={LocalHospital} label="Facility"    value={p.facility} />
              <InfoRow icon={EventNote}     label="Enrolled"    value={new Date(p.enrollmentDate).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} />
            </CardContent>
          </Card>

          <Card sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}`, mb:2 }}>
            <CardContent sx={{ p:2.5 }}>
              <Typography variant="overline" sx={{ color:C.text2, fontWeight:700, fontSize:10 }}>Obstetric history</Typography>
              <Divider sx={{ my:1 }} />
              {[['Age',`${p.age} years`],['Parity',p.parity],['Previous complications',p.prevComp||'None'],['Total ANC visits',p.visits.length],['Current GA',`${p.visits[p.visits.length-1]?.ga??'—'} weeks`]].map(([k,v])=>(
                <Box key={k} sx={{ display:'flex', justifyContent:'space-between', py:0.7, borderBottom:`1px solid #f1f5f9`, '&:last-child':{ borderBottom:'none' } }}>
                  <Typography variant="caption" sx={{ fontSize:11, color:C.text2 }}>{k}</Typography>
                  <Typography variant="caption" sx={{ fontSize:11, fontWeight:600, color:C.text }}>{v}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {assessment.rules.length > 0 && (
            <Card sx={{ borderRadius:'14px', border:`1.5px solid ${cfg.border}`, background:cfg.light }}>
              <CardContent sx={{ p:2.5 }}>
                <Typography variant="overline" sx={{ color:cfg.dark, fontWeight:700, fontSize:10 }}>Recommendations</Typography>
                <Divider sx={{ my:1, borderColor:cfg.border }} />
                {assessment.rules.map((r,i)=>(
                  <Box key={i} sx={{ display:'flex', gap:1, mb:1, alignItems:'flex-start' }}>
                    <Box sx={{ width:18,height:18,borderRadius:'50%',background:cfg.light,border:`1.5px solid ${cfg.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,mt:0.1 }}>
                      <Typography sx={{ fontSize:9, fontWeight:800, color:cfg.main }}>{i+1}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontSize:11, color:C.text, lineHeight:1.5 }}>{r.recommendation}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right column: charts + visit history */}
        <Grid item xs={12} md={8}>
          {/* BP trend */}
          <Card sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}`, mb:2 }}>
            <CardContent sx={{ p:2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color:C.text, mb:1.5 }}>Blood pressure trend</Typography>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:C.text2 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60,180]} tick={{ fontSize:10, fill:C.text2 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:11 }} />
                  <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1.5} label={{ value:'140 threshold', fill:'#dc2626', fontSize:10 }} />
                  <ReferenceLine y={90}  stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
                  <Line type="monotone" dataKey="sys" name="Systolic"  stroke="#dc2626" strokeWidth={2.5} dot={{ r:4, fill:'#dc2626', strokeWidth:0 }} />
                  <Line type="monotone" dataKey="dia" name="Diastolic" stroke="#f59e0b" strokeWidth={2}   dot={{ r:4, fill:'#f59e0b', strokeWidth:0 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hb trend */}
          <Card sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}`, mb:2 }}>
            <CardContent sx={{ p:2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color:C.text, mb:1.5 }}>Haemoglobin trend</Typography>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:C.text2 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[5,15]} tick={{ fontSize:10, fill:C.text2 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:11 }} />
                  <ReferenceLine y={11} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} label={{ value:'11 g/dL', fill:'#f59e0b', fontSize:10 }} />
                  <Line type="monotone" dataKey="hb" name="Haemoglobin (g/dL)" stroke="#6366f1" strokeWidth={2.5} dot={{ r:4, fill:'#6366f1', strokeWidth:0 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Visit history table */}
          <Card sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}` }}>
            <CardContent sx={{ p:2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color:C.text, mb:1.5 }}>Visit history</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Visit','Date','GA (wks)','BP (mmHg)','Hb (g/dL)','Weight','Malaria','Danger signs','Notes'].map(h=>(
                        <TableCell key={h} sx={{ fontSize:10, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'.04em', background:C.bg, py:1, whiteSpace:'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...p.visits].reverse().map(v=>{
                      const bpBad = v.sys>=140||v.dia>=90
                      const hbBad = v.hb < 11
                      return (
                        <TableRow key={v.id} sx={{ '&:hover':{ background:C.bg } }}>
                          <TableCell sx={{ fontWeight:700, fontSize:12 }}>#{v.visitNum}</TableCell>
                          <TableCell sx={{ fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>
                            {new Date(v.date).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'2-digit' })}
                          </TableCell>
                          <TableCell sx={{ fontSize:12 }}>{v.ga}</TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontSize:12, fontWeight:bpBad?700:400, color:bpBad?C.high.main:C.text }}>
                              {v.sys}/{v.dia}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontSize:12, fontWeight:hbBad?700:400, color:hbBad?C.moderate.main:C.text }}>
                              {v.hb}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize:12, color:C.text2 }}>{v.weight} kg</TableCell>
                          <TableCell>
                            <Chip label={v.malaria.includes('Positive')?'Positive':'Negative'} size="small"
                              sx={{ fontSize:9, height:18, background:v.malaria.includes('Positive')?C.high.light:C.normal.light, color:v.malaria.includes('Positive')?C.high.main:C.normal.main }} />
                          </TableCell>
                          <TableCell>
                            {v.danger.length===0
                              ? <CheckCircle sx={{ fontSize:14, color:C.normal.main }} />
                              : <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.3 }}>
                                  {v.danger.map(d=><Chip key={d} label={d} size="small" sx={{ fontSize:9, height:16, background:C.high.light, color:C.high.main }} />)}
                                </Box>
                            }
                          </TableCell>
                          <TableCell sx={{ maxWidth:160 }}>
                            <Typography variant="caption" sx={{ fontSize:11, color:C.text2 }} title={v.notes}>{v.notes?.slice(0,50)}{v.notes?.length>50?'…':''}</Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}