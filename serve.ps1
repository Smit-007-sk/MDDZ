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

$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any), $Port
$listener.Start()

Write-Host "========================================================="
Write-Host "  MILLIONAIRE DIZITAL LOCAL SERVER STARTED (Port $Port)"
Write-Host "  Website URL: http://localhost:$Port/"
Write-Host "  Admin URL:   http://localhost:$Port/admin"
Write-Host "========================================================="

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 4000
            $buffer = New-Object byte[] 65536
            $read = $stream.Read($buffer, 0, $buffer.Length)
            if ($read -gt 0) {
                $rawReq = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
                $firstLine = $rawReq.Split("`r`n")[0]
                $parts = $firstLine.Split(" ")
                if ($parts.Length -ge 2) {
                    $httpMethod = $parts[0].ToUpper()
                    $rawUrl = $parts[1]
                    $urlPath = $rawUrl.Split("?")[0]
                    $queryString = if ($rawUrl.Contains("?")) { $rawUrl.Split("?")[1] } else { "" }

                    if ($httpMethod -eq "OPTIONS") {
                        $hdr = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Authorization, Content-Type`r`nConnection: close`r`n`r`n"
                        $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
                        $stream.Write($hb, 0, $hb.Length)
                        $stream.Flush()
                        continue
                    }

                    # -------------------------------------------------------------
                    # API ENDPOINTS
                    # -------------------------------------------------------------
                    if ($urlPath.StartsWith("/api/admin/")) {
                        $endpoint = $urlPath.Substring("/api/admin/".Length).TrimEnd('/')
                        $jsonResp = ""
                        $statusCode = 200

                        if ($endpoint -eq "login" -and $httpMethod -eq "POST") {
                            $bodyIdx = $rawReq.IndexOf("`r`n`r`n")
                            $body = if ($bodyIdx -ge 0) { $rawReq.Substring($bodyIdx + 4) } else { "{}" }
                            try {
                                $bodyJson = $body | ConvertFrom-Json
                                $cfg = Get-AdminConfig
                                $inputHash = Get-Sha256 $bodyJson.password
                                if ($inputHash -eq $cfg.auth.password_hash) {
                                    $token = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
                                    $sessions[$token] = [DateTime]::UtcNow
                                    $jsonResp = @{ success = $true; token = $token; message = "Login successful" } | ConvertTo-Json
                                } else {
                                    $statusCode = 401
                                    $jsonResp = '{"error":"Invalid administrator password"}'
                                }
                            } catch {
                                $statusCode = 400
                                $jsonResp = '{"error":"Bad request"}'
                            }
                        }
                        elseif ($endpoint -eq "check-auth") {
                            $authHeader = ""
                            foreach ($line in $rawReq.Split("`r`n")) {
                                if ($line.StartsWith("Authorization:", [System.StringComparison]::OrdinalIgnoreCase)) {
                                    $authHeader = $line.Substring(14).Trim()
                                }
                            }
                            $token = ""
                            if ($authHeader.StartsWith("Bearer ")) {
                                $token = $authHeader.Substring(7).Trim()
                            }
                            $isAuthed = ($token -ne "" -and $sessions.ContainsKey($token))
                            $jsonResp = @{ authenticated = $isAuthed } | ConvertTo-Json
                        }
                        elseif ($endpoint -eq "media") {
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
                            $jsonResp = @{ slots = $slotsData; total_slots = $slotsData.Count } | ConvertTo-Json -Depth 5
                        }
                        elseif ($endpoint -eq "history") {
                            $slotId = ""
                            foreach ($pair in $queryString.Split("&")) {
                                if ($pair.StartsWith("slot_id=")) { $slotId = $pair.Substring(8) }
                            }
                            $history = Get-SlotHistory $slotId
                            $jsonResp = @{ slot_id = $slotId; history = $history } | ConvertTo-Json -Depth 5
                        }
                        elseif ($endpoint -eq "stats") {
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
                            $jsonResp = @{
                                total_images = $totalImg
                                total_videos = $totalVdo
                                total_media_files = $totalImg + $totalVdo
                                total_backups = $backupsCount
                                active_sessions = $sessions.Count
                            } | ConvertTo-Json
                        }
                        elseif ($endpoint -eq "revert" -and $httpMethod -eq "POST") {
                            $bodyIdx = $rawReq.IndexOf("`r`n`r`n")
                            $body = if ($bodyIdx -ge 0) { $rawReq.Substring($bodyIdx + 4) } else { "{}" }
                            try {
                                $bodyJson = $body | ConvertFrom-Json
                                $slotId = $bodyJson.slot_id
                                $backupFile = $bodyJson.backup_filename
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
                                        $jsonResp = @{ success = $true; message = "Successfully reverted '$slotId' to version '$backupFile'." } | ConvertTo-Json
                                    } else {
                                        $statusCode = 404
                                        $jsonResp = '{"error":"Backup version not found"}'
                                    }
                                } else {
                                    $statusCode = 404
                                    $jsonResp = '{"error":"Slot not found"}'
                                }
                            } catch {
                                $statusCode = 500
                                $jsonResp = '{"error":"Failed to revert"}'
                            }
                        }
                        else {
                            $statusCode = 404
                            $jsonResp = '{"error":"Endpoint not found"}'
                        }

                        $respBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonResp)
                        $statusText = if ($statusCode -eq 200) { "200 OK" } elseif ($statusCode -eq 401) { "401 Unauthorized" } elseif ($statusCode -eq 404) { "404 Not Found" } else { "400 Bad Request" }
                        $header = "HTTP/1.1 $statusText`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                        $stream.Write($headerBytes, 0, $headerBytes.Length)
                        $stream.Write($respBytes, 0, $respBytes.Length)
                        $stream.Flush()
                        continue
                    }

                    # -------------------------------------------------------------
                    # STATIC FILE SERVING
                    # -------------------------------------------------------------
                    $relPath = [System.Uri]::UnescapeDataString($urlPath).TrimStart("/").Replace("/", "\")
                    if ([string]::IsNullOrWhiteSpace($relPath) -or $relPath -eq "admin") {
                        $relPath = if ($relPath -eq "admin") { "admin.html" } else { "index.html" }
                    }

                    $fullPath = [System.IO.Path]::Combine($rootDir, $relPath)
                    if ([System.IO.Directory]::Exists($fullPath)) { $fullPath = [System.IO.Path]::Combine($fullPath, "index.html") }
                    if (-not [System.IO.File]::Exists($fullPath) -and [System.IO.File]::Exists($fullPath + ".html")) { $fullPath += ".html" }

                    if ([System.IO.File]::Exists($fullPath)) {
                        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                        $mime = $mimes[$ext]
                        if (-not $mime) { $mime = "application/octet-stream" }

                        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                        $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)

                        $stream.Write($headerBytes, 0, $headerBytes.Length)
                        $stream.Write($bytes, 0, $bytes.Length)
                        $stream.Flush()
                    } else {
                        $nf = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found"
                        $nfBytes = [System.Text.Encoding]::ASCII.GetBytes($nf)
                        $stream.Write($nfBytes, 0, $nfBytes.Length)
                        $stream.Flush()
                    }
                }
            }
        } catch {
            # Ignore transient socket drops
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
