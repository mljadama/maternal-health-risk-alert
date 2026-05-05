# seed-data.ps1
# Seeds 7 test patients with visits into the DHIS2 instance.
# Run after setup-dhis2.ps1 completes successfully.
# Usage: .\seed-data.ps1

$ErrorActionPreference = 'Continue'

$SERVER = "http://localhost:8080"
$USER   = "admin"
$PASS   = "district"

$creds   = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${USER}:${PASS}"))
$headers = @{ Authorization = "Basic $creds"; "Content-Type" = "application/json" }
$base    = "$SERVER/api"

# UIDs from latest setup run
$PROG  = "SG0QrZLHeoV"
$STAGE = "VDL4bugbwLo"
$TET   = "oXDRIoNqfoc"
$OU    = "fhRSYisJxEl"

# Attributes
$A_NAME    = "xGQ99ZcLphV"
$A_AGE     = "F72pQtzbe5r"
$A_VILLAGE = "JSFCZJwImKw"
$A_PHONE   = "za0Ls1btrlI"
$A_PARITY  = "c64kUdvYKvQ"
$A_PREV    = "gaJvHyaOWpa"

# Data elements
$D_SYS   = "jHZOqWC7kIE"
$D_DIA   = "dd9IA5mls00"
$D_HB    = "CncKept7HR4"
$D_WT    = "F3rcrhImTJE"
$D_GA    = "VCLLZRgKPJR"
$D_VN    = "PUDBjVGCChj"
$D_MAL   = "QWOLRvomxS0"
$D_DNG   = "jojWB9MRgEP"
$D_NOTES = "lnn52YoYGmj"

