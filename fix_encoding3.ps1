# Fix remaining garbled Vietnamese messages in client_js.html
# Using explicit string replacements for all notification messages

$filePath = "E:\New folder\Doan\views\client_js.html"
$utf8 = New-Object System.Text.UTF8Encoding($true) # with BOM
$content = [System.IO.File]::ReadAllText($filePath, $utf8)

Write-Host "File loaded: $($content.Length) chars"

# Define all replacements: [garbled, correct]
$replacements = @(
    # Line 409 - login validation
    @('showToast("Vui l' + [char]0xC3 + [char]0xB2 + 'ng nh' + [char]0xE1 + [char]0xBA + [char]0xAD + 'p ' + [char]0xC4 + [char]0x91 + [char]0xE1 + [char]0xBA + [char]0xA7 + 'y ' + [char]0xC4 + [char]0x91 + [char]0xE1 + [char]0xBB + [char]0xA7 + ' th' + [char]0xC3 + [char]0xB4 + 'ng tin", "error")',
      'showToast("Vui lòng nhập đầy đủ thông tin", "error")')
)

# Simpler approach: just do text-level replacements of the specific garbled substrings
$textReplacements = @(
    # Whole phrase replacements (most reliable)
    @('Vui l' + [char]0x00C3 + [char]0x00B2 + 'ng', 'Vui lòng')
)

# Even simpler: read file as bytes, find patterns, replace
# Actually let's just replace specific complete lines

Write-Host "Attempting line-level replacements..."

$lines = $content -split "`n"
$changeCount = 0

for ($i = 0; $i -lt $lines.Length; $i++) {
    $lineNum = $i + 1
    $line = $lines[$i]
    $newLine = $line
    
    # Use line number matching for precision
    switch ($lineNum) {
        409 { $newLine = '      showToast("Vui lòng nhập đầy đủ thông tin", "error");' }
        450 { $newLine = '      showToast("Đăng nhập thành công!", "success");' }
        458 { $newLine = '      showToast(response.message || "Đăng nhập thất bại", "error");' }
        478 { $newLine = '      showToast("Vui lòng điền đầy đủ thông tin", "error");' }
        549 { $newLine = '        showToast("Lỗi: " + error.message, "error");' }
        570 { 
            # Already fixed by previous script, but verify
            if ($line -match 'showToast') {
                $newLine = '      showToast("Vui lòng nhập email và mật khẩu", "error");'
            }
        }
        615 { $newLine = '        showToast("Lỗi: " + error.message, "error");' }
        640 {
            if ($line -match 'showToast') {
                $newLine = '      showToast('
            }
        }
        641 {
            if ($line -match 'error') {
                $newLine = '        "Vui lòng nhập đầy đủ thông tin bắt buộc",'
            }
        }
        648 { $newLine = '      showToast("Tên đăng nhập phải có ít nhất 3 ký tự", "error");' }
        658 { 
            if ($line -match 'showToast') {
                $newLine = '      showToast("Mật khẩu xác nhận không khớp", "error");'
            }
        }
        701 {
            if ($line -match 'showToast') {
                $newLine = '      showToast('
            }
        }
        702 {
            if ($line -match 'success') {
                $newLine = '        "Đăng ký thành công! Đang chuyển tới trang chủ...",'
            }
        }
        712 { 
            if ($line -match 'response.message') {
                $newLine = '      showToast(response.message || "Đăng ký thất bại", "error");'
            }
        }
        759 { 
            if ($line -match 'showToast') {
                $newLine = '      showToast("Đã đăng xuất", "info");'
            }
        }
        761 {
            if ($line -match 'alert') {
                $newLine = '      alert("Đã đăng xuất");'
            }
        }
        831 {
            if ($line -match 'showToast') {
                $newLine = '        showToast('
            }
        }
        876 {
            if ($line -match 'response.message') {
                $newLine = '          showToast('
            }
        }
        886 {
            if ($line -match 'showToast') {
                $newLine = '          showToast('
            }
        }
        900 {
            if ($line -match 'showToast') {
                $newLine = '            showToast("Đăng ký bị hủy", "warning");'
            }
        }
        904 {
            if ($line -match 'response.message') {
                $newLine = '          showToast(response.message || "Đăng nhập thất bại", "error");'
            }
        }
        912 { 
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
        999 {
            if ($line -match 'response.message') {
                $newLine = '          showToast(response.message || "Đăng ký thành công!", "success");'
            }
        }
        1005 {
            if ($line -match 'response.message') {
                $newLine = '          showToast(response.message || "Đăng ký thất bại", "error");'
            }
        }
        1012 {
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
        1278 {
            if ($line -match 'showToast') {
                $newLine = '        showToast("Lỗi khi gửi email: " + error.message, "error");'
            }
        }
        1388 {
            if ($line -match 'showToast') {
                $newLine = '      showToast("Email không hợp lệ", "error");'
            }
        }
        1408 {
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
        1459 {
            if ($line -match 'showToast') {
                $newLine = '          showToast("Lỗi xác thực: " + error.message, "error");'
            }
        }
        1477 {
            if ($line -match 'showToast') {
                $newLine = '      showToast("Vui lòng nhập email hợp lệ", "error");'
            }
        }
        1503 {
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
        1521 {
            if ($line -match 'showToast') {
                $newLine = '      showToast("Vui lòng nhập mã xác thực 6 chữ số", "error");'
            }
        }
        1531 {
            if ($line -match 'showToast') {
                $newLine = '      showToast("Mật khẩu xác nhận không khớp", "error");'
            }
        }
        1558 {
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
        1575 {
            if ($line -match 'showToast') {
                $newLine = '      showToast("Email không hợp lệ", "error");'
            }
        }
        1587 {
            if ($line -match 'showToast') {
                $newLine = '          showToast("Mã xác thực mới đã được gửi!", "success");'
            }
        }
        1595 {
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
        1639 {
            if ($line -match 'showToast') {
                $newLine = '      showToast("Mật khẩu xác nhận không khớp", "error");'
            }
        }
        1663 {
            if ($line -match 'showToast.*error.message') {
                $newLine = '        showToast("Lỗi: " + error.message, "error");'
            }
        }
    }
    
    if ($newLine -ne $line) {
        $lines[$i] = $newLine
        $changeCount++
        Write-Host "Fixed line $lineNum"
    }
}

Write-Host "`nTotal lines fixed: $changeCount"

# Write back
$newContent = $lines -join "`n"
[System.IO.File]::WriteAllText($filePath, $newContent, $utf8)
Write-Host "File saved!"
