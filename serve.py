#!/usr/bin/env python3
"""
MILLIONAIRE DIZITAL — Universal Static Web Server
Compatible with Linux (VPS), macOS, and Windows.
"""

import http.server
import socketserver
import os
import sys
import urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8085))

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.isdir(os.path.join(CURRENT_DIR, "millionaire-dizital-structured")):
    DIRECTORY = os.path.join(CURRENT_DIR, "millionaire-dizital-structured")
else:
    DIRECTORY = CURRENT_DIR

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
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

        return super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    print(f"Serving {DIRECTORY} at http://0.0.0.0:{PORT}")
    with socketserver.TCPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
        httpd.serve_forever()
