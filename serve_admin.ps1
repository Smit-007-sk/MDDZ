param(
    [string]$Directory = "c:\MDDZ\millionaire-dizital-structured",
    [int]$Port = 8085
)

$rootDir = (Resolve-Path $Directory).Path
$configPath = Join-Path $rootDir "admin-config.json"
$manifestPath = Join-Path $rootDir "media-manifest.json"
$backupDir = Join-Path $rootDir "archive\backups"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$sessions = @{}

function Get-AdminConfig {
    if (Test-Path $configPath) {
        return (Get-Content -Raw -Encoding UTF8 $configPath | ConvertFrom-Json)
    }
    return [PSCustomObject]@{
        auth = [PSCustomObject]@{
            password_hash = "e674997034cf944439c636f3fa14c7c8ec1d7e22119ae4b64e5be7d47e4eb178"
            session_timeout_hours = 72
        }
    }
}

function Save-AdminConfig($cfg) {
    $json = $cfg | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($configPath, $json, [System.Text.Encoding]::UTF8)
}

function Get-MediaManifest {
    if (Test-Path $manifestPath) {
        return (Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json)
    }
    return [PSCustomObject]@{ slots = @() }
}

function Save-MediaManifest($mnf) {
    $json = $mnf | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($manifestPath, $json, [System.Text.Encoding]::UTF8)
}

function Get-Sha256($str) {
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($str)
    $hash = $hasher.ComputeHash($bytes)
    return -join ($hash | ForEach-Object { "{0:x2}" -f $_ })
}

function Format-Size($bytes) {
    if ($bytes -lt 1024) { return "$bytes B" }
    elseif ($bytes -lt 1048576) { return "$("{0:N1}" -f ($bytes/1KB)) KB" }
    elseif ($bytes -lt 1073741824) { return "$("{0:N1}" -f ($bytes/1MB)) MB" }
    else { return "$("{0:N2}" -f ($bytes/1GB)) GB" }
}

