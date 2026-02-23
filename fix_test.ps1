<#
Fix garbled Vietnamese in client_js.html
Strategy: Replace specific lines by line number
Only replace notification-related lines (showToast, alert)
#>

$filePath = "E:\New folder\Doan\views\client_js.html"
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
$content = [System.IO.File]::ReadAllText($filePath, $utf8BOM)
$lines = $content -split "`n"

Write-Host "Loaded $($lines.Length) lines"

# Map: line_number -> replacement text
# Only replacing showToast/alert lines with garbled Vietnamese
$fixes = @{}
$fixes[409] = '      showToast("Vui l' + [char]0xF2 + 'ng nh' + [char]0x1EAD + 'p ' + [char]0x111 + [char]0x1EA7 + 'y ' + [char]0x111 + [char]0x1EE7 + ' th' + [char]0xF4 + 'ng tin", "error");'
$fixes[450] = '      showToast("' + [char]0x110 + [char]0x103 + 'ng nh' + [char]0x1EAD + 'p th' + [char]0xE0 + 'nh c' + [char]0xF4 + 'ng!", "success");'
$fixes[458] = '      showToast(response.message || "' + [char]0x110 + [char]0x103 + 'ng nh' + [char]0x1EAD + 'p th' + [char]0x1EA5 + 't b' + [char]0x1EA1 + 'i", "error");'
$fixes[478] = '      showToast("Vui l' + [char]0xF2 + 'ng ' + [char]0x111 + 'i' + [char]0x1EC1 + 'n ' + [char]0x111 + [char]0x1EA7 + 'y ' + [char]0x111 + [char]0x1EE7 + ' th' + [char]0xF4 + 'ng tin", "error");'

Write-Host "Attempting fixes..."
foreach ($lineNum in ($fixes.Keys | Sort-Object)) {
    Write-Host "Line $lineNum preview: $($fixes[$lineNum].Substring(0, [Math]::Min(60, $fixes[$lineNum].Length)))..."
}
