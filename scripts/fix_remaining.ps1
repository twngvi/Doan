<#
Fix remaining garbled Vietnamese in multi-line showToast calls
Uses line numbers from current file state (2096 lines)
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
        $code = [int]("0x" + $m.Groups[1].Value)
        if ($code -gt 0xFFFF) {
            # Surrogate pair for supplementary plane
            $code -= 0x10000
            $high = [char](0xD800 + ($code -shr 10))
            $low = [char](0xDC00 + ($code -band 0x3FF))
            return "$high$low"
        }
        return [string][char]$code
    })
    return $result
}

$fixes = @{}

# Line 875 - "Tài khoản chưa tồn tại. Vui lòng hoàn tất đăng ký." (multi-line showToast param)
$fixes[875] = V '            "T{E0}i kho{1EA3}n ch{1B0}a t{1ED3}n t{1EA1}i. Vui l{F2}ng ho{E0}n t{1EA5}t {111}{103}ng k{FD}.",'

# Remove the duplicate/garbled second parameter on line 876
$fixes[876] = '            "info",'

# Line 1016 - "Lỗi: Không nhận được phản hồi từ server..."
$fixes[1016] = V '        "L{1ED7}i: Kh{F4}ng nh{1EAD}n {111}{1B0}{1EE3}c ph{1EA3}n h{1ED3}i t{1EEB} server. Vui l{F2}ng th{1EED} l{1EA1}i.",'

# Line 1362 - prompt text for forgot password
$fixes[1362] = V '      "Nh{1EAD}p email c{1EE7}a b{1EA1}n {111}{1EC3} nh{1EAD}n link reset m{1EAD}t kh{1EA9}u:",'

# Line 1605 - prompt text for reset password
$fixes[1605] = V '      "Nh{1EAD}p m{1EAD}t kh{1EA9}u m{1EDB}i (t{1ED1}i thi{1EC3}u 6 k{FD} t{1EF1}):",'

# Line 1618 - confirm password prompt
$fixes[1618] = V '    const confirmPassword = prompt("X{E1}c nh{1EAD}n m{1EAD}t kh{1EA9}u m{1EDB}i:");'

# Line 1207 - banner HTML text
$fixes[1207] = V '        <p class="mb-2">Kh{F4}ng nh{1EAD}n {111}{1B0}{1EE3}c email x{E1}c th{1EF1}c?</p>'

# Line 1211 - banner button text
$fixes[1211] = V '          G{1EED}i l{1EA1}i email'

# Apply
$changeCount = 0
foreach ($lineNum in ($fixes.Keys | Sort-Object)) {
    $idx = $lineNum - 1
    if ($idx -ge 0 -and $idx -lt $lines.Length) {
        $lines[$idx] = $fixes[$lineNum]
        $changeCount++
        Write-Host "Fixed line $lineNum"
    }
}

Write-Host "`nTotal: $changeCount lines fixed"

$newContent = $lines -join "`n"
[System.IO.File]::WriteAllText($filePath, $newContent, $utf8BOM)
Write-Host "File saved!"
