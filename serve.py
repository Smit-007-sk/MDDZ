#!/usr/bin/env python3
"""
MILLIONAIRE DIZITAL — Multi-Threaded Production Server
Fast concurrent static asset streaming with zero blocking.
Compatible with Linux (VPS), macOS, and Windows.
"""

import http.server
import socketserver
import os
import sys
import urllib.parse
import mimetypes

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8085))

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.isdir(os.path.join(CURRENT_DIR, "millionaire-dizital-structured")):
    DIRECTORY = os.path.join(CURRENT_DIR, "millionaire-dizital-structured")
else:
    DIRECTORY = CURRENT_DIR

# Ensure proper MIME types for modern web assets
mimetypes.init()
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        try:
            parsed_path = urllib.parse.urlparse(self.path).path
            clean_path = urllib.parse.unquote(parsed_path).lstrip('/')
            if not clean_path:
                clean_path = 'index.html'

            full_path = os.path.join(DIRECTORY, clean_path)

            if os.path.isdir(full_path):
                index_file = os.path.join(full_path, 'index.html')
                if os.path.isfile(index_file):
                    self.path = parsed_path.rstrip('/') + '/index.html'
            elif not os.path.exists(full_path) and os.path.exists(full_path + '.html'):
                self.path = parsed_path + '.html'
            elif not os.path.exists(full_path):
                # Check root directory fallback if requested from structured subfolder
                alt_path = os.path.join(CURRENT_DIR, clean_path)
                if os.path.isfile(alt_path):
                    self.directory = CURRENT_DIR

            return super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, max-age=3600' if any(self.path.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp4', '.woff2']) else 'no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {self.address_string()} - {format % args}\n")

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    print("========================================================")
    print(f"  MILLIONAIRE DIZITAL Multi-Threaded Server on Port {PORT}")
    print(f"  Serving Directory: {DIRECTORY}")
    print("========================================================")
    httpd = ThreadingServer(("0.0.0.0", PORT), CustomHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()
