# Fix double-encoded UTF-8 in client_js.html
# The file has UTF-8 text that was double-encoded (UTF-8 decoded as Latin-1, then re-encoded as UTF-8)

$filePath = "E:\New folder\Doan\views\client_js.html"

# Read raw bytes
$bytes = [System.IO.File]::ReadAllBytes($filePath)

# Skip BOM (EF BB BF)
$startIdx = 0
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $startIdx = 3
    Write-Host "BOM detected, skipping..."
}

# Decode as UTF-8 to get the text
$utf8 = [System.Text.Encoding]::UTF8
$content = $utf8.GetString($bytes, $startIdx, $bytes.Length - $startIdx)

Write-Host "File loaded: $($content.Length) characters"

# Define replacements: garbled -> correct
# We need to match the exact Unicode characters in the garbled text
# Strategy: Use [char] codes to build the exact garbled strings

# Helper: Build string from char codes
function Build-GarbledString {
    param([int[]]$codes)
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $codes) {
        [void]$sb.Append([char]$c)
    }
    return $sb.ToString()
}

# Map of replacements (plain text since we read as UTF-8)
# The garbled patterns come from UTF-8 bytes interpreted as Latin-1
# Example: "ò" (U+00F2) in UTF-8 = C3 B2
#   When decoded as Latin-1: C3=Ã, B2=² → "Ã²" 
#   When re-encoded as UTF-8: Ã=C3 83, ²=C2 B2

# Let's try a systematic approach: find all showToast lines and check if they have garbled chars
$lines = $content -split "`n"
$changes = 0

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $origLine = $line
    
    # Check if line contains showToast or alert with garbled text
    # Garbled indicator: contains sequences like Ã followed by special chars, or Ä
    if ($line -match 'showToast|alert|prompt|confirm' -and $line -match '[\xC0-\xC5][\x80-\xBF]|[\xC3][\x80-\xBF]') {
        
        # Try to fix by re-encoding: treat the garbled Unicode chars as Latin-1 bytes, then decode as UTF-8
        # Extract the string content between quotes
        if ($line -match '"([^"]*[\xC0-\xFF][^"]*)"') {
            $garbled = $Matches[1]
            try {
                # Convert Unicode string to Latin-1 bytes (reverse the second encoding)
                $latin1 = [System.Text.Encoding]::GetEncoding("ISO-8859-1")
                $garbledBytes = $latin1.GetBytes($garbled)
                # Decode those bytes as UTF-8 (the original encoding)
                $fixed = $utf8.GetString($garbledBytes)
                
                if ($fixed -ne $garbled) {
                    $line = $line.Replace($garbled, $fixed)
                    Write-Host "Line $($i+1): Fixed '$garbled' -> '$fixed'"
                    $changes++
                }
            } catch {
                # Skip if conversion fails
            }
        }
        
        # Check for additional garbled strings in same line (e.g., fallback messages after ||)
        while ($line -ne $origLine -or $true) {
            $tempLine = $line
            if ($line -match '"([^"]*[\xC0-\xFF][^"]*)"') {
                $garbled = $Matches[1]
                try {
                    $latin1 = [System.Text.Encoding]::GetEncoding("ISO-8859-1")
                    $garbledBytes = $latin1.GetBytes($garbled)
                    $fixed = $utf8.GetString($garbledBytes)
                    
                    if ($fixed -ne $garbled) {
                        $line = $line.Replace($garbled, $fixed)
                        Write-Host "  Also fixed: '$garbled' -> '$fixed'"
                        $changes++
                    } else {
                        break
                    }
                } catch {
                    break
                }
            } else {
                break
            }
            if ($line -eq $tempLine) { break }
        }
    }
    
    # Also fix resend banner HTML text
    if ($line -match 'resend-verification-banner|Gá»­i|KhÃ´ng nh' -and $line -match '[\xC0-\xC5][\x80-\xBF]|[\xC3][\x80-\xBF]') {
        if ($line -match '"([^"]*[\xC0-\xFF][^"]*)"' -or $line -match '>([^<]*[\xC0-\xFF][^<]*)<') {
            foreach ($match in [regex]::Matches($line, '(?<=>)([^<]*[\xC0-\xFF][^<]*)(?=<)|"([^"]*[\xC0-\xFF][^"]*)"')) {
                $garbled = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
                try {
                    $latin1 = [System.Text.Encoding]::GetEncoding("ISO-8859-1")
                    $garbledBytes = $latin1.GetBytes($garbled)
                    $fixed = $utf8.GetString($garbledBytes)
                    
                    if ($fixed -ne $garbled) {
                        $line = $line.Replace($garbled, $fixed)
                        Write-Host "Line $($i+1) HTML: Fixed '$garbled' -> '$fixed'"
                        $changes++
                    }
                } catch {}
            }
        }
    }
    
    $lines[$i] = $line
}

Write-Host "`nTotal changes: $changes"

# Write back with BOM
$newContent = $lines -join "`n"
$newBytes = $utf8.GetBytes($newContent)
$bom = @([byte]0xEF, [byte]0xBB, [byte]0xBF)
$allBytes = $bom + $newBytes
[System.IO.File]::WriteAllBytes($filePath, $allBytes)

Write-Host "File saved!"
