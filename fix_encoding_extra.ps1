<#
Fix remaining garbled Vietnamese - multi-line showToast calls, 
error messages, banner HTML, prompts, and confirm dialogs
#>

$filePath = "E:\New folder\Doan\views\client_js.html"
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
$content = [System.IO.File]::ReadAllText($filePath, $utf8BOM)
$lines = $content -split "`n"
Write-Host "Loaded $($lines.Length) lines"

function V { 
    param([string]$template)
    $result = [regex]::Replace($template, '\{([0-9A-Fa-f]+)\}', {
        param($m)
        [char][int]("0x" + $m.Groups[1].Value)
    })
    return $result
}

$fixes = @{}

# Multi-line showToast: line 641 (continuation of 640)
$fixes[641] = V '        "Vui l{F2}ng nh{1EAD}p {111}{1EA7}y {111}{1EE7} th{F4}ng tin b{1EAF}t bu{1ED9}c",'

# Multi-line showToast: line 702 (continuation of 701)
$fixes[702] = V '        "{110}{103}ng k{FD} th{E0}nh c{F4}ng! {110}ang chuy{1EC3}n t{1EDB}i trang ch{1EE7}...",'

# Google login: account chooser message (line 830)
$fixes[830] = V '        "Vui l{F2}ng {111}{103}ng xu{1EA5}t Google r{1ED3}i quay l{1EA1}i {111}{E2}y",'

# Google auth success login message (line 874)
$fixes[874] = V '            response.message || "{110}{103}ng nh{1EAD}p th{E0}nh c{F4}ng!",'

# Google auth - account not found message (line 888)
$fixes[888] = V '            "T{E0}i kho{1EA3}n ch{1B0}a t{1ED3}n t{1EA1}i. Vui l{F2}ng ho{E0}n t{1EA5}t {111}{103}ng k{FD}.",'

# onApiError - default message (line 1317)
$fixes[1317] = V '    let errorMessage = "C{F3} l{1ED7}i x{1EA3}y ra";'

# onApiError - too many requests (line 1324)
$fixes[1324] = V '          "Qu{E1} nhi{1EC1}u y{EA}u c{1EA7}u. Vui l{F2}ng {111}{1EE3}i 1 ph{FA}t v{E0} th{1EED} l{1EA1}i.";'

# onApiError - timeout (line 1327)
$fixes[1327] = V '          "H{1EBF}t th{1EDD}i gian ch{1EDD}. Vui l{F2}ng ki{1EC3}m tra k{1EBF}t n{1ED1}i v{E0} th{1EED} l{1EA1}i.";'

# onApiError - network error (line 1330)
$fixes[1330] = V '          "L{1ED7}i k{1EBF}t n{1ED1}i m{1EA1}ng. Vui l{F2}ng ki{1EC3}m tra internet v{E0} th{1EED} l{1EA1}i.";'

# onApiError - generic error (line 1332)
$fixes[1332] = V '        errorMessage = "C{F3} l{1ED7}i x{1EA3}y ra: " + error.message;'

# Banner HTML - question text (line 1224)
$fixes[1224] = V '        <p class="mb-2">Kh{F4}ng nh{1EAD}n {111}{1B0}{1EE3}c email x{E1}c th{1EF1}c?</p>'

# Banner HTML - button text (line 1228)
$fixes[1228] = V '          G{1EED}i l{1EA1}i email'

# Verify email success message (line 1449)
$fixes[1449] = V '              response.message + " B{1EA1}n c{F3} th{1EC3} {111}{103}ng nh{1EAD}p ngay!",'

# Google auth new account message (lines 1053-1054)
$fixes[1053] = V '          "{1F389} " +'
$fixes[1054] = V '            (response.message ||'
$fixes[1055] = V '              "T{E0}i kho{1EA3}n m{1EDB}i {111}{E3} {111}{1B0}{1EE3}c t{1EA1}o! Ch{E0}o m{1EEB}ng " +'

# Google auth existing user message (lines 1061-1062)
$fixes[1061] = V '          response.message ||'
$fixes[1062] = V '            "{110}{103}ng nh{1EAD}p th{E0}nh c{F4}ng! Ch{E0}o m{1EEB}ng tr{1EDF} l{1EA1}i " +'

# Google auth failed (line 1078)
$fixes[1078] = V '        response.message || "{110}{103}ng nh{1EAD}p Google th{1EA5}t b{1EA1}i",'

# Prompt - confirm password (line 1636)
$fixes[1636] = V '    const confirmPassword = prompt("X{E1}c nh{1EAD}n m{1EAD}t kh{1EA9}u m{1EDB}i:");'

# Apply all fixes
$changeCount = 0
foreach ($lineNum in ($fixes.Keys | Sort-Object)) {
    $idx = $lineNum - 1
    if ($idx -ge 0 -and $idx -lt $lines.Length) {
        $oldLine = $lines[$idx]
        $newLine = $fixes[$lineNum]
        $lines[$idx] = $newLine
        $changeCount++
        Write-Host "Fixed line $lineNum"
    }
}

Write-Host "`nTotal: $changeCount lines fixed"

# Save
$newContent = $lines -join "`n"
[System.IO.File]::WriteAllText($filePath, $newContent, $utf8BOM)
Write-Host "File saved!"
