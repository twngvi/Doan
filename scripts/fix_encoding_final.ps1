<#
Fix ALL garbled Vietnamese notifications in client_js.html
Uses Unicode char codes to build correct Vietnamese strings
#>

$filePath = "E:\New folder\Doan\views\client_js.html"
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
$content = [System.IO.File]::ReadAllText($filePath, $utf8BOM)
$lines = $content -split "`n"
Write-Host "Loaded $($lines.Length) lines"

# Vietnamese char helper
# Common chars: à=E0, ả=1EA3, ã=E3, á=E1, ạ=1EA1
# ă=103, ắ=1EAF, ằ=1EB1, ẳ=1EB3, ẵ=1EB5, ặ=1EB7  
# â=E2, ấ=1EA5, ầ=1EA7, ẩ=1EA9, ẫ=1EAB, ậ=1EAD
# đ=111, Đ=110
# é=E9, è=E8, ẻ=1EBB, ẽ=1EBD, ẹ=1EB9, ê=EA, ế=1EBF, ề=1EC1, ể=1EC3, ễ=1EC5, ệ=1EC7
# í=ED, ì=EC, ỉ=1EC9, ĩ=129, ị=1ECB
# ó=F3, ò=F2, ỏ=1ECF, õ=F5, ọ=1ECD, ô=F4, ố=1ED1, ồ=1ED3, ổ=1ED5, ỗ=1ED7, ộ=1ED9
# ơ=1A1, ớ=1EDB, ờ=1EDD, ở=1EDF, ỡ=1EE1, ợ=1EE3
# ú=FA, ù=F9, ủ=1EE7, ũ=169, ụ=1EE5, ư=1B0, ứ=1EE9, ừ=1EEB, ử=1EED, ữ=1EEF, ự=1EF1
# ý=FD, ỳ=1EF3, ỷ=1EF7, ỹ=1EF9, ỵ=1EF5

# Build Vietnamese strings using char codes
function V { 
    param([string]$template)
    # Replace placeholders like {111} with actual Unicode chars
    $result = [regex]::Replace($template, '\{([0-9A-Fa-f]+)\}', {
        param($m)
        [char][int]("0x" + $m.Groups[1].Value)
    })
    return $result
}

$fixes = @{}

# Login validation (line 409)
$fixes[409] = V '      showToast("Vui l{F2}ng nh{1EAD}p {111}{1EA7}y {111}{1EE7} th{F4}ng tin", "error");'

# Login success (line 450)
$fixes[450] = V '      showToast("{110}{103}ng nh{1EAD}p th{E0}nh c{F4}ng!", "success");'

# Login failed fallback (line 458)
$fixes[458] = V '      showToast(response.message || "{110}{103}ng nh{1EAD}p th{1EA5}t b{1EA1}i", "error");'

# Register validation - fill all info (line 478)
$fixes[478] = V '      showToast("Vui l{F2}ng {111}i{1EC1}n {111}{1EA7}y {111}{1EE7} th{F4}ng tin", "error");'

# Register error (line 549) 
$fixes[549] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Login v2 - email + password validation (line 570) 
$fixes[570] = V '      showToast("Vui l{F2}ng nh{1EAD}p email v{E0} m{1EAD}t kh{1EA9}u", "error");'

# Login v2 error (line 615)
$fixes[615] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# OLD register - required fields (lines 640-641 span)  
$fixes[641] = V '        "Vui l{F2}ng nh{1EAD}p {111}{1EA7}y {111}{1EE7} th{F4}ng tin b{1EAF}t bu{1ED9}c",'

# OLD register - username min length (line 648)
$fixes[648] = V '      showToast("T{EA}n {111}{103}ng nh{1EAD}p ph{1EA3}i c{F3} {ED}t nh{1EA5}t 3 k{FD} t{1EF1}", "error");'

# OLD register - password min length (line 653)
$fixes[653] = V '      showToast("M{1EAD}t kh{1EA9}u ph{1EA3}i c{F3} {ED}t nh{1EA5}t 6 k{FD} t{1EF1}", "error");'

# OLD register - password mismatch (line 658) 
$fixes[658] = V '      showToast("M{1EAD}t kh{1EA9}u x{E1}c nh{1EAD}n kh{F4}ng kh{1EDB}p", "error");'

# OLD register success (lines 701-702 span)
$fixes[702] = V '        "{110}{103}ng k{FD} th{E0}nh c{F4}ng! {110}ang chuy{1EC3}n t{1EDB}i trang ch{1EE7}...",'

# OLD register failed fallback (line 712) 
$fixes[712] = V '      showToast(response.message || "{110}{103}ng k{FD} th{1EA5}t b{1EA1}i", "error");'

# Logout message (line 759)
$fixes[759] = V '      showToast("{110}{E3} {111}{103}ng xu{1EA5}t", "info");'

# Alert logout (line 761) 
$fixes[761] = V '      alert("{110}{E3} {111}{103}ng xu{1EA5}t");'

# Google auth timeout (line 856)
$fixes[856] = V '      showToast("Timeout: Vui l{F2}ng th{1EED} l{1EA1}i.", "error");'

