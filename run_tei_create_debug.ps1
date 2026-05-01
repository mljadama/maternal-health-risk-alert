$ErrorActionPreference = "Stop"
$server = 'http://localhost:8080'
$creds = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:district'))
$headers = @{ Authorization = "Basic $creds"; "Content-Type" = "application/json" }

# fetch config
try{ $config = Invoke-RestMethod -Uri "$server/api/dataStore/maternal_health_risk_alert/config" -Headers $headers -Method Get -ErrorAction Stop } catch { Write-Output "GET config failed: $($_.Exception.Message)"; exit 0 }

$programId = $null; $programStageId = $null; $teTypeId = $null
if($config.program){ $programId = $config.program.id }
if($config.programStage){ $programStageId = $config.programStage.id }
if($config.trackedEntityType){ $teTypeId = $config.trackedEntityType.id }

$attributeIds = @(); if($config.attributes){ foreach($a in $config.attributes){ if($a.id){ $attributeIds += $a.id } } }

# pick an org unit from /api/me
try{ $me = Invoke-RestMethod -Uri "$server/api/me?fields=teiSearchOrganisationUnits[id],dataViewOrganisationUnits[id],organisationUnits[id]" -Headers $headers -Method Get -ErrorAction Stop } catch { Write-Output "GET /api/me failed: $($_.Exception.Message)"; exit 0 }
$ou = $me.teiSearchOrganisationUnits | Select-Object -First 1
if(-not $ou){ $ou = $me.dataViewOrganisationUnits | Select-Object -First 1 }
if(-not $ou){ $ou = $me.organisationUnits | Select-Object -First 1 }
if(-not $ou){ Write-Output 'No organisation unit available from /api/me'; exit 0 }
$ouId = $ou.id

# prepare attributes with unique values
$attrArr = @(); $i = 0; $uniqueSuffix = (Get-Random -Maximum 999999)
foreach($aid in $attributeIds){ $i++; $val = "val_${uniqueSuffix}_$i"; $attrArr += @{ attribute = $aid; value = $val } }
if($attrArr.Count -eq 0){ $attrArr += @{ attribute = 'NONE'; value = "val_${uniqueSuffix}_1" } }

# build TEI payload
$teiPayload = @{ trackedEntities = @(
  @{ trackedEntityType = $teTypeId; orgUnit = $ouId; attributes = $attrArr; enrollments = @(@{ orgUnit = $ouId; program = $programId; enrollmentDate = (Get-Date -Format yyyy-MM-dd); incidentDate = (Get-Date -Format yyyy-MM-dd); status = 'ACTIVE' }) }
) }
$teiJson = $teiPayload | ConvertTo-Json -Depth 10

function Do-Post([string]$bodyJson){
  try{
    $resp = Invoke-RestMethod -Uri "$server/api/tracker?async=false" -Headers $headers -Method Post -Body $bodyJson -ErrorAction Stop
    return @{ success = $true; resp = $resp }
  } catch {
    $body = ""
    if ($_.Exception.Response) {
      try{
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
      } catch { $body = $_.Exception.Message }
    } else { $body = $_.Exception.Message }

    Write-Output "POST tracker failed. Full HTTP response body (if any):`n$body"

    try{ $parsed = $body | ConvertFrom-Json } catch { $parsed = $null }
    $conflicts = @()
    if($parsed){
      if($parsed.importSummaries){ foreach($s in $parsed.importSummaries){ if($s.conflicts){ $conflicts += $s.conflicts } } }
      if($parsed.response -and $parsed.response.importSummaries){ foreach($s in $parsed.response.importSummaries){ if($s.conflicts){ $conflicts += $s.conflicts } } }
    }
    if($conflicts.Count -gt 0){ Write-Output "`nParsed conflict details (limited):"; $cnt=0; foreach($c in $conflicts){ $cnt++; if($cnt -gt 20){ break }; Write-Output (ConvertTo-Json $c) } }

    return @{ success = $false; body = $body; parsed = $parsed; conflicts = $conflicts }
  }
}

# first attempt
Write-Output "Performing TEI create (first attempt)..."
$first = Do-Post($teiJson)
if($first.success){ Write-Output "TEI create succeeded. Response:"; Write-Output ($first.resp | ConvertTo-Json -Depth 10); exit 0 }

# suggest minimal fix: change first attribute value and retry once
Write-Output "Suggesting minimal payload fix: modify first attribute value to a new unique value and retry once."
$attrArr[0].value = $attrArr[0].value + "_fix"
$teiPayload2 = @{ trackedEntities = @(
  @{ trackedEntityType = $teTypeId; orgUnit = $ouId; attributes = $attrArr; enrollments = @(@{ orgUnit = $ouId; program = $programId; enrollmentDate = (Get-Date -Format yyyy-MM-dd); incidentDate = (Get-Date -Format yyyy-MM-dd); status = 'ACTIVE' }) }
) }
$teiJson2 = $teiPayload2 | ConvertTo-Json -Depth 10
Write-Output "Retrying TEI create with modified payload..."
$second = Do-Post($teiJson2)
if($second.success){ Write-Output "Retry succeeded. Response:"; Write-Output ($second.resp | ConvertTo-Json -Depth 10); exit 0 } else { Write-Output "Retry failed. Full HTTP response body (if any):`n$($second.body)"; exit 0 }