function Register($name, $age, $village, $phone, $parity, $prevComp) {
    # Step 1: Create tracked entity with array wrapper
    $body1 = @{
        trackedEntities = @(@{
            trackedEntityType = $TET
            orgUnit           = $OU
            attributes        = @(
                @{ attribute = $A_NAME;    value = $name }
                @{ attribute = $A_AGE;     value = $age }
                @{ attribute = $A_VILLAGE; value = $village }
                @{ attribute = $A_PHONE;   value = $phone }
                @{ attribute = $A_PARITY;  value = $parity }
                @{ attribute = $A_PREV;    value = $prevComp }
            )
        })
    } | ConvertTo-Json -Depth 10 -Compress

    try {
        $r1 = Invoke-RestMethod -Uri "$base/tracker?async=false" -Method Post -Headers $headers -Body $body1 -MaximumRedirection 5
        $teiUid = $r1.bundleReport.typeReportMap.TRACKED_ENTITY.objectReports[0].uid
        if (-not $teiUid) {
            Write-Host "  ERROR: No TEI UID for $name" -ForegroundColor Red
            return $null
        }

        # Step 2: Enroll
        $body2 = @{
            enrollments = @(@{
                trackedEntity = $teiUid
                program       = $PROG
                orgUnit       = $OU
                enrolledAt    = (Get-Date -Format "yyyy-MM-dd")
                occurredAt    = (Get-Date -Format "yyyy-MM-dd")
                status        = "ACTIVE"
            })
        } | ConvertTo-Json -Depth 10 -Compress

        $r2 = Invoke-RestMethod -Uri "$base/tracker?async=false" -Method Post -Headers $headers -Body $body2 -MaximumRedirection 5
        $enrUid = $r2.bundleReport.typeReportMap.ENROLLMENT.objectReports[0].uid

        Write-Host "  Registered $name - TEI: $teiUid" -ForegroundColor Green
        return @{ tei = $teiUid; enr = $enrUid }
    } catch {
        Write-Host "  ERROR registering $name : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Visit($p, $date, $vn, $ga, $sys, $dia, $hb, $wt, $mal, $danger, $notes) {
    if (-not $p -or -not $p.tei) { Write-Host "  Skipping visit - no TEI"; return }

    $dvList = @(
        @{ dataElement = $D_SYS;   value = "$sys" }
        @{ dataElement = $D_DIA;   value = "$dia" }
        @{ dataElement = $D_HB;    value = "$hb" }
        @{ dataElement = $D_WT;    value = "$wt" }
        @{ dataElement = $D_GA;    value = "$ga" }
        @{ dataElement = $D_VN;    value = "$vn" }
        @{ dataElement = $D_MAL;   value = "$mal" }
        @{ dataElement = $D_NOTES; value = "$notes" }
    )
    if ($danger) {
        $dvList += @{ dataElement = $D_DNG; value = "$danger" }
    }

    $body = @{
        events = @(@{
            program       = $PROG
            programStage  = $STAGE
            orgUnit       = $OU
            trackedEntity = $p.tei
            enrollment    = $p.enr
            occurredAt    = $date
            scheduledAt   = $date
            status        = "COMPLETED"
            dataValues    = $dvList
        })
    } | ConvertTo-Json -Depth 10 -Compress

    try {
        Invoke-RestMethod -Uri "$base/tracker?async=false" -Method Post -Headers $headers -Body $body -MaximumRedirection 5 | Out-Null
        Write-Host "    Visit $date GA=$ga BP=$sys/$dia Hb=$hb" -ForegroundColor Cyan
    } catch {
        Write-Host "    Visit failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Seeding test patients..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Patient 1: Aminata Jallow (HIGH RISK)" -ForegroundColor Yellow
$p1 = Register "Aminata Jallow" "28" "Bakau" "+220 7011234" "2" "Pre-eclampsia"
Visit $p1 "2026-01-10" "1" "20" "128" "82"  "11.2" "62" "Negative" "" "First visit normal"
Visit $p1 "2026-02-14" "2" "28" "138" "88"  "10.8" "64" "Negative" "" "BP slightly elevated"
Visit $p1 "2026-03-10" "3" "34" "152" "98"  "10.2" "67" "Negative" "Severe headache,Blurred vision" "BP rising refer if continues"
Visit $p1 "2026-04-27" "4" "36" "168" "112" "9.8"  "69" "Negative" "Severe headache,Blurred vision,Swelling of face/hands" "Severe pre-eclampsia refer immediately"

Write-Host ""
Write-Host "Patient 2: Fatoumata Ceesay (HIGH RISK)" -ForegroundColor Yellow
$p2 = Register "Fatoumata Ceesay" "22" "Serrekunda" "+220 7022345" "0" "None"
Visit $p2 "2026-02-05" "1" "16" "118" "76" "9.8" "55" "Positive (P. falciparum)" "Difficulty breathing" "Malaria positive started treatment"
Visit $p2 "2026-03-01" "2" "22" "114" "72" "6.8" "54" "Positive (P. falciparum)" "Difficulty breathing" "Hb critically low severe anaemia"

Write-Host ""
Write-Host "Patient 3: Mariama Camara (HIGH RISK)" -ForegroundColor Yellow
$p3 = Register "Mariama Camara" "15" "Brikama" "+220 7033456" "0" "None"
Visit $p3 "2026-04-27" "1" "32" "122" "78" "10.4" "52" "Negative" "" "Late presentation at 32 weeks"

Write-Host ""
Write-Host "Patient 4: Haddy Bojang (HIGH RISK)" -ForegroundColor Yellow
$p4 = Register "Haddy Bojang" "38" "Banjul" "+220 7044567" "5" "Postpartum haemorrhage"
Visit $p4 "2026-01-15" "1" "12" "132" "84" "10.6" "74" "Negative" "" "High parity monitor closely"
Visit $p4 "2026-02-12" "2" "20" "136" "86" "10.1" "76" "Negative" "" "BP trending up"
Visit $p4 "2026-03-12" "3" "28" "144" "92" "9.6"  "78" "Negative" "Severe abdominal pain" "Hypertension confirmed"

Write-Host ""
Write-Host "Patient 5: Isatou Sanyang (MODERATE RISK)" -ForegroundColor Yellow
$p5 = Register "Isatou Sanyang" "30" "Sukuta" "+220 7055678" "1" "None"
Visit $p5 "2026-02-18" "1" "22" "126" "80" "11.4" "63" "Negative" "" "Slight increase in BP"
Visit $p5 "2026-03-18" "2" "30" "136" "87" "11.0" "66" "Negative" "" "BP borderline monitor weekly"

Write-Host ""
Write-Host "Patient 6: Kumba Jobe (NORMAL)" -ForegroundColor Yellow
$p6 = Register "Kumba Jobe" "24" "Brikama" "+220 7088901" "0" "None"
Visit $p6 "2026-02-20" "1" "8"  "110" "68" "12.6" "56" "Negative" "" "Early booking excellent vitals"
Visit $p6 "2026-03-20" "2" "16" "112" "70" "12.4" "58" "Negative" "" "All normal continuing well"

Write-Host ""
Write-Host "Patient 7: Ndey Touray (NORMAL)" -ForegroundColor Yellow
$p7 = Register "Ndey Touray" "27" "Bakau" "+220 7077890" "1" "None"
Visit $p7 "2026-01-08" "1" "10" "112" "70" "12.4" "61" "Negative" "" "All normal good progress"
Visit $p7 "2026-02-05" "2" "18" "114" "72" "12.2" "64" "Negative" "" "Healthy iron and folic given"
Visit $p7 "2026-03-05" "3" "26" "116" "74" "12.0" "67" "Negative" "" "Continuing well"
Visit $p7 "2026-04-01" "4" "34" "118" "74" "11.8" "70" "Negative" "" "Normal preparing for delivery"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SEEDING COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  HIGH RISK:     Aminata Jallow, Fatoumata Ceesay, Mariama Camara, Haddy Bojang" -ForegroundColor Red
Write-Host "  MODERATE RISK: Isatou Sanyang" -ForegroundColor Yellow
Write-Host "  NORMAL:        Kumba Jobe, Ndey Touray" -ForegroundColor Green
Write-Host ""