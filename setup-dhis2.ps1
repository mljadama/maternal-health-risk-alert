# setup-dhis2.ps1
# Run this any time the demo server resets.
# Place this file in the project root next to package.json
# Then run: .\setup-dhis2.ps1

$ErrorActionPreference = 'Stop'

$SERVER    = "http://localhost:8080"
$USER      = "admin"
$PASS      = "district"

$creds   = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${USER}:${PASS}"))
$headers = @{ Authorization = "Basic $creds"; "Content-Type" = "application/json" }
$base    = "$SERVER/api"

function PostJSON($path, $obj) {
    $body = $obj | ConvertTo-Json -Depth 10 -Compress
    try {
        $r = Invoke-RestMethod -Uri "$base/$path" -Method Post -Headers $headers -Body $body -MaximumRedirection 5
        return $r.response.uid
    } catch {
        if ($_.Exception.Message -match '"uid":"([a-zA-Z0-9]{11})"') {
            return $matches[1]
        }
        Write-Host "  ERROR $path : $($_.Exception.Message.Substring(0, [Math]::Min(160,$_.Exception.Message.Length)))" -ForegroundColor Red
        return $null
    }
}

function PutJSON($path, $obj) {
    $body = $obj | ConvertTo-Json -Depth 10 -Compress
    try {
        Invoke-RestMethod -Uri "$base/$path" -Method Put -Headers $headers -Body $body -MaximumRedirection 5 | Out-Null
    } catch {}
}

function Share($type, $uid) {
    PutJSON "$type/$uid/sharing" @{ object = @{ publicAccess = "rwrw----" } }
}

function GetUserIdByUsername($username) {
    try {
        $encoded = [System.Uri]::EscapeDataString("username:eq:$username")
        $res = Invoke-RestMethod -Uri "$base/users?fields=id,username&filter=$encoded&paging=false" -Headers $headers -MaximumRedirection 5
        $match = $res.users | Where-Object { "$( $_.username )" -eq "$username" } | Select-Object -First 1
        if ($match -and $match.id) {
            return $match.id
        }
    } catch {}
    return $null
}

function AssignUserOrgUnitScopes($userId, $ouId) {
    $paths = @(
        "users/$userId/organisationUnits/$ouId",
        "users/$userId/dataViewOrganisationUnits/$ouId",
        "users/$userId/teiSearchOrganisationUnits/$ouId"
    )

    foreach ($path in $paths) {
        try {
            Invoke-RestMethod -Uri "$base/$path" -Method Post -Headers $headers -MaximumRedirection 5 | Out-Null
        } catch {
            # Ignore already-assigned conflicts, but surface other issues.
            if ($_.Exception.Message -notmatch "\(409\)") {
                Write-Host "  WARN $path : $($_.Exception.Message.Substring(0, [Math]::Min(160,$_.Exception.Message.Length)))" -ForegroundColor Yellow
            }
        }
    }
}

function FindExistingId($resource, $field, $value) {
    try {
        $res = Invoke-RestMethod -Uri "$base/$resource?fields=id,$field&paging=false" -Headers $headers -MaximumRedirection 5
        $items = $res | Select-Object -ExpandProperty $resource -ErrorAction SilentlyContinue
        if (-not $items) { return $null }
        $match = $items | Where-Object {
            $_.PSObject.Properties[$field] -and ("$($_.$field)" -eq "$value")
        } | Select-Object -First 1
        return $match.id
    } catch {
        return $null
    }
}

