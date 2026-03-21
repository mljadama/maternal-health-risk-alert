// src/pages/PatientList.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, Chip, Divider, Grid, InputAdornment,
  MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, TextField, Typography,
  Avatar, Tooltip,
} from '@mui/material'
import {
  Search, PersonAdd, FiberManualRecord,
  LocationOn, LocalHospital, CalendarMonth, Visibility,
} from '@mui/icons-material'
import { assessRisk, getRiskLabel } from '../services/riskEngine.js'

const C = {
  high:{ main:'#dc2626', light:'#fef2f2', border:'#fecaca', dark:'#991b1b' },
  moderate:{ main:'#d97706', light:'#fffbeb', border:'#fde68a', dark:'#92400e' },
  normal:{ main:'#16a34a', light:'#f0fdf4', border:'#bbf7d0', dark:'#14532d' },
  text:'#0f172a', text2:'#64748b', bg:'#f8fafc', border:'#e2e8f0',
}

const MOCK_PATIENTS = [
  { teiUid:'t1', name:'Fatou Jallow',   age:16, village:'Bakau',     facility:'Serrekunda General Hospital',        phone:'+220 7012345', parity:0, visits:1, ga:26, lastVisit:'2026-03-10', sys:148, dia:96,  hb:10.1, malaria:'Negative',                danger:['Severe headache'],       prevComp:'None' },
  { teiUid:'t2', name:'Aminata Touray', age:38, village:'Brikama',   facility:'Brikama Health Centre',             phone:'+220 7654321', parity:5, visits:2, ga:32, lastVisit:'2026-03-08', sys:122, dia:80,  hb:6.2,  malaria:'Positive (P. falciparum)', danger:[],                        prevComp:'None' },
  { teiUid:'t3', name:'Mariama Ceesay', age:29, village:'Farafenni', facility:'Farafenni Hospital',                phone:'+220 7891234', parity:2, visits:1, ga:28, lastVisit:'2026-02-28', sys:118, dia:74,  hb:9.8,  malaria:'Negative',                danger:[],                        prevComp:'None' },
  { teiUid:'t4', name:'Isatou Jobe',    age:22, village:'Serekunda', facility:'Serrekunda General Hospital',       phone:'+220 7345678', parity:1, visits:2, ga:20, lastVisit:'2026-03-05', sys:141, dia:92,  hb:11.4, malaria:'Negative',                danger:[],                        prevComp:'Previous C-section' },
  { teiUid:'t5', name:'Binta Sanneh',   age:33, village:'Kanifing',  facility:'Edward Francis Small Teaching Hosp', phone:'+220 7901234', parity:3, visits:3, ga:34, lastVisit:'2026-03-12', sys:128, dia:84,  hb:7.8,  malaria:'Negative',                danger:[],                        prevComp:'None' },
  { teiUid:'t6', name:'Ndey Sowe',      age:26, village:'Banjul',    facility:'Royal Victoria Teaching Hospital',  phone:'+220 7234567', parity:0, visits:2, ga:18, lastVisit:'2026-03-01', sys:116, dia:72,  hb:9.2,  malaria:'Negative',                danger:[],                        prevComp:'None' },
  { teiUid:'t7', name:'Adama Baldeh',   age:17, village:'Soma',      facility:'Soma District Hospital',            phone:'+220 7567890', parity:0, visits:3, ga:22, lastVisit:'2026-03-14', sys:112, dia:70,  hb:10.8, malaria:'Negative',                danger:[],                        prevComp:'None' },
  { teiUid:'t8', name:'Kumba Darboe',   age:36, village:'Lamin',     facility:'Brikama Health Centre',             phone:'+220 7678901', parity:4, visits:1, ga:38, lastVisit:'2026-02-20', sys:136, dia:88,  hb:10.4, malaria:'Negative',                danger:['Swelling of face/hands'], prevComp:'None' },
  { teiUid:'t9', name:'Sainabou Jallow',age:25, village:'Bakau',     facility:'Serrekunda General Hospital',       phone:'+220 7789012', parity:1, visits:4, ga:36, lastVisit:'2026-03-13', sys:120, dia:78,  hb:12.1, malaria:'Negative',                danger:[],                        prevComp:'None' },
  { teiUid:'t10',name:'Fatimah Touray', age:30, village:'Banjul',    facility:'Royal Victoria Teaching Hospital',  phone:'+220 7890123', parity:2, visits:5, ga:40, lastVisit:'2026-03-15', sys:124, dia:80,  hb:11.8, malaria:'Negative',                danger:[],                        prevComp:'None' },
]

