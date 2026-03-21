// src/pages/RecordVisit.jsx
import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataMutation } from '@dhis2/app-runtime'
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Checkbox,
  Chip, CircularProgress, Divider, FormControlLabel, FormGroup,
  Grid, InputAdornment, MenuItem, Snackbar, Switch, TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBack, Favorite, Bloodtype, MonitorWeight, CalendarMonth,
  BugReport, Medication, Notes, Warning, CheckCircle, ArrowForward,
  LocalHospital, Science,
} from '@mui/icons-material'
import { PROGRAM, PROGRAM_STAGE, DATA_ELEMENTS } from '../config/dhis2.js'
import { assessRisk, getRiskColor, getRiskLabel } from '../services/riskEngine.js'
import { MALARIA_RESULTS, DANGER_SIGN_OPTIONS } from '../config/dhis2.js'

const C = {
  high:{ main:'#dc2626',light:'#fef2f2',border:'#fecaca' },
  moderate:{ main:'#d97706',light:'#fffbeb',border:'#fde68a' },
  normal:{ main:'#16a34a',light:'#f0fdf4',border:'#bbf7d0' },
  text:'#0f172a', text2:'#64748b', bg:'#f8fafc', border:'#e2e8f0',
}

const today = () => new Date().toISOString().split('T')[0]

const INIT = {
  visitDate:today(), visitNumber:1, gestationalAge:'',
  bpSystolic:'', bpDiastolic:'', haemoglobin:'', weight:'',
  malariaTestDone:false, malariaTestResult:'Not done',
  ironSupplementation:false, folicAcid:false,
  dangerSigns:[], nurseNotes:'', nextVisitDate:'',
}

function validate(v) {
  const e={}
  if(!v.visitDate)                                      e.visitDate='Required'
  if(!v.bpSystolic||v.bpSystolic<60||v.bpSystolic>250) e.bpSystolic='Enter 60–250'
  if(!v.bpDiastolic||v.bpDiastolic<40||v.bpDiastolic>150) e.bpDiastolic='Enter 40–150'
  if(!v.haemoglobin||v.haemoglobin<3||v.haemoglobin>20) e.haemoglobin='Enter 3–20'
  if(!v.weight||v.weight<25||v.weight>200)              e.weight='Enter 25–200'
  if(!v.gestationalAge||v.gestationalAge<1||v.gestationalAge>42) e.gestationalAge='Enter 1–42'
  return e
}

const CREATE_EVENT = { resource:'events', type:'create', data:({payload})=>payload }