function GetOrCreateOU($code, $obj) {
    try {
        $res = Invoke-RestMethod -Uri "$base/organisationUnits?fields=id,code&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.organisationUnits | Where-Object { "$($_.code)" -eq "$code" } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing) $code : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    $createdId = PostJSON "organisationUnits" $obj
    if ($createdId) {
        return $createdId
    }

    # If create failed due conflict/race, try one more lookup.
    try {
        $res = Invoke-RestMethod -Uri "$base/organisationUnits?fields=id,code&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.organisationUnits | Where-Object { "$($_.code)" -eq "$code" } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing after conflict) $code : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    return $null
}

function GetOrCreateAttr($name, $obj) {
    try {
        $res = Invoke-RestMethod -Uri "$base/trackedEntityAttributes?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.trackedEntityAttributes | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    $createdId = PostJSON "trackedEntityAttributes" $obj
    if ($createdId) {
        return $createdId
    }

    try {
        $res = Invoke-RestMethod -Uri "$base/trackedEntityAttributes?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.trackedEntityAttributes | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing after conflict) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    return $null
}

function GetOrCreateDE($name, $obj) {
    try {
        $res = Invoke-RestMethod -Uri "$base/dataElements?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.dataElements | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    $createdId = PostJSON "dataElements" $obj
    if ($createdId) {
        return $createdId
    }

    try {
        $res = Invoke-RestMethod -Uri "$base/dataElements?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.dataElements | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing after conflict) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    return $null
}

function GetOrCreateTET($name, $obj) {
    try {
        $res = Invoke-RestMethod -Uri "$base/trackedEntityTypes?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.trackedEntityTypes | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    $createdId = PostJSON "trackedEntityTypes" $obj
    if ($createdId) {
        return $createdId
    }

    try {
        $res = Invoke-RestMethod -Uri "$base/trackedEntityTypes?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.trackedEntityTypes | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing after conflict) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    return $null
}

function GetOrCreateProgram($name, $obj) {
    try {
        $res = Invoke-RestMethod -Uri "$base/programs?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.programs | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    $createdId = PostJSON "programs" $obj
    if ($createdId) {
        return $createdId
    }

    # If create failed due conflict/race, try one more lookup.
    try {
        $res = Invoke-RestMethod -Uri "$base/programs?fields=id,name,shortName&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.programs | Where-Object {
            ("$($_.name)" -eq "$name") -or ($obj.shortName -and ("$($_.shortName)" -eq "$($obj.shortName)"))
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing after conflict) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    return $null
}

function GetOrCreateStage($name, $obj) {
    try {
        $res = Invoke-RestMethod -Uri "$base/programStages?fields=id,name,program[id]&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.programStages | Where-Object {
            ("$($_.name)" -eq "$name") -and ($obj.program.id -eq $_.program.id)
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    $createdId = PostJSON "programStages" $obj
    if ($createdId) {
        return $createdId
    }

    # If create failed due conflict/race, try one more lookup.
    try {
        $res = Invoke-RestMethod -Uri "$base/programStages?fields=id,name,program[id]&paging=false" -Headers $headers -MaximumRedirection 5
        $existing = $res.programStages | Where-Object {
            ("$($_.name)" -eq "$name") -and ($obj.program.id -eq $_.program.id)
        } | Select-Object -First 1
        if ($existing -and $existing.id) {
            Write-Host "  (existing after conflict) $name : $($existing.id)" -ForegroundColor DarkGray
            return $existing.id
        }
    } catch {}

    return $null
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Maternal Health Risk Alert - DHIS2 Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ADMIN_UID = GetUserIdByUsername $USER
if (-not $ADMIN_UID) {
    throw "Could not resolve user id for username '$USER'."
}
Write-Host "Using user '$USER' UID: $ADMIN_UID" -ForegroundColor DarkGray

# ── Step 1: Organisation Units ────────────────────────────────
Write-Host "Step 1: Organisation units..." -ForegroundColor Yellow

$gid = GetOrCreateOU "GMB" @{
    name        = "The Gambia"
    shortName   = "Gambia"
    code        = "GMB"
    openingDate = "1965-02-18"
}
if (-not $gid) { throw "Root organisation unit was not created successfully." }
Write-Host "  The Gambia: $gid"

function MakeHospital($name, $short, $code, $date) {
    return GetOrCreateOU $code @{
        name        = $name
        shortName   = $short
        code        = $code
        openingDate = $date
        parent      = @{ id = $gid }
    }
}

$h1 = MakeHospital "Serrekunda General Hospital"            "Serrekunda GH"  "GMB001" "1975-01-01"
$h2 = MakeHospital "Brikama Health Centre"                  "Brikama HC"     "GMB002" "1980-01-01"
$h3 = MakeHospital "Royal Victoria Teaching Hospital"       "RVTH"           "GMB003" "1923-01-01"
$h4 = MakeHospital "Edward Francis Small Teaching Hospital" "EFSTH"          "GMB004" "1923-01-01"
$h5 = MakeHospital "Farafenni Hospital"                     "Farafenni Hosp" "GMB005" "1966-01-01"
$h6 = MakeHospital "Bundung MCH Hospital"                   "Bundung MCH"    "GMB006" "1989-01-01"

Write-Host "  Serrekunda GH:  $h1"
Write-Host "  Brikama HC:     $h2"
Write-Host "  RVTH:           $h3"
Write-Host "  EFSTH:          $h4"
Write-Host "  Farafenni:      $h5"
Write-Host "  Bundung MCH:    $h6"

$allOU = @($gid, $h1, $h2, $h3, $h4, $h5, $h6)
foreach ($uid in $allOU) {
    AssignUserOrgUnitScopes $ADMIN_UID $uid
}
Write-Host "  Assigned to user org unit scopes" -ForegroundColor Green

# Force assign all org unit scopes via PATCH
$patchHeaders = @{
    Authorization  = "Basic $creds"
    "Content-Type" = "application/json-patch+json"
}
$ouList = $allOU | ForEach-Object { '{"id":"' + $_ + '"}' }
$ouJson = '[' + ($ouList -join ',') + ']'
$patchBody = '[
    {"op":"add","path":"/organisationUnits","value":' + $ouJson + '},
    {"op":"add","path":"/teiSearchOrganisationUnits","value":' + $ouJson + '},
    {"op":"add","path":"/dataViewOrganisationUnits","value":' + $ouJson + '}
]'
try {
    Invoke-RestMethod -Uri "$base/users/$ADMIN_UID" -Method Patch -Headers $patchHeaders -Body $patchBody -MaximumRedirection 5 | Out-Null
    Write-Host "  Org unit scopes patched successfully" -ForegroundColor Green
} catch {
    Write-Host "  WARN: Could not patch org unit scopes" -ForegroundColor Yellow
}

# ── Step 2: Tracked Entity Type & Attributes ─────────────────
Write-Host ""
Write-Host "Step 2: Tracked entity type and attributes..." -ForegroundColor Yellow

$trackedEntityTypeUid = GetOrCreateTET "GMB Pregnant Woman" @{
    name      = "GMB Pregnant Woman"
    shortName = "GMB Mother"
}
if (-not $trackedEntityTypeUid) { throw "Tracked entity type was not created successfully." }
Write-Host "  Tracked Entity Type: $trackedEntityTypeUid"

function MakeAttr($name, $short, $type) {
    return GetOrCreateAttr $name @{
        name            = $name
        shortName       = $short
        valueType       = $type
        aggregationType = "NONE"
    }
}

$a1 = MakeAttr "GMB Full Name"              "GMB Full Name"          "TEXT"
$a2 = MakeAttr "GMB Age"                    "GMB Age"                "NUMBER"
$a3 = MakeAttr "GMB Village"               "GMB Village"            "TEXT"
$a4 = MakeAttr "GMB Phone Number"           "GMB Phone"              "PHONE_NUMBER"
$a5 = MakeAttr "GMB Parity"                "GMB Parity"             "NUMBER"
$a6 = MakeAttr "GMB Previous Complications" "GMB Prev Complications" "TEXT"

Write-Host "  Full Name:           $a1"
Write-Host "  Age:                 $a2"
Write-Host "  Village:             $a3"
Write-Host "  Phone:               $a4"
Write-Host "  Parity:              $a5"
Write-Host "  Prev Complications:  $a6"

if (-not ($a1 -and $a2 -and $a3 -and $a4 -and $a5 -and $a6)) {
    throw "One or more tracked entity attributes were not created or resolved successfully."
}

# ── Step 3: Data Elements ─────────────────────────────────────
Write-Host ""
Write-Host "Step 3: Data elements..." -ForegroundColor Yellow

function MakeDE($name, $short, $type) {
    return GetOrCreateDE $name @{
        name            = $name
        shortName       = $short
        valueType       = $type
        domainType      = "TRACKER"
        aggregationType = "NONE"
    }
}

$d1  = MakeDE "GMB BP Systolic"          "GMB BP Systolic"      "NUMBER"
$d2  = MakeDE "GMB BP Diastolic"         "GMB BP Diastolic"     "NUMBER"
$d3  = MakeDE "GMB Haemoglobin"          "GMB Haemoglobin"      "NUMBER"
$d4  = MakeDE "GMB Weight"               "GMB Weight"           "NUMBER"
$d5  = MakeDE "GMB Gestational Age"      "GMB Gestational Age"  "NUMBER"
$d6  = MakeDE "GMB Visit Number"         "GMB Visit Number"     "NUMBER"
$d7  = MakeDE "GMB Malaria Test Result"  "GMB Malaria Result"   "TEXT"
$d8  = MakeDE "GMB Iron Supplementation" "GMB Iron Suppl"       "TRUE_ONLY"
$d9  = MakeDE "GMB Folic Acid"           "GMB Folic Acid"       "TRUE_ONLY"
$d10 = MakeDE "GMB Nurse Notes"          "GMB Nurse Notes"      "TEXT"
$d11 = MakeDE "GMB Danger Signs"         "GMB Danger Signs"     "TEXT"
$d12 = MakeDE "GMB Next Visit Date"      "GMB Next Visit Date"  "DATE"

Write-Host "  BP Systolic:      $d1"
Write-Host "  BP Diastolic:     $d2"
Write-Host "  Haemoglobin:      $d3"
Write-Host "  Weight:           $d4"
Write-Host "  Gestational Age:  $d5"
Write-Host "  Visit Number:     $d6"
Write-Host "  Malaria Result:   $d7"
Write-Host "  Iron Suppl:       $d8"
Write-Host "  Folic Acid:       $d9"
Write-Host "  Nurse Notes:      $d10"
Write-Host "  Danger Signs:     $d11"
Write-Host "  Next Visit Date:  $d12"

if (-not ($d1 -and $d2 -and $d3 -and $d4 -and $d5 -and $d6 -and $d7 -and $d8 -and $d9 -and $d10 -and $d11 -and $d12)) {
    throw "One or more data elements were not created or resolved successfully."
}

# ── Step 4: Program ───────────────────────────────────────────
Write-Host ""
Write-Host "Step 4: Creating ANC program..." -ForegroundColor Yellow

$progUid = GetOrCreateProgram "GMB Antenatal Care" @{
    name              = "GMB Antenatal Care"
    shortName         = "GMB ANC"
    programType       = "WITH_REGISTRATION"
    trackedEntityType = @{ id = $trackedEntityTypeUid }
    organisationUnits = @(
        @{ id = $gid }, @{ id = $h1 }, @{ id = $h2 },
        @{ id = $h3 },  @{ id = $h4 }, @{ id = $h5 }, @{ id = $h6 }
    )
    programTrackedEntityAttributes = @(
        @{ trackedEntityAttribute = @{ id = $a1 }; mandatory = $true;  displayInList = $true; sortOrder = 1 }
        @{ trackedEntityAttribute = @{ id = $a2 }; mandatory = $true;  displayInList = $true; sortOrder = 2 }
        @{ trackedEntityAttribute = @{ id = $a3 }; mandatory = $true;  displayInList = $true; sortOrder = 3 }
        @{ trackedEntityAttribute = @{ id = $a4 }; mandatory = $false; displayInList = $true; sortOrder = 4 }
        @{ trackedEntityAttribute = @{ id = $a5 }; mandatory = $true;  displayInList = $true; sortOrder = 5 }
        @{ trackedEntityAttribute = @{ id = $a6 }; mandatory = $false; displayInList = $true; sortOrder = 6 }
    )
}
Write-Host "  Program UID: $progUid"
if (-not $progUid) { throw "Program was not created successfully." }
Share "programs" $progUid

# ── Step 5: Program Stage ─────────────────────────────────────
Write-Host ""
Write-Host "Step 5: Creating ANC visit program stage..." -ForegroundColor Yellow

$stageUid = GetOrCreateStage "GMB ANC Visit" @{
    name       = "GMB ANC Visit"
    program    = @{ id = $progUid }
    sortOrder  = 1
    repeatable = $true
    programStageDataElements = @(
        @{ dataElement = @{ id = $d1  }; compulsory = $true;  sortOrder = 1  }
        @{ dataElement = @{ id = $d2  }; compulsory = $true;  sortOrder = 2  }
        @{ dataElement = @{ id = $d3  }; compulsory = $true;  sortOrder = 3  }
        @{ dataElement = @{ id = $d4  }; compulsory = $true;  sortOrder = 4  }
        @{ dataElement = @{ id = $d5  }; compulsory = $true;  sortOrder = 5  }
        @{ dataElement = @{ id = $d6  }; compulsory = $false; sortOrder = 6  }
        @{ dataElement = @{ id = $d7  }; compulsory = $false; sortOrder = 7  }
        @{ dataElement = @{ id = $d8  }; compulsory = $false; sortOrder = 8  }
        @{ dataElement = @{ id = $d9  }; compulsory = $false; sortOrder = 9  }
        @{ dataElement = @{ id = $d10 }; compulsory = $false; sortOrder = 10 }
        @{ dataElement = @{ id = $d11 }; compulsory = $false; sortOrder = 11 }
        @{ dataElement = @{ id = $d12 }; compulsory = $false; sortOrder = 12 }
    )
}
Write-Host "  Program Stage UID: $stageUid"
if (-not $stageUid) { throw "Program stage was not created successfully." }
Share "programStages" $stageUid

# ── Step 6: Seed runtime config ───────────────────────────────
Write-Host ""
Write-Host "Step 6: Seeding runtime app configuration..." -ForegroundColor Yellow

$config = @{
    program           = @{ id = $progUid;  name = "GMB Antenatal Care" }
    programStage      = @{ id = $stageUid; name = "GMB ANC Visit" }
    trackedEntityType = @{ id = $trackedEntityTypeUid }
    attributes = @{
        fullName              = $a1
        age                   = $a2
        village               = $a3
        phoneNumber           = $a4
        parity                = $a5
        previousComplications = $a6
    }
    dataElements = @{
        bpSystolic          = $d1
        bpDiastolic         = $d2
        haemoglobin         = $d3
        weight              = $d4
        gestationalAge      = $d5
        visitNumber         = $d6
        malariaTestResult   = $d7
        ironSupplementation = $d8
        folicAcid           = $d9
        nurseNotes          = $d10
        dangerSigns         = $d11
        nextVisitDate       = $d12
    }
    thresholds = @{
        AGE_MIN = 18; AGE_MAX = 35
        BP_SYSTOLIC_HIGH = 140; BP_DIASTOLIC_HIGH = 90
        BP_SYSTOLIC_SEVERE = 160; BP_DIASTOLIC_SEVERE = 110
        HB_NORMAL_MIN = 11.0; HB_MODERATE_ANAEMIA = 8.0; HB_SEVERE_ANAEMIA = 7.0
        ANC_MINIMUM_VISITS = 4; FIRST_TRIMESTER_WEEKS = 13
        GRAND_MULTIPARA_THRESHOLD = 4; SCORE_HIGH = 40; SCORE_MODERATE = 20
    }
    malariaResults      = @("Negative", "Positive (P. falciparum)", "Positive (P. vivax)", "Not done")
    dangerSignOptions   = @("Severe headache", "Blurred vision", "Severe abdominal pain", "Vaginal bleeding", "Convulsions", "Difficulty breathing", "Reduced fetal movement", "Swelling of face/hands")
    complicationOptions = @("None", "Pre-eclampsia", "Gestational diabetes", "Placenta previa", "Previous C-section", "Postpartum haemorrhage", "Anaemia", "Preterm birth", "Stillbirth", "Miscarriage")
    riskColors = @{
        high     = @{ main = '#dc2626'; light = '#fef2f2'; border = '#fecaca'; dark = '#991b1b' }
        moderate = @{ main = '#d97706'; light = '#fffbeb'; border = '#fde68a'; dark = '#92400e' }
        normal   = @{ main = '#16a34a'; light = '#f0fdf4'; border = '#bbf7d0'; dark = '#14532d' }
    }
} | ConvertTo-Json -Depth 8 -Compress

try {
    Invoke-RestMethod -Uri "$base/dataStore/maternal_health_risk_alert/config" -Method Put -Headers $headers -Body $config -MaximumRedirection 5 | Out-Null
} catch {
    Invoke-RestMethod -Uri "$base/dataStore/maternal_health_risk_alert/config" -Method Post -Headers $headers -Body $config -MaximumRedirection 5 | Out-Null
}
Write-Host "  Configuration saved to dataStore" -ForegroundColor Green

# ── Step 7: Write dhis2.js ────────────────────────────────────
Write-Host ""
Write-Host "Step 7: Writing src/config/dhis2.js..." -ForegroundColor Yellow

$js = @"
// src/config/dhis2.js
// AUTO-GENERATED by setup-dhis2.ps1

export const PROGRAM       = { id: '$progUid',  name: 'GMB Antenatal Care' }
export const PROGRAM_STAGE = { id: '$stageUid', name: 'GMB ANC Visit' }
export const TRACKED_ENTITY_TYPE = '$trackedEntityTypeUid'

export const ORG_UNITS = {
    theGambia:     '$gid',
    serrekundaGH:  '$h1',
    brikamaHC:     '$h2',
    royalVictoria: '$h3',
    edwardFrancis: '$h4',
    farafenni:     '$h5',
    bundungMCH:    '$h6',
}

export const ATTRIBUTES = {
    fullName:              '$a1',
    age:                   '$a2',
    village:               '$a3',
    phoneNumber:           '$a4',
    parity:                '$a5',
    previousComplications: '$a6',
}

export const DATA_ELEMENTS = {
    bpSystolic:          '$d1',
    bpDiastolic:         '$d2',
    haemoglobin:         '$d3',
    weight:              '$d4',
    gestationalAge:      '$d5',
    visitNumber:         '$d6',
    malariaTestResult:   '$d7',
    ironSupplementation: '$d8',
    folicAcid:           '$d9',
    nurseNotes:          '$d10',
    dangerSigns:         '$d11',
    nextVisitDate:       '$d12',
}

export const THRESHOLDS = {
    AGE_MIN: 18, AGE_MAX: 35,
    BP_SYSTOLIC_HIGH: 140, BP_DIASTOLIC_HIGH: 90,
    BP_SYSTOLIC_SEVERE: 160, BP_DIASTOLIC_SEVERE: 110,
    HB_NORMAL_MIN: 11.0, HB_MODERATE_ANAEMIA: 8.0, HB_SEVERE_ANAEMIA: 7.0,
    ANC_MINIMUM_VISITS: 4, FIRST_TRIMESTER_WEEKS: 13,
    GRAND_MULTIPARA_THRESHOLD: 4, SCORE_HIGH: 40, SCORE_MODERATE: 20,
}

export const MALARIA_RESULTS = [
    'Negative', 'Positive (P. falciparum)', 'Positive (P. vivax)', 'Not done',
]

export const DANGER_SIGN_OPTIONS = [
    'Severe headache', 'Blurred vision', 'Severe abdominal pain',
    'Vaginal bleeding', 'Convulsions', 'Difficulty breathing',
    'Reduced fetal movement', 'Swelling of face/hands',
]

export const COMPLICATION_OPTIONS = [
    'None', 'Pre-eclampsia', 'Gestational diabetes', 'Placenta previa',
    'Previous C-section', 'Postpartum haemorrhage', 'Anaemia',
    'Preterm birth', 'Stillbirth', 'Miscarriage',
]

export const RISK_COLORS = {
    high:     { main: '#dc2626', light: '#fef2f2', border: '#fecaca', dark: '#991b1b' },
    moderate: { main: '#d97706', light: '#fffbeb', border: '#fde68a', dark: '#92400e' },
    normal:   { main: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', dark: '#14532d' },
}
"@

$js | Out-File -FilePath "src\config\dhis2.js" -Encoding utf8 -NoNewline
Write-Host "  Written successfully" -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Program UID:        $progUid"  -ForegroundColor White
Write-Host "  Program Stage UID:  $stageUid" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Restart:    npm start"
Write-Host "  2. Reload:     Ctrl+Shift+R in browser"
Write-Host "  3. Test:       Register a patient"
Write-Host ""