function buildAssessment(p) {
  return assessRisk(
    { age:p.age, parity:p.parity, previousComplications:p.prevComp },
    { totalVisits:p.visits, currentWeek:p.ga, firstVisitWeek:p.visits===1?p.ga:null, latestBpSystolic:p.sys, latestBpDiastolic:p.dia, latestHaemoglobin:p.hb, latestMalariaResult:p.malaria, dangerSigns:p.danger }
  )
}

function RiskChip({ level }) {
  const cfg = C[level] ?? C.normal
  return (
    <Chip
      icon={<FiberManualRecord sx={{ fontSize:'8px !important', color:`${cfg.main} !important` }} />}
      label={getRiskLabel(level)}
      size="small"
      sx={{ background:cfg.light, border:`1.5px solid ${cfg.border}`, color:cfg.dark, fontWeight:700, fontSize:11, height:24, '& .MuiChip-icon':{ ml:'6px' } }}
    />
  )
}

export default function PatientList() {
  const navigate = useNavigate()
  const [search,  setSearch]  = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortCol,    setSortCol]    = useState('name')
  const [sortDir,    setSortDir]    = useState('asc')

  const patients = useMemo(() =>
    MOCK_PATIENTS.map(p => ({ ...p, assessment: buildAssessment(p) }))
  , [])

  const filtered = useMemo(() => {
    let list = [...patients]
    if (riskFilter !== 'all') list = list.filter(p => p.assessment.level === riskFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q) ||
        p.facility.toLowerCase().includes(q)
      )
    }
    list.sort((a,b) => {
      let va, vb
      if (sortCol==='name')    { va=a.name;               vb=b.name }
      if (sortCol==='village') { va=a.village;             vb=b.village }
      if (sortCol==='ga')      { va=a.ga;                  vb=b.ga }
      if (sortCol==='visits')  { va=a.visits;              vb=b.visits }
      if (sortCol==='risk')    { va=a.assessment.score;    vb=b.assessment.score }
      if (sortCol==='last')    { va=a.lastVisit||'';       vb=b.lastVisit||'' }
      if (va < vb) return sortDir==='asc'?-1:1
      if (va > vb) return sortDir==='asc'?1:-1
      return 0
    })
    return list
  }, [patients, search, riskFilter, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol===col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const SortCell = ({ col, label, ...props }) => (
    <TableCell {...props} sx={{ fontWeight:700, fontSize:11, color:C.text2, textTransform:'uppercase', letterSpacing:'.05em', background:C.bg, whiteSpace:'nowrap', py:1.2, ...props.sx }}>
      <TableSortLabel active={sortCol===col} direction={sortCol===col?sortDir:'asc'} onClick={()=>handleSort(col)}>
        {label}
      </TableSortLabel>
    </TableCell>
  )

  const counts = { all:patients.length, high:patients.filter(p=>p.assessment.level==='high').length, moderate:patients.filter(p=>p.assessment.level==='moderate').length, normal:patients.filter(p=>p.assessment.level==='normal').length }

  return (
    <Box sx={{ background:C.bg, minHeight:'100vh', p:{ xs:2, md:3 } }}>

      {/* Header */}
      <Box sx={{ mb:3, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ color:C.text, letterSpacing:'-.02em' }}>Patients</Typography>
          <Typography variant="body2" sx={{ color:C.text2, mt:0.5 }}>All enrolled pregnant women · {patients.length} registered</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => navigate('/register')}
          sx={{ background:'linear-gradient(135deg,#e91e8c,#c2185b)', borderRadius:2, fontWeight:600 }}>
          Register patient
        </Button>
      </Box>

      {/* Summary chips */}
      <Box sx={{ display:'flex', gap:1, mb:2, flexWrap:'wrap' }}>
        {[{ key:'all', label:`All (${counts.all})`, color:'default' },
          { key:'high', label:`High risk (${counts.high})`, color:'error' },
          { key:'moderate', label:`Moderate (${counts.moderate})`, color:'warning' },
          { key:'normal', label:`Normal (${counts.normal})`, color:'success' }].map(({ key, label, color }) => (
          <Chip key={key} label={label} color={riskFilter===key?color:'default'} variant={riskFilter===key?'filled':'outlined'}
            onClick={() => setRiskFilter(key)} size="small" sx={{ fontWeight:600, fontSize:11, cursor:'pointer' }} />
        ))}
      </Box>

      {/* Search */}
      <TextField placeholder="Search name, village, or facility..." value={search} onChange={e=>setSearch(e.target.value)} size="small" fullWidth
        sx={{ mb:2, '& .MuiOutlinedInput-root':{ borderRadius:'10px', background:'#fff', fontSize:13 } }}
        InputProps={{ startAdornment:<InputAdornment position="start"><Search sx={{ fontSize:18, color:C.text2 }} /></InputAdornment> }}
      />

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius:'14px', border:`1.5px solid ${C.border}`, overflow:'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <SortCell col="name"    label="Patient" />
                <SortCell col="village" label="Village" />
                <TableCell sx={{ fontWeight:700, fontSize:11, color:C.text2, textTransform:'uppercase', letterSpacing:'.05em', background:C.bg, py:1.2, display:{ xs:'none', md:'table-cell' } }}>Facility</TableCell>
                <SortCell col="ga"      label="GA (wks)"   sx={{ display:{ xs:'none', sm:'table-cell' } }} />
                <SortCell col="visits"  label="Visits"     sx={{ display:{ xs:'none', sm:'table-cell' } }} />
                <SortCell col="risk"    label="Risk level" />
                <SortCell col="last"    label="Last visit" sx={{ display:{ xs:'none', lg:'table-cell' } }} />
                <TableCell sx={{ fontWeight:700, fontSize:11, color:C.text2, textTransform:'uppercase', letterSpacing:'.05em', background:C.bg, py:1.2 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign:'center', py:6 }}>
                    <Typography color="text.secondary" variant="body2">No patients match "{search}"</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.map(p => {
                const cfg = C[p.assessment.level]
                const initials = p.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
                return (
                  <TableRow key={p.teiUid} sx={{ cursor:'pointer', borderLeft:`3px solid ${cfg.main}`, '&:hover':{ background:cfg.light }, transition:'background .1s' }}
                    onClick={() => navigate(`/patients/${p.teiUid}`)}>
                    <TableCell sx={{ py:1.5 }}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1.2 }}>
                        <Avatar sx={{ width:32, height:32, fontSize:12, fontWeight:700, background:`${cfg.main}22`, color:cfg.main }}>{initials}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color:C.text, fontSize:13 }}>{p.name}</Typography>
                          <Typography variant="caption" sx={{ color:C.text2, fontSize:10 }}>Age {p.age} · {p.phone}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                        <LocationOn sx={{ fontSize:13, color:C.text2 }} />
                        <Typography variant="body2" sx={{ fontSize:12, color:C.text2 }}>{p.village}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display:{ xs:'none', md:'table-cell' } }}>
                      <Typography variant="body2" sx={{ fontSize:12, color:C.text2, maxWidth:160 }} noWrap>{p.facility}</Typography>
                    </TableCell>
                    <TableCell sx={{ display:{ xs:'none', sm:'table-cell' } }}>
                      <Typography variant="body2" sx={{ fontSize:12, color:C.text }}>{p.ga} wks</Typography>
                    </TableCell>
                    <TableCell sx={{ display:{ xs:'none', sm:'table-cell' } }}>
                      <Typography variant="body2" sx={{ fontSize:12, color:C.text }}>{p.visits}</Typography>
                    </TableCell>
                    <TableCell><RiskChip level={p.assessment.level} /></TableCell>
                    <TableCell sx={{ display:{ xs:'none', lg:'table-cell' } }}>
                      <Typography variant="caption" sx={{ fontSize:11, color:C.text2 }}>
                        {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'2-digit' }) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display:'flex', gap:0.5 }}>
                        <Tooltip title="View patient">
                          <Chip label="View" size="small" onClick={e=>{ e.stopPropagation(); navigate(`/patients/${p.teiUid}`) }}
                            sx={{ cursor:'pointer', fontSize:10, height:22, background:'#eff6ff', color:'#1d4ed8' }} />
                        </Tooltip>
                        <Tooltip title="Record visit">
                          <Chip label="Visit" size="small" onClick={e=>{ e.stopPropagation(); navigate(`/visit/${p.teiUid}`) }}
                            sx={{ cursor:'pointer', fontSize:10, height:22, background:cfg.light, color:cfg.main }} />
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ px:2, py:1.2, borderTop:`1px solid ${C.border}`, background:C.bg, display:'flex', justifyContent:'space-between' }}>
          <Typography variant="caption" sx={{ color:C.text2, fontSize:11 }}>Showing {filtered.length} of {patients.length} patients</Typography>
          <Typography variant="caption" sx={{ color:'#94a3b8', fontSize:10 }}>Click any row to view full patient record</Typography>
        </Box>
      </Paper>
    </Box>
  )
}