function Get-SlotHistory($slotId) {
    $slotDir = Join-Path $backupDir $slotId
    $history = @()
    if (Test-Path $slotDir) {
        $files = Get-ChildItem -Path $slotDir -File | Sort-Object LastWriteTime -Descending
        foreach ($f in $files) {
            $history += [PSCustomObject]@{
                filename = $f.Name
                rel_url = "archive/backups/$slotId/$($f.Name)"
                size_bytes = $f.Length
                size_formatted = Format-Size $f.Length
                modified_formatted = $f.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    }
    return $history
}

$mimes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
    ".mp4"  = "video/mp4"
    ".mov"  = "video/quicktime"
    ".webm" = "video/webm"
    ".woff2"= "font/woff2"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host "========================================================="
Write-Host "  MILLIONAIRE DIZITAL LOCAL SERVER STARTED (Port $Port)"
Write-Host "  Website URL: http://localhost:$Port/"
Write-Host "  Admin URL:   http://localhost:$Port/admin"
Write-Host "========================================================="

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $rawPath = $request.Url.AbsolutePath

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        # ---------------------------------------------------------------------
        # API ENDPOINTS
        # ---------------------------------------------------------------------
        if ($rawPath.StartsWith("/api/admin/")) {
            $endpoint = $rawPath.Substring("/api/admin/".Length)
            $response.ContentType = "application/json; charset=utf-8"

            if ($endpoint -eq "login" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $cfg = Get-AdminConfig
                $inputHash = Get-Sha256 $body.password

                if ($inputHash -eq $cfg.auth.password_hash) {
                    $token = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
                    $sessions[$token] = [DateTime]::UtcNow
                    $resData = @{ success = $true; token = $token; message = "Login successful" }
                    $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json))
                    $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                } else {
                    $response.StatusCode = 401
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Invalid password"}')
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.Close()
                continue
            }

            # Auth Verification
            $authHeader = $request.Headers["Authorization"]
            $token = ""
            if ($authHeader -and $authHeader.StartsWith("Bearer ")) {
                $token = $authHeader.Substring("Bearer ".Length).Trim()
            }
            $isAuthed = ($token -ne "" -and $sessions.ContainsKey($token))

            if ($endpoint -eq "check-auth") {
                $resData = @{ authenticated = $isAuthed }
                $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json))
                $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                $response.Close()
                continue
            }

            if (-not $isAuthed) {
                $response.StatusCode = 401
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Unauthorized"}')
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.Close()
                continue
            }

            if ($endpoint -eq "media") {
                $manifest = Get-MediaManifest
                $slotsData = @()
                foreach ($s in $manifest.slots) {
                    $fullPath = Join-Path $rootDir ($s.path.Replace('/', '\'))
                    $exists = Test-Path $fullPath
                    $sizeFormatted = "0 B"
                    $mtime = "Never"
                    if ($exists) {
                        $item = Get-Item $fullPath
                        $sizeFormatted = Format-Size $item.Length
                        $mtime = $item.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                    }
                    $history = Get-SlotHistory $s.id
                    $slotsData += @{
                        id = $s.id
                        name = $s.name
                        category = $s.category
                        type = $s.type
                        path = $s.path
                        description = $s.description
                        recommended = $s.recommended
                        exists = $exists
                        size_formatted = $sizeFormatted
                        modified = $mtime
                        preview_url = "$($s.path)?v=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
                        history_count = $history.Count
                        history = $history
                    }
                }
                $resData = @{ slots = $slotsData; total_slots = $slotsData.Count }
                $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json -Depth 5))
                $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                $response.Close()
                continue
            }

            if ($endpoint -eq "history") {
                $slotId = $request.QueryString["slot_id"]
                $history = Get-SlotHistory $slotId
                $resData = @{ slot_id = $slotId; history = $history }
                $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json -Depth 5))
                $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                $response.Close()
                continue
            }

            if ($endpoint -eq "stats") {
                $imagesDir = Join-Path $rootDir "images"
                $totalImg = 0
                $totalVdo = 0
                if (Test-Path $imagesDir) {
                    $allFiles = Get-ChildItem -Path $imagesDir -Recurse -File
                    foreach ($f in $allFiles) {
                        $ext = $f.Extension.ToLower()
                        if ($ext -in @('.mp4', '.mov', '.webm')) { $totalVdo++ }
                        elseif ($ext -in @('.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif')) { $totalImg++ }
                    }
                }
                $backupsCount = 0
                if (Test-Path $backupDir) {
                    $backupsCount = (Get-ChildItem -Path $backupDir -Recurse -File).Count
                }
                $resData = @{
                    total_images = $totalImg
                    total_videos = $totalVdo
                    total_media_files = $totalImg + $totalVdo
                    total_backups = $backupsCount
                    active_sessions = $sessions.Count
                }
                $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json))
                $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                $response.Close()
                continue
            }

            if ($endpoint -eq "revert" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $slotId = $body.slot_id
                $backupFile = $body.backup_filename

                $manifest = Get-MediaManifest
                $slot = $manifest.slots | Where-Object { $_.id -eq $slotId } | Select-Object -First 1

                if ($slot) {
                    $fullTarget = Join-Path $rootDir ($slot.path.Replace('/', '\'))
                    $sourceBackup = Join-Path (Join-Path $backupDir $slotId) $backupFile

                    if (Test-Path $sourceBackup) {
                        if (Test-Path $fullTarget) {
                            $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
                            $curBase = [System.IO.Path]::GetFileName($fullTarget)
                            Copy-Item $fullTarget (Join-Path (Join-Path $backupDir $slotId) "$ts`_before_revert_$curBase") -Force
                        }
                        Copy-Item $sourceBackup $fullTarget -Force
                        $resData = @{ success = $true; message = "Successfully reverted '$slotId' to version '$backupFile'." }
                        $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json))
                        $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                    } else {
                        $response.StatusCode = 404
                        $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Backup version not found"}')
                        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    }
                } else {
                    $response.StatusCode = 404
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Slot not found"}')
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.Close()
                continue
            }

            if ($endpoint -eq "change-password" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $cfg = Get-AdminConfig
                if ((Get-Sha256 $body.current_password) -eq $cfg.auth.password_hash) {
                    $cfg.auth.password_hash = Get-Sha256 $body.new_password
                    Save-AdminConfig $cfg
                    $resData = @{ success = $true; message = "Password updated successfully" }
                    $outBytes = [System.Text.Encoding]::UTF8.GetBytes(($resData | ConvertTo-Json))
                    $response.OutputStream.Write($outBytes, 0, $outBytes.Length)
                } else {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Current password incorrect"}')
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.Close()
                continue
            }
        }

        # ---------------------------------------------------------------------
        # STATIC FILE SERVING
        # ---------------------------------------------------------------------
        $cleanPath = $rawPath.TrimStart("/").Replace("/", "\")
        if ($cleanPath -eq "" -or $cleanPath -eq "admin") {
            $cleanPath = if ($cleanPath -eq "admin") { "admin.html" } else { "index.html" }
        }

        $fullPath = Join-Path $rootDir $cleanPath
        if (Test-Path $fullPath -PathType Container) {
            $fullPath = Join-Path $fullPath "index.html"
        }
        if (-not (Test-Path $fullPath) -and (Test-Path "$fullPath.html")) {
            $fullPath = "$fullPath.html"
        }

        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = $mimes[$ext]
            if (-not $mime) { $mime = "application/octet-stream" }
            $response.ContentType = $mime

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
