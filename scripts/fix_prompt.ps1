<#
Fix last garbled prompt text
#>

$filePath = "E:\New folder\Doan\views\client_js.html"
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
$content = [System.IO.File]::ReadAllText($filePath, $utf8BOM)
$lines = $content -split "`n"

function V { 
    param([string]$template)
    [regex]::Replace($template, '\{([0-9A-Fa-f]+)\}', {
        param($m)
        [string][char][int]("0x" + $m.Groups[1].Value)
    })
}

# Line 881 - prompt text "Nhập họ tên của bạn:"
$lines[880] = V '            "Nh{1EAD}p h{1ECD} t{EA}n c{1EE7}a b{1EA1}n:",'

$newContent = $lines -join "`n"
[System.IO.File]::WriteAllText($filePath, $newContent, $utf8BOM)
Write-Host "Fixed line 881"
