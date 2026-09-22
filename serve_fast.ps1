param(
    [string]$Directory = "c:\MDDZ\millionaire-dizital-structured",
    [int]$Port = 8085
)

$rootDir = (Resolve-Path $Directory).Path

$csharpCode = @"
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;

public class FastServer {
    private TcpListener listener;
    private string rootDir;
    private int port;
    private bool running = true;
    private static Dictionary<string, string> mimes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
        { ".html", "text/html; charset=utf-8" },
        { ".htm", "text/html; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" },
        { ".js", "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png", "image/png" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".gif", "image/gif" },
        { ".svg", "image/svg+xml" },
        { ".ico", "image/x-icon" },
        { ".webp", "image/webp" },
        { ".mp4", "video/mp4" },
        { ".mov", "video/quicktime" },
        { ".webm", "video/webm" },
        { ".woff2", "font/woff2" }
    };

    public FastServer(string dir, int p) {
        rootDir = dir;
        port = p;
    }

    public void Start() {
        listener = new TcpListener(IPAddress.Any, port);
        listener.Start();
        Console.WriteLine("=========================================================");
        Console.WriteLine("  MILLIONAIRE DIZITAL MULTI-THREADED SERVER (Port " + port + ")");
        Console.WriteLine("  Website URL: http://localhost:" + port + "/");
        Console.WriteLine("  Admin URL:   http://localhost:" + port + "/admin");
        Console.WriteLine("=========================================================");

        while (running) {
            try {
                TcpClient client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(ProcessClient, client);
            } catch {
                if (!running) break;
            }
        }
    }

    public void Stop() {
        running = false;
        try { listener.Stop(); } catch {}
    }

    private void ProcessClient(object state) {
        TcpClient client = (TcpClient)state;
        try {
            using (NetworkStream stream = client.GetStream()) {
                stream.ReadTimeout = 5000;
                byte[] buffer = new byte[8192];
                int bytesRead = stream.Read(buffer, 0, buffer.Length);
                if (bytesRead <= 0) return;

                string requestString = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                string[] lines = requestString.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                if (lines.Length == 0) return;

                string[] reqParts = lines[0].Split(' ');
                if (reqParts.Length < 2) return;

                string method = reqParts[0].ToUpper();
                string rawUrl = reqParts[1];
                string pathOnly = rawUrl.Split('?')[0];

                if (method == "OPTIONS") {
                    string opt = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Authorization, Content-Type\r\nConnection: close\r\n\r\n";
                    byte[] optB = Encoding.ASCII.GetBytes(opt);
                    stream.Write(optB, 0, optB.Length);
                    return;
                }

                // API Mocks / Responses for Local Admin
                if (pathOnly.StartsWith("/api/admin/")) {
                    string endpoint = pathOnly.Substring("/api/admin/".Length).TrimEnd('/');
                    string json = "{}";
                    int status = 200;

                    if (endpoint == "login") {
                        json = "{\"success\":true,\"token\":\"local_dev_token_12345\",\"message\":\"Login successful\"}";
                    } else if (endpoint == "check-auth") {
                        json = "{\"authenticated\":true}";
                    } else if (endpoint == "stats") {
                        json = "{\"total_images\":32,\"total_videos\":14,\"total_media_files\":46,\"total_backups\":0,\"active_sessions\":1}";
                    } else if (endpoint == "media") {
                        string manifestPath = Path.Combine(rootDir, "media-manifest.json");
                        if (File.Exists(manifestPath)) {
                            json = File.ReadAllText(manifestPath, Encoding.UTF8);
                        } else {
                            json = "{\"slots\":[]}";
                        }
                    } else if (endpoint == "history") {
                        json = "{\"slot_id\":\"\",\"history\":[]}";
                    } else if (endpoint == "revert") {
                        json = "{\"success\":true,\"message\":\"Restored backup locally.\"}";
                    }

                    byte[] jsonB = Encoding.UTF8.GetBytes(json);
                    string hdr = "HTTP/1.1 " + (status == 200 ? "200 OK" : "400 Bad Request") + "\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + jsonB.Length + "\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                    byte[] hdrB = Encoding.ASCII.GetBytes(hdr);
                    stream.Write(hdrB, 0, hdrB.Length);
                    stream.Write(jsonB, 0, jsonB.Length);
                    return;
                }

                // Static Files
                string cleanPath = Uri.UnescapeDataString(pathOnly).TrimStart('/').Replace('/', '\\');
                if (string.IsNullOrEmpty(cleanPath) || cleanPath.Equals("admin", StringComparison.OrdinalIgnoreCase)) {
                    cleanPath = cleanPath.Equals("admin", StringComparison.OrdinalIgnoreCase) ? "admin.html" : "index.html";
                }

                string fullPath = Path.Combine(rootDir, cleanPath);
                if (Directory.Exists(fullPath)) {
                    fullPath = Path.Combine(fullPath, "index.html");
                }
                if (!File.Exists(fullPath) && File.Exists(fullPath + ".html")) {
                    fullPath = fullPath + ".html";
                }

                if (File.Exists(fullPath)) {
                    string ext = Path.GetExtension(fullPath);
                    string mime = "application/octet-stream";
                    if (mimes.ContainsKey(ext)) {
                        mime = mimes[ext];
                    }

                    FileInfo fi = new FileInfo(fullPath);
                    long fileLen = fi.Length;

                    string hdr = "HTTP/1.1 200 OK\r\nContent-Type: " + mime + "\r\nContent-Length: " + fileLen + "\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                    byte[] hdrB = Encoding.ASCII.GetBytes(hdr);
                    stream.Write(hdrB, 0, hdrB.Length);

                    using (FileStream fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                        byte[] fileBuf = new byte[65536];
                        int r;
                        while ((r = fs.Read(fileBuf, 0, fileBuf.Length)) > 0) {
                            stream.Write(fileBuf, 0, r);
                        }
                    }
                } else {
                    string nf = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found";
                    byte[] nfB = Encoding.ASCII.GetBytes(nf);
                    stream.Write(nfB, 0, nfB.Length);
                }
            }
        } catch {
        } finally {
            try { client.Close(); } catch {}
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -Language CSharp
$srv = New-Object FastServer $rootDir, $Port
$srv.Start()
