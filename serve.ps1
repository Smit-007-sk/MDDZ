param(
    [string]$Directory = "c:\MDDZ\millionaire-dizital-structured",
    [int]$Port = 8085
)

$rootDir = (Resolve-Path $Directory).Path
$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any), $Port
$listener.Start()
Write-Host "SERVER_STARTED: http://localhost:$Port"

$mimes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
    ".mp4"  = "video/mp4"
    ".webm" = "video/webm"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 4000
            $buffer = New-Object byte[] 8192
            $read = $stream.Read($buffer, 0, $buffer.Length)
            if ($read -gt 0) {
                $req = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
                $firstLine = $req.Split("`r`n")[0]
                $parts = $firstLine.Split(" ")
                if ($parts.Length -ge 2) {
                    $rawUrl = $parts[1].Split("?")[0]
                    $relPath = [System.Uri]::UnescapeDataString($rawUrl).TrimStart("/").Replace("/", "\")
                    if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = "index.html" }

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
            # Ignore individual client connection aborts
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
