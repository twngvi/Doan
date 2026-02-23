# Fix double-encoded UTF-8 in client_js.html - SINGLE PASS only
# The file has UTF-8 text that was double-encoded (UTF-8 -> Latin-1 -> UTF-8)
# Fix: Latin-1 decode -> UTF-8 decode (reverse the double encoding)

$filePath = "E:\New folder\Doan\views\client_js.html"

# Read raw bytes
$bytes = [System.IO.File]::ReadAllBytes($filePath)

# Skip BOM (EF BB BF) 
$startIdx = 0
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $startIdx = 3
}

$utf8 = [System.Text.Encoding]::UTF8
$latin1 = [System.Text.Encoding]::GetEncoding("ISO-8859-1")
$content = $utf8.GetString($bytes, $startIdx, $bytes.Length - $startIdx)

Write-Host "File loaded: $($content.Length) characters"

$lines = $content -split "`n"
$changes = 0

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    
    # Only fix lines with showToast, alert, prompt, confirm, or specific HTML text
    # that contain garbled characters (C3 xx patterns in the Unicode text)
    $needsFix = $false
    if ($line -match 'showToast|alert\(|prompt\(|confirm\(|resend-verification-banner|errorMessage') {
        # Check if line has characters in the Latin-1 extended range that indicate double-encoding
        # Double-encoded UTF-8 shows up as sequences of characters in U+00C0-U+00FF range
        foreach ($c in $line.ToCharArray()) {
            $code = [int]$c
            if ($code -ge 0xC0 -and $code -le 0xFF) {
                $needsFix = $true
                break
            }
        }
    }
    
    if ($needsFix) {
        # Find all quoted strings in the line
        $newLine = $line
        $pattern = '"([^"]*)"'
        $matches2 = [regex]::Matches($line, $pattern)
        
        foreach ($m in $matches2) {
            $quoted = $m.Groups[1].Value
            
            # Check if this string has garbled chars
            $hasGarbled = $false
            foreach ($c in $quoted.ToCharArray()) {
                $code = [int]$c
                if ($code -ge 0xC0 -and $code -le 0xFF) {
                    $hasGarbled = $true
                    break
                }
            }
            
            if ($hasGarbled) {
                try {
                    # Reverse the double encoding: Unicode string -> Latin-1 bytes -> UTF-8 string
                    $garbledBytes = $latin1.GetBytes($quoted)
                    $fixed = $utf8.GetString($garbledBytes)
                    
                    # Verify the fix doesn't have replacement chars
                    if (-not $fixed.Contains([char]0xFFFD) -and $fixed -ne $quoted) {
                        $newLine = $newLine.Replace('"' + $quoted + '"', '"' + $fixed + '"')
                        Write-Host "Line $($i+1): '$quoted' -> '$fixed'"
                        $changes++
                    }
                } catch {
                    # Skip on error
                }
            }
        }
        
        # Also fix HTML content between tags (like in the banner)
        $htmlPattern = '>([^<]*)<'
        $htmlMatches = [regex]::Matches($line, $htmlPattern)
        foreach ($m in $htmlMatches) {
            $htmlText = $m.Groups[1].Value
            $hasGarbled = $false
            foreach ($c in $htmlText.ToCharArray()) {
                if ([int]$c -ge 0xC0 -and [int]$c -le 0xFF) {
                    $hasGarbled = $true
                    break
                }
            }
            if ($hasGarbled) {
                try {
                    $garbledBytes = $latin1.GetBytes($htmlText)
                    $fixed = $utf8.GetString($garbledBytes)
                    if (-not $fixed.Contains([char]0xFFFD) -and $fixed -ne $htmlText) {
                        $newLine = $newLine.Replace('>' + $htmlText + '<', '>' + $fixed + '<')
                        Write-Host "Line $($i+1) HTML: '$htmlText' -> '$fixed'"
                        $changes++
                    }
                } catch {}
            }
        }
        
        $lines[$i] = $newLine
    }
}

Write-Host "`nTotal changes: $changes"

# Write back with UTF-8 BOM
$newContent = $lines -join "`n"
$newBytes = $utf8.GetBytes($newContent)
$bom = [byte[]]@(0xEF, 0xBB, 0xBF)
$allBytes = New-Object byte[] ($bom.Length + $newBytes.Length)
[System.Array]::Copy($bom, 0, $allBytes, 0, $bom.Length)
[System.Array]::Copy($newBytes, 0, $allBytes, $bom.Length, $newBytes.Length)
[System.IO.File]::WriteAllBytes($filePath, $allBytes)

Write-Host "File saved!"