# Google auth - account not exist (line 888)
# Multi-line, need to check context
# Line 886-888 area

# Google auth - registration cancelled (line 900) 
$fixes[900] = V '            showToast("{110}{103}ng k{FD} b{1ECB} h{1EE7}y", "warning");'

# Google auth - login failed fallback (line 904)
$fixes[904] = V '          showToast(response.message || "{110}{103}ng nh{1EAD}p th{1EA5}t b{1EA1}i", "error");'

# Google auth error (line 912)
$fixes[912] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Alternative Google auth timeout (line 941)
$fixes[941] = V '      showToast("Timeout: Vui l{F2}ng th{1EED} l{1EA1}i sau.", "error");'

# Auto register - missing name (line 974) 
$fixes[974] = V '      showToast("Thi{1EBF}u th{F4}ng tin h{1ECD} t{EA}n", "error");'

# Auto register timeout (line 983)
$fixes[983] = V '      showToast("Timeout: Vui l{F2}ng th{1EED} l{1EA1}i.", "error");'

# Auto register success fallback (line 999) 
$fixes[999] = V '          showToast(response.message || "{110}{103}ng k{FD} th{E0}nh c{F4}ng!", "success");'

# Auto register failed fallback (line 1005)
$fixes[1005] = V '          showToast(response.message || "{110}{103}ng k{FD} th{1EA5}t b{1EA1}i", "error");'

# Auto register error (line 1012)
$fixes[1012] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Resend email error (line 1278) 
$fixes[1278] = V '        showToast("L{1ED7}i khi g{1EED}i email: " + error.message, "error");'

# Forgot password - invalid email (line 1388)
$fixes[1388] = V '      showToast("Email kh{F4}ng h{1EE3}p l{1EC7}", "error");'

# Forgot password - error (line 1408) 
$fixes[1408] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Verify email error (line 1459)
$fixes[1459] = V '          showToast("L{1ED7}i x{E1}c th{1EF1}c: " + error.message, "error");'

# Request reset - invalid email (line 1477) 
$fixes[1477] = V '      showToast("Vui l{F2}ng nh{1EAD}p email h{1EE3}p l{1EC7}", "error");'

# Request reset - error (line 1503) 
$fixes[1503] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Reset password - code validation (line 1521) 
$fixes[1521] = V '      showToast("Vui l{F2}ng nh{1EAD}p m{E3} x{E1}c th{1EF1}c 6 ch{1EEF} s{1ED1}", "error");'

# Reset password - password min (line 1526)
$fixes[1526] = V '      showToast("M{1EAD}t kh{1EA9}u ph{1EA3}i c{F3} {ED}t nh{1EA5}t 6 k{FD} t{1EF1}", "error");'

# Reset password - mismatch (line 1531)
$fixes[1531] = V '      showToast("M{1EAD}t kh{1EA9}u x{E1}c nh{1EAD}n kh{F4}ng kh{1EDB}p", "error");'

# Reset password - error (line 1558)
$fixes[1558] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Resend code - invalid email (line 1575)
$fixes[1575] = V '      showToast("Email kh{F4}ng h{1EE3}p l{1EC7}", "error");'

# Resend code - success (line 1587)
$fixes[1587] = V '          showToast("M{E3} x{E1}c th{1EF1}c m{1EDB}i {111}{E3} {111}{1B0}{1EE3}c g{1EED}i!", "success");'

# Resend code - error (line 1595)
$fixes[1595] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Legacy reset - password min (line 1631)
$fixes[1631] = V '      showToast("M{1EAD}t kh{1EA9}u ph{1EA3}i c{F3} {ED}t nh{1EA5}t 6 k{FD} t{1EF1}", "error");'

# Legacy reset - mismatch (line 1639)
$fixes[1639] = V '      showToast("M{1EAD}t kh{1EA9}u x{E1}c nh{1EAD}n kh{F4}ng kh{1EDB}p", "error");'

# Legacy reset - error (line 1663)
$fixes[1663] = V '        showToast("L{1ED7}i: " + error.message, "error");'

# Apply all fixes
$changeCount = 0
foreach ($lineNum in ($fixes.Keys | Sort-Object)) {
    $idx = $lineNum - 1
    if ($idx -ge 0 -and $idx -lt $lines.Length) {
        $oldLine = $lines[$idx]
        $newLine = $fixes[$lineNum]
        
        # Safety: only replace if the line actually contains showToast or alert
        if ($oldLine -match 'showToast|alert') {
            $lines[$idx] = $newLine
            $changeCount++
            Write-Host "Fixed line $lineNum"
        } else {
            Write-Host "SKIP line $lineNum (no showToast/alert found: $($oldLine.Substring(0, [Math]::Min(50, $oldLine.Length))))"
        }
    }
}

Write-Host "`nTotal: $changeCount lines fixed"

# Save
$newContent = $lines -join "`n"
[System.IO.File]::WriteAllText($filePath, $newContent, $utf8BOM)
Write-Host "File saved!"
