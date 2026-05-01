$ErrorActionPreference = "Stop"
$server = 'http://localhost:8080'
$creds = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:district'))
$headers = @{ Authorization = "Basic $creds"; "Content-Type" = "application/json" }

try{
  $config = Invoke-RestMethod -Uri "$server/api/dataStore/maternal_health_risk_alert/config" -Headers $headers -Method Get -ErrorAction Stop
} catch {
  $err = $_.Exception.Message
  Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$null; eventId=$null; error="GET config failed: $err" })
  exit 0
}

# extract ids
$programId = $null; $programStageId = $null; $teTypeId = $null
if($config.program){ $programId = $config.program.id }
if($config.programStage){ $programStageId = $config.programStage.id }
if($config.trackedEntityType){ $teTypeId = $config.trackedEntityType.id }

$attributeIds = @()
if($config.attributes){ foreach($a in $config.attributes){ if($a.id){ $attributeIds += $a.id } } }
$dataElementIds = @()
if($config.dataElements){ foreach($d in $config.dataElements){ if($d.id){ $dataElementIds += $d.id } } }

if(-not $programId -or -not $programStageId -or -not $teTypeId){
  Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$null; eventId=$null; error='Missing program/programStage/trackedEntityType in config' })
  exit 0
}

# pick an org unit from /api/me
try{
  $me = Invoke-RestMethod -Uri "$server/api/me?fields=teiSearchOrganisationUnits[id],dataViewOrganisationUnits[id],organisationUnits[id]" -Headers $headers -Method Get -ErrorAction Stop
} catch {
  Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$null; eventId=$null; error="GET /api/me failed: $($_.Exception.Message)" })
  exit 0
}
$ou = $me.teiSearchOrganisationUnits | Select-Object -First 1
if(-not $ou){ $ou = $me.dataViewOrganisationUnits | Select-Object -First 1 }
if(-not $ou){ $ou = $me.organisationUnits | Select-Object -First 1 }
if(-not $ou){ Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$null; eventId=$null; error='No organisation unit available from /api/me' }); exit 0 }
$ouId = $ou.id

# prepare attributes with unique values
$attrArr = @(); $i=0; $uniqueSuffix = (Get-Random -Maximum 999999)
foreach($aid in $attributeIds){ $i++; $val = "val_${uniqueSuffix}_$i"; $attrArr += @{ attribute = $aid; value = $val } }
if($attrArr.Count -eq 0){ # create a dummy attribute to allow TEI creation if none defined
  $attrArr += @{ attribute = 'NONE'; value = "val_${uniqueSuffix}_1" }
}

# create TEI + enrollment
$teiPayload = @{ trackedEntities = @(
  @{ trackedEntityType = $teTypeId; orgUnit = $ouId; attributes = $attrArr; enrollments = @(@{ orgUnit = $ouId; program = $programId; enrollmentDate = (Get-Date -Format yyyy-MM-dd); incidentDate = (Get-Date -Format yyyy-MM-dd); status = 'ACTIVE' }) }
) }
$teiJson = $teiPayload | ConvertTo-Json -Depth 10
try{
  $resp = Invoke-RestMethod -Uri "$server/api/tracker?async=false" -Headers $headers -Method Post -Body $teiJson -ErrorAction Stop
} catch {
  $err = $_.Exception.Message
  Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$null; eventId=$null; error="POST tracker (tei) failed: $err" })
  exit 0
}
# parse TEI id
$teiId = $null
if($resp.response -and $resp.response.importSummaries){ $teiId = $resp.response.importSummaries[0].reference }
elseif($resp.importSummaries){ $teiId = $resp.importSummaries[0].reference }
elseif($resp.reference){ $teiId = $resp.reference }

if(-not $teiId){
  # try search by first attribute value
  $firstAttr = $attributeIds | Select-Object -First 1
  $firstVal = $attrArr[0].value
  if($firstAttr -and $firstVal){
    try{
      $search = Invoke-RestMethod -Uri "$server/api/trackedEntityInstances?filter=$firstAttr:EQ:$firstVal&ou=$ouId&paging=false" -Headers $headers -Method Get -ErrorAction Stop
      if($search.trackedEntityInstances -and $search.trackedEntityInstances.Count -gt 0){ $teiId = $search.trackedEntityInstances[0].trackedEntityInstance }
    } catch { }
  }
}

if(-not $teiId){ Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$null; eventId=$null; error='Could not determine created TEI id' }); exit 0 }

# create one completed event for that TEI
$event = @{ program = $programId; programStage = $programStageId; orgUnit = $ouId; trackedEntityInstance = $teiId; eventDate = (Get-Date -Format yyyy-MM-dd); status = 'COMPLETED'; dataValues = @() }
if($dataElementIds.Count -gt 0){ $event.dataValues += @{ dataElement = $dataElementIds[0]; value = '1' } }
$eventPayload = @{ events = @($event) }
$eventJson = $eventPayload | ConvertTo-Json -Depth 10
try{
  $resp2 = Invoke-RestMethod -Uri "$server/api/tracker?async=false" -Headers $headers -Method Post -Body $eventJson -ErrorAction Stop
} catch {
  $err = $_.Exception.Message
  Write-Output (ConvertTo-Json @{ status='FAIL'; teiId=$teiId; eventId=$null; error="POST tracker (event) failed: $err" })
  exit 0
}
# parse event id
$eventId = $null
if($resp2.response -and $resp2.response.importSummaries){ $eventId = $resp2.response.importSummaries[0].reference }
elseif($resp2.importSummaries){ $eventId = $resp2.importSummaries[0].reference }
elseif($resp2.reference){ $eventId = $resp2.reference }

# verify by GET tracker endpoints
$foundTEI = $false; $foundEvent = $false
try{
  $teList = Invoke-RestMethod -Uri "$server/api/tracker/trackedEntities?program=$programId&ou=$ouId&ouMode=ACCESSIBLE&paging=false&fields=trackedEntity" -Headers $headers -Method Get -ErrorAction Stop
  if($teList.trackedEntities){ foreach($t in $teList.trackedEntities){ if($t.trackedEntity -eq $teiId){ $foundTEI = $true } } }
} catch { }
try{
  $evList = Invoke-RestMethod -Uri "$server/api/tracker/events?program=$programId&ou=$ouId&ouMode=ACCESSIBLE&trackedEntityInstance=$teiId&fields=event" -Headers $headers -Method Get -ErrorAction Stop
  if($evList.events){ foreach($e in $evList.events){ if($e.event -eq $eventId){ $foundEvent = $true } } }
} catch { }

$status = 'FAIL'
if($foundTEI -and $foundEvent){ $status = 'PASS' }

$result = @{ status = $status; teiId = $teiId; eventId = $eventId; error = $null }
Write-Output (ConvertTo-Json $result)