function SectionHeader({ icon:Icon, color, title, subtitle }) {
  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2.5 }}>
      <Box sx={{ width:38,height:38,borderRadius:'9px',background:`${color}18`,border:`1.5px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <Icon sx={{ color, fontSize:19 }} />
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600} lineHeight={1.2}>{title}</Typography>
        {subtitle&&<Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
  )
}

function BPChip({ s, d }) {
  if(!s||!d) return null
  let label='Normal', color='success'
  if(s>=160||d>=110){label='Severe hypertension';color='error'}
  else if(s>=140||d>=90){label='Hypertension';color='error'}
  else if(s>=130||d>=80){label='Elevated';color='warning'}
  return <Chip size="small" label={`${s}/${d} mmHg — ${label}`} color={color} variant="outlined" sx={{ mt:1, fontWeight:600, fontSize:11 }} />
}

function HbChip({ v }) {
  if(!v) return null
  const n=Number(v); let label='Normal', color='success'
  if(n<7){label='Severe anaemia';color='error'} else if(n<10){label='Moderate anaemia';color='warning'} else if(n<11){label='Mild anaemia';color='warning'}
  return <Chip size="small" label={`${v} g/dL — ${label}`} color={color} variant="outlined" sx={{ mt:1, fontWeight:600, fontSize:11 }} />
}

function RiskCard({ assessment }) {
  if(!assessment) return null
  const { level, score, flags } = assessment
  const cfg = C[level]
  return (
    <Box sx={{ mt:3, p:2.5, borderRadius:'12px', border:`1.5px solid ${cfg.border}`, background:cfg.light }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1.5 }}>
        <Box>
          <Typography variant="overline" sx={{ color:cfg.main, fontWeight:700, fontSize:10 }}>Risk assessment</Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color:cfg.main, lineHeight:1.1 }}>{getRiskLabel(level)}</Typography>
        </Box>
        <Chip label={`Score: ${score}`} color={getRiskColor(level)} size="small" sx={{ fontWeight:700 }} />
      </Box>
      {flags.length>0
        ? <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.8 }}>
            {flags.map(f=><Chip key={f} label={f} size="small" color={getRiskColor(level)} variant="outlined" icon={<Warning style={{fontSize:12}}/>} sx={{ fontSize:11 }}/>)}
          </Box>
        : <Typography variant="body2" color="success.dark">No risk factors detected. Continue routine ANC schedule.</Typography>
      }
    </Box>
  )
}

export default function RecordVisit() {
  const { teiUid } = useParams()
  const navigate   = useNavigate()
  const [vals, setVals] = useState(INIT)
  const [errs, setErrs] = useState({})
  const [assessment, setAssessment] = useState(null)
  const [showPayload, setShowPayload] = useState(false)
  const [saved, setSaved] = useState(false)
  const [snack, setSnack] = useState({ open:false, msg:'', sev:'success' })

  const [createEvent, { loading }] = useDataMutation(CREATE_EVENT)

  const liveRisk = useMemo(() => {
    if(!vals.bpSystolic&&!vals.haemoglobin) return null
    return assessRisk({},{bpSystolic:Number(vals.bpSystolic),bpDiastolic:Number(vals.bpDiastolic),latestHaemoglobin:Number(vals.haemoglobin),gestationalAge:Number(vals.gestationalAge),latestMalariaResult:vals.malariaTestResult,dangerSigns:vals.dangerSigns,isFirstVisit:vals.visitNumber===1})
  },[vals.bpSystolic,vals.bpDiastolic,vals.haemoglobin,vals.gestationalAge,vals.malariaTestResult,vals.dangerSigns])

  function ch(f,v) { setVals(p=>({...p,[f]:v})); if(errs[f]) setErrs(p=>({...p,[f]:undefined})) }
  function toggleDanger(s) { setVals(p=>({...p,dangerSigns:p.dangerSigns.includes(s)?p.dangerSigns.filter(x=>x!==s):[...p.dangerSigns,s]})) }

  async function handleSubmit() {
    const e=validate(vals); if(Object.keys(e).length){setErrs(e);return}
    try {
      const payload = {
        program:PROGRAM.id, programStage:PROGRAM_STAGE.id,
        orgUnit:'ORG_UNIT_UID', trackedEntityInstance:teiUid||'TEI_UID',
        enrollment:'ENROLLMENT_UID', eventDate:vals.visitDate, status:'COMPLETED',
        dataValues:[
          {dataElement:DATA_ELEMENTS.bpSystolic,   value:String(vals.bpSystolic)},
          {dataElement:DATA_ELEMENTS.bpDiastolic,  value:String(vals.bpDiastolic)},
          {dataElement:DATA_ELEMENTS.haemoglobin,  value:String(vals.haemoglobin)},
          {dataElement:DATA_ELEMENTS.weight,       value:String(vals.weight)},
          {dataElement:DATA_ELEMENTS.gestationalAge,value:String(vals.gestationalAge)},
          {dataElement:DATA_ELEMENTS.visitNumber,  value:String(vals.visitNumber)},
          {dataElement:DATA_ELEMENTS.malariaTestResult,value:vals.malariaTestResult},
          {dataElement:DATA_ELEMENTS.ironSupplementation,value:String(vals.ironSupplementation)},
          {dataElement:DATA_ELEMENTS.folicAcid,    value:String(vals.folicAcid)},
          {dataElement:DATA_ELEMENTS.nurseNotes,   value:vals.nurseNotes||''},
          {dataElement:DATA_ELEMENTS.dangerSigns,  value:vals.dangerSigns.join(', ')},
          {dataElement:DATA_ELEMENTS.nextVisitDate,value:vals.nextVisitDate||''},
        ].filter(dv=>dv.value!==''),
      }
      const result = await createEvent({ payload })
      const eventUid = result?.response?.importSummaries?.[0]?.reference
      const risk = assessRisk({},{totalVisits:vals.visitNumber,currentWeek:Number(vals.gestationalAge),latestBpSystolic:Number(vals.bpSystolic),latestBpDiastolic:Number(vals.bpDiastolic),latestHaemoglobin:Number(vals.haemoglobin),latestMalariaResult:vals.malariaTestResult,dangerSigns:vals.dangerSigns})
      setAssessment(risk)
      setSaved(true)
      setSnack({ open:true, msg:`Visit saved (Event: ${eventUid||'demo'})`, sev:'success' })
    } catch(err) {
      setSnack({ open:true, msg:`Save failed: ${err.message}`, sev:'error' })
    }
  }

  const payloadPreview = JSON.stringify({
    resource:'POST /api/events',
    eventDate:vals.visitDate, status:'COMPLETED',
    dataValues:[
      {dataElement:'DE_BP_SYSTOLIC_UID',value:vals.bpSystolic||''},
      {dataElement:'DE_BP_DIASTOLIC_UID',value:vals.bpDiastolic||''},
      {dataElement:'DE_HAEMOGLOBIN_UID',value:vals.haemoglobin||''},
      {dataElement:'DE_WEIGHT_UID',value:vals.weight||''},
      {dataElement:'DE_MALARIA_RESULT_UID',value:vals.malariaTestResult},
      {dataElement:'DE_IRON_SUPPL_UID',value:String(vals.ironSupplementation)},
      {dataElement:'DE_DANGER_SIGNS_UID',value:vals.dangerSigns.join(', ')},
    ]
  },null,2)

  return (
    <Box sx={{ background:C.bg, minHeight:'100vh', p:{ xs:2, md:3 } }}>
      <Box sx={{ maxWidth:720, mx:'auto' }}>
        <Button startIcon={<ArrowBack/>} onClick={()=>navigate(-1)} sx={{ mb:2, color:C.text2, textTransform:'none' }}>Back</Button>

        <Box sx={{ mb:3, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color:C.text }}>Record ANC visit</Typography>
            <Typography variant="body2" sx={{ color:C.text2, mt:0.3 }}>
              <LocalHospital sx={{ fontSize:13, mr:0.5, verticalAlign:'middle' }} />
              Patient {teiUid||'demo'} · Visit {vals.visitNumber}
            </Typography>
          </Box>
          {liveRisk && (
            <Chip label={`Live risk: ${getRiskLabel(liveRisk.level)}`} color={getRiskColor(liveRisk.level)} size="small" sx={{ fontWeight:600 }} />
          )}
        </Box>

        <Card elevation={0} variant="outlined" sx={{ borderRadius:3 }}>
          <CardContent sx={{ p:{ xs:2, sm:3 } }}>

            {/* Visit details */}
            <SectionHeader icon={CalendarMonth} color="#1565c0" title="Visit details" subtitle="Date and gestational information" />
            <Grid container spacing={2} sx={{ mb:3 }}>
              <Grid item xs={12} sm={4}><TextField label="Visit date" type="date" value={vals.visitDate} onChange={e=>ch('visitDate',e.target.value)} error={!!errs.visitDate} helperText={errs.visitDate} fullWidth required InputLabelProps={{ shrink:true }} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Visit number" type="number" value={vals.visitNumber} onChange={e=>ch('visitNumber',e.target.value)} fullWidth inputProps={{min:1,max:20}} InputProps={{ endAdornment:<InputAdornment position="end">th</InputAdornment> }} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Gestational age" type="number" value={vals.gestationalAge} onChange={e=>ch('gestationalAge',e.target.value)} error={!!errs.gestationalAge} helperText={errs.gestationalAge} fullWidth required inputProps={{min:1,max:42}} InputProps={{ endAdornment:<InputAdornment position="end">wks</InputAdornment> }} /></Grid>
            </Grid>
            <Divider sx={{ mb:3 }} />

            {/* Blood pressure */}
            <SectionHeader icon={Favorite} color="#c62828" title="Blood pressure" subtitle="Measure both arms; record the higher reading" />
            <Grid container spacing={2} sx={{ mb:3 }}>
              <Grid item xs={6}><TextField label="Systolic" type="number" value={vals.bpSystolic} onChange={e=>ch('bpSystolic',e.target.value)} error={!!errs.bpSystolic} helperText={errs.bpSystolic} fullWidth required inputProps={{min:60,max:250}} InputProps={{ endAdornment:<InputAdornment position="end">mmHg</InputAdornment> }} /></Grid>
              <Grid item xs={6}><TextField label="Diastolic" type="number" value={vals.bpDiastolic} onChange={e=>ch('bpDiastolic',e.target.value)} error={!!errs.bpDiastolic} helperText={errs.bpDiastolic} fullWidth required inputProps={{min:40,max:150}} InputProps={{ endAdornment:<InputAdornment position="end">mmHg</InputAdornment> }} /></Grid>
              <Grid item xs={12}><BPChip s={vals.bpSystolic} d={vals.bpDiastolic} /></Grid>
            </Grid>
            <Divider sx={{ mb:3 }} />

            {/* Lab results */}
            <SectionHeader icon={Bloodtype} color="#6a1b9a" title="Lab results" subtitle="Haemoglobin and weight" />
            <Grid container spacing={2} sx={{ mb:3 }}>
              <Grid item xs={6}>
                <TextField label="Haemoglobin" type="number" value={vals.haemoglobin} onChange={e=>ch('haemoglobin',e.target.value)} error={!!errs.haemoglobin} helperText={errs.haemoglobin} fullWidth required inputProps={{min:3,max:20,step:0.1}} InputProps={{ endAdornment:<InputAdornment position="end">g/dL</InputAdornment> }} />
                <HbChip v={vals.haemoglobin} />
              </Grid>
              <Grid item xs={6}><TextField label="Weight" type="number" value={vals.weight} onChange={e=>ch('weight',e.target.value)} error={!!errs.weight} helperText={errs.weight} fullWidth required inputProps={{min:25,max:200,step:0.1}} InputProps={{ startAdornment:<InputAdornment position="start"><MonitorWeight fontSize="small" color="action"/></InputAdornment>, endAdornment:<InputAdornment position="end">kg</InputAdornment> }} /></Grid>
            </Grid>
            <Divider sx={{ mb:3 }} />

            {/* Malaria */}
            <SectionHeader icon={BugReport} color="#2e7d32" title="Malaria test" subtitle="Rapid diagnostic test result" />
            <Grid container spacing={2} sx={{ mb:3 }}>
              <Grid item xs={12} sm={5}>
                <FormControlLabel control={<Switch checked={vals.malariaTestDone} onChange={e=>ch('malariaTestDone',e.target.checked)} color="success"/>} label={<Typography variant="body2">Test performed</Typography>} />
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField select label="Test result" value={vals.malariaTestResult} onChange={e=>ch('malariaTestResult',e.target.value)} disabled={!vals.malariaTestDone} fullWidth
                  InputProps={{ startAdornment:<InputAdornment position="start"><Science fontSize="small" color="action"/></InputAdornment> }}>
                  {MALARIA_RESULTS.map(r=><MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
            <Divider sx={{ mb:3 }} />

            {/* Supplementation */}
            <SectionHeader icon={Medication} color="#00695c" title="Supplementation given" subtitle="Tick all dispensed today" />
            <Box sx={{ display:'flex', gap:3, mb:3, flexWrap:'wrap' }}>
              <FormControlLabel control={<Checkbox checked={vals.ironSupplementation} onChange={e=>ch('ironSupplementation',e.target.checked)}/>} label={<Typography variant="body2">Iron supplementation</Typography>} />
              <FormControlLabel control={<Checkbox checked={vals.folicAcid} onChange={e=>ch('folicAcid',e.target.checked)}/>} label={<Typography variant="body2">Folic acid</Typography>} />
            </Box>
            <Divider sx={{ mb:3 }} />

            {/* Danger signs */}
            <SectionHeader icon={Warning} color="#e65100" title="Danger signs" subtitle="Select all observed or reported" />
            <FormGroup row sx={{ mb:vals.dangerSigns.length?1.5:3 }}>
              <Grid container>
                {DANGER_SIGN_OPTIONS.map(s=>(
                  <Grid item xs={12} sm={6} key={s}>
                    <FormControlLabel control={<Checkbox size="small" checked={vals.dangerSigns.includes(s)} onChange={()=>toggleDanger(s)} sx={{ '&.Mui-checked':{color:'error.main'} }}/>} label={<Typography variant="body2">{s}</Typography>} />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
            {vals.dangerSigns.length>0&&<Alert severity="error" sx={{ mb:3, borderRadius:2 }}><AlertTitle sx={{ fontWeight:600, fontSize:13 }}>{vals.dangerSigns.length} danger sign{vals.dangerSigns.length>1?'s':''} flagged</AlertTitle>Refer patient immediately.</Alert>}
            <Divider sx={{ mb:3 }} />

            {/* Nurse notes */}
            <SectionHeader icon={Notes} color="#37474f" title="Nurse notes" subtitle="Clinical observations and follow-up actions" />
            <TextField label="Notes" multiline rows={3} value={vals.nurseNotes} onChange={e=>ch('nurseNotes',e.target.value)} fullWidth placeholder="e.g. Patient reports mild swelling. Urine dipstick negative..." sx={{ mb:2 }} />
            <TextField label="Next visit date" type="date" value={vals.nextVisitDate} onChange={e=>ch('nextVisitDate',e.target.value)} InputLabelProps={{ shrink:true }} sx={{ mb:3 }} />

            {/* Risk result post-save */}
            {saved && <RiskCard assessment={assessment} />}

            {/* Payload preview */}
            <Box sx={{ mt:2, mb:1 }}>
              <Button size="small" variant="text" sx={{ fontSize:11, color:C.text2 }} onClick={()=>setShowPayload(p=>!p)}>
                {showPayload?'Hide':'Show'} DHIS2 API payload preview
              </Button>
              {showPayload && (
                <Box component="pre" sx={{ background:'#0f172a', color:'#e2e8f0', p:2, borderRadius:2, fontSize:11, overflow:'auto', lineHeight:1.6, fontFamily:'monospace', maxHeight:280, mt:1 }}>
                  {payloadPreview}
                </Box>
              )}
            </Box>

            <Divider sx={{ mb:3 }} />
            <Box sx={{ display:'flex', justifyContent:'flex-end' }}>
              <Button onClick={handleSubmit} variant="contained" disabled={loading||saved} size="large"
                endIcon={loading?<CircularProgress size={16} color="inherit"/>:saved?<CheckCircle/>:<ArrowForward/>}
                sx={{ background:saved?undefined:'linear-gradient(135deg,#1565c0,#0d47a1)', px:4, borderRadius:2, minWidth:180 }}>
                {loading?'Saving…':saved?'Visit saved':'Save ANC visit'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))} sx={{ borderRadius:2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}