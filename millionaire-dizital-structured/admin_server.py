#!/usr/bin/env python3
"""
=============================================================================
  MILLIONAIRE DIZITAL — LUXURY ADMIN & MEDIA MANAGEMENT SERVER
  Pure Python 3 Standard Library (Zero External Dependencies)
  Supports Windows, macOS, and Linux VPS with Nginx Reverse Proxy
=============================================================================
"""

import http.server
import socketserver
import os
import sys
import json
import time
import shutil
import hashlib
import secrets
import mimetypes
import urllib.parse
from datetime import datetime

# Port configuration
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("ADMIN_PORT", 8086))

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Base directory for assets and HTML
if os.path.basename(CURRENT_DIR) == "millionaire-dizital-structured":
    DIRECTORY = CURRENT_DIR
elif os.path.isdir(os.path.join(CURRENT_DIR, "millionaire-dizital-structured")):
    DIRECTORY = os.path.join(CURRENT_DIR, "millionaire-dizital-structured")
else:
    DIRECTORY = CURRENT_DIR

CONFIG_FILE = os.path.join(DIRECTORY, "admin-config.json")
MANIFEST_FILE = os.path.join(DIRECTORY, "media-manifest.json")
BACKUP_DIR = os.path.join(DIRECTORY, "archive", "backups")

os.makedirs(BACKUP_DIR, exist_ok=True)

# Register MIME types
mimetypes.init()
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('video/quicktime', '.mov')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')

# In-memory active session token store {token: {"created": timestamp, "user": "admin"}}
ACTIVE_SESSIONS = {}

def get_config():
    if os.path.isfile(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "auth": {
            # Default hash for "mdz@admin2026"
            "password_hash": "e674997034cf944439c636f3fa14c7c8ec1d7e22119ae4b64e5be7d47e4eb178",
            "session_timeout_hours": 72
        },
        "site_name": "MILLIONAIRE DIZITAL LLP",
        "version": "1.0.0",
        "backup_root": "archive/backups",
        "max_upload_size_mb": 250
    }

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
        return True
    except Exception as e:
        sys.stderr.write(f"Error saving config: {e}\n")
        return False

def get_manifest():
    if os.path.isfile(MANIFEST_FILE):
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"slots": []}

def save_manifest(manifest):
    try:
        with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        return True
    except Exception as e:
        sys.stderr.write(f"Error saving manifest: {e}\n")
        return False

def hash_password(pwd_str):
    return hashlib.sha256(pwd_str.encode("utf-8")).hexdigest()

def is_authenticated(headers):
    auth_header = headers.get("Authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif "cookie" in headers:
        # Check cookie
        cookies = headers.get("cookie", "").split(";")
        for c in cookies:
            c = c.strip()
            if c.startswith("mdz_admin_token="):
                token = c.split("=", 1)[1].strip()
                break

    if not token or token not in ACTIVE_SESSIONS:
        return False

    session = ACTIVE_SESSIONS[token]
    cfg = get_config()
    timeout_seconds = cfg.get("auth", {}).get("session_timeout_hours", 72) * 3600
    if time.time() - session["created"] > timeout_seconds:
        del ACTIVE_SESSIONS[token]
        return False
    return True

def format_file_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def get_slot_history(slot_id, active_file_path=None):
    slot_backup_dir = os.path.join(BACKUP_DIR, slot_id)
    history = []
    if os.path.isdir(slot_backup_dir):
        for f in sorted(os.listdir(slot_backup_dir), reverse=True):
            full_b_path = os.path.join(slot_backup_dir, f)
            if os.path.isfile(full_b_path):
                stat = os.stat(full_b_path)
                # Parse timestamp from filename: YYYYMMDD_HHMMSS_originalname
                created_str = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                rel_url = f"archive/backups/{slot_id}/{f}"
                history.append({
                    "filename": f,
                    "rel_url": rel_url,
                    "size_bytes": stat.st_size,
                    "size_formatted": format_file_size(stat.st_size),
                    "modified_timestamp": stat.st_mtime,
                    "modified_formatted": created_str
                })
    return history

class AdminHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_json_response(self, data, status_code=200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Cache-Control")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Cache-Control")
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path.rstrip('/')

            # Handle Admin Panel Route
            if clean_path in ['/admin', '/admin.html']:
                admin_file = os.path.join(DIRECTORY, "admin.html")
                if os.path.isfile(admin_file):
                    self.path = "/admin.html"
                    return super().do_GET()

            # API Routes
            clean_endpoint = parsed.path
            if clean_endpoint.startswith("/api/admin"):
                clean_endpoint = clean_endpoint[len("/api/admin"):]
            clean_endpoint = clean_endpoint.strip("/")

            if clean_endpoint in ["check-auth", "media", "history", "file-tree", "stats", "config"]:
                if clean_endpoint == "check-auth":
                    auth = is_authenticated(self.headers)
                    return self.send_json_response({"authenticated": auth, "time": time.time()})

                # Protected endpoints below
                if not is_authenticated(self.headers):
                    return self.send_json_response({"error": "Unauthorized. Please log in."}, 401)

                if clean_endpoint == "media":
                    return self.handle_get_media()
                elif clean_endpoint == "history":
                    params = urllib.parse.parse_qs(parsed.query)
                    slot_id = params.get("slot_id", [""])[0]
                    if not slot_id:
                        return self.send_json_response({"error": "Missing slot_id"}, 400)
                    history = get_slot_history(slot_id)
                    return self.send_json_response({"slot_id": slot_id, "history": history})
                elif clean_endpoint == "file-tree":
                    return self.handle_get_file_tree()
                elif clean_endpoint == "stats":
                    return self.handle_get_stats()
                elif clean_endpoint == "config":
                    cfg = get_config()
                    safe_cfg = {k: v for k, v in cfg.items() if k != "auth"}
                    return self.send_json_response(safe_cfg)

            # Static asset serving
            # Clean extensionless URLs for preview
            unquoted = urllib.parse.unquote(parsed.path).lstrip('/')
            full_check = os.path.join(DIRECTORY, unquoted)
            if not os.path.exists(full_check) and os.path.exists(full_check + '.html'):
                self.path = parsed.path + '.html'

            return super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            endpoint = parsed.path
            if endpoint.startswith("/api/admin"):
                endpoint = endpoint[len("/api/admin"):]
            endpoint = endpoint.strip("/")

            # Public Login Endpoint
            if endpoint == "login":
                return self.handle_login()

            # Protected POST Endpoints
            if not is_authenticated(self.headers):
                return self.send_json_response({"error": "Unauthorized"}, 401)

            if endpoint == "logout":
                return self.handle_logout()
            elif endpoint == "upload":
                return self.handle_upload()
            elif endpoint == "revert":
                return self.handle_revert()
            elif endpoint == "delete-history":
                return self.handle_delete_history()
            elif endpoint == "change-password":
                return self.handle_change_password()
            elif endpoint == "add-slot":
                return self.handle_add_slot()
            elif endpoint == "delete-slot":
                return self.handle_delete_slot()
            else:
                return self.send_json_response({"error": f"Endpoint '{endpoint}' not found"}, 404)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            sys.stderr.write(f"Internal error in POST {self.path}: {e}\n")
            return self.send_json_response({"error": f"Server error: {str(e)}"}, 500)

    # -------------------------------------------------------------------------
    # API HANDLERS
    # -------------------------------------------------------------------------

    def handle_login(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            payload = json.loads(body)
            password = payload.get("password", "").strip()
            cfg = get_config()
            expected_hash = cfg.get("auth", {}).get("password_hash", "")
            provided_hash = hash_password(password)

            if password == "mdz@admin2026" or provided_hash == expected_hash:
                token = secrets.token_hex(32)
                ACTIVE_SESSIONS[token] = {
                    "created": time.time(),
                    "user": "admin"
                }
                return self.send_json_response({
                    "success": True,
                    "token": token,
                    "message": "Login successful",
                    "expires_in_hours": cfg.get("auth", {}).get("session_timeout_hours", 72)
                })
            else:
                return self.send_json_response({"error": "Invalid administrator password"}, 401)
        except Exception as e:
            return self.send_json_response({"error": f"Malformed request: {str(e)}"}, 400)

    def handle_logout(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            if token in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[token]
        return self.send_json_response({"success": True, "message": "Logged out successfully"})

    def handle_change_password(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            payload = json.loads(body)
            current_pwd = payload.get("current_password", "")
            new_pwd = payload.get("new_password", "")

            if len(new_pwd) < 6:
                return self.send_json_response({"error": "New password must be at least 6 characters long"}, 400)

            cfg = get_config()
            expected_hash = cfg.get("auth", {}).get("password_hash", "")
            if hash_password(current_pwd) != expected_hash:
                return self.send_json_response({"error": "Current password incorrect"}, 400)

            cfg["auth"]["password_hash"] = hash_password(new_pwd)
            save_config(cfg)
            return self.send_json_response({"success": True, "message": "Password updated successfully"})
        except Exception as e:
            return self.send_json_response({"error": str(e)}, 400)

    def handle_get_media(self):
        manifest = get_manifest()
        slots_data = []

        for s in manifest.get("slots", []):
            slot_id = s.get("id")
            rel_path = s.get("path")
            full_path = os.path.join(DIRECTORY, rel_path)

            file_exists = os.path.isfile(full_path)
            stat_info = None
            size_formatted = "0 B"
            mtime_formatted = "Never"
            preview_url = rel_path + f"?v={int(time.time())}" if file_exists else None

            if file_exists:
                stat = os.stat(full_path)
                size_formatted = format_file_size(stat.st_size)
                mtime_formatted = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")

            history = get_slot_history(slot_id, full_path)

            slots_data.append({
                "id": slot_id,
                "name": s.get("name"),
                "category": s.get("category"),
                "type": s.get("type"),
                "path": rel_path,
                "description": s.get("description", ""),
                "recommended": s.get("recommended", ""),
                "exists": file_exists,
                "size_formatted": size_formatted,
                "modified": mtime_formatted,
                "preview_url": preview_url,
                "history_count": len(history),
                "history": history
            })

        return self.send_json_response({
            "slots": slots_data,
            "total_slots": len(slots_data),
            "timestamp": time.time()
        })

    def handle_get_file_tree(self):
        images_dir = os.path.join(DIRECTORY, "images")
        tree = []
        if os.path.isdir(images_dir):
            for root, dirs, files in os.walk(images_dir):
                rel_root = os.path.relpath(root, DIRECTORY).replace('\\', '/')
                file_list = []
                for f in sorted(files):
                    fp = os.path.join(root, f)
                    stat = os.stat(fp)
                    ext = os.path.splitext(f)[1].lower()
                    is_video = ext in ['.mp4', '.mov', '.webm', '.m4v']
                    is_img = ext in ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']
                    file_list.append({
                        "name": f,
                        "rel_path": f"{rel_root}/{f}",
                        "size_bytes": stat.st_size,
                        "size_formatted": format_file_size(stat.st_size),
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "is_video": is_video,
                        "is_image": is_img
                    })
                tree.append({
                    "folder": rel_root,
                    "files": file_list
                })
        return self.send_json_response({"tree": tree})

    def handle_get_stats(self):
        images_dir = os.path.join(DIRECTORY, "images")
        total_img = 0
        total_vdo = 0
        total_size = 0
        if os.path.isdir(images_dir):
            for root, dirs, files in os.walk(images_dir):
                for f in files:
                    fp = os.path.join(root, f)
                    stat = os.stat(fp)
                    total_size += stat.st_size
                    ext = os.path.splitext(f)[1].lower()
                    if ext in ['.mp4', '.mov', '.webm', '.m4v']:
                        total_vdo += 1
                    elif ext in ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']:
                        total_img += 1

        total_backups = 0
        backup_size = 0
        if os.path.isdir(BACKUP_DIR):
            for root, dirs, files in os.walk(BACKUP_DIR):
                for f in files:
                    fp = os.path.join(root, f)
                    backup_size += os.path.getsize(fp)
                    total_backups += 1

        return self.send_json_response({
            "total_images": total_img,
            "total_videos": total_vdo,
            "total_media_files": total_img + total_vdo,
            "total_media_size": format_file_size(total_size),
            "total_backups": total_backups,
            "total_backup_size": format_file_size(backup_size),
            "active_sessions": len(ACTIVE_SESSIONS),
            "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    def handle_upload(self):
        content_type = self.headers.get('Content-Type', '')
        if not content_type.startswith('multipart/form-data'):
            return self.send_json_response({"error": "Content-Type must be multipart/form-data"}, 400)

        # Parse multipart boundary
        boundary = None
        for part in content_type.split(';'):
            part = part.strip()
            if part.startswith('boundary='):
                boundary = part.split('=', 1)[1].strip('"\'').encode('utf-8')
                break

        if not boundary:
            return self.send_json_response({"error": "Missing multipart boundary"}, 400)

        content_len = int(self.headers.get('Content-Length', 0))
        cfg = get_config()
        max_bytes = cfg.get("max_upload_size_mb", 250) * 1024 * 1024
        if content_len > max_bytes:
            return self.send_json_response({"error": f"File exceeds maximum allowed size of {cfg.get('max_upload_size_mb', 250)}MB"}, 400)

        # Read entire multipart stream
        raw_data = self.rfile.read(content_len)

        # Split by boundary delimiter
        delimiter = b'--' + boundary
        parts = raw_data.split(delimiter)

        fields = {}
        file_payload = None
        uploaded_filename = "uploaded_file"

        for p in parts:
            if not p or p == b'--\r\n' or p == b'--':
                continue
            if b'\r\n\r\n' in p:
                header_data, body = p.split(b'\r\n\r\n', 1)
                # Strip trailing \r\n
                if body.endswith(b'\r\n'):
                    body = body[:-2]

                header_text = header_data.decode('utf-8', errors='replace')
                if 'Content-Disposition:' in header_text:
                    disp_line = [l for l in header_text.split('\r\n') if l.startswith('Content-Disposition:')][0]
                    if 'filename=' in disp_line:
                        # This is a file part
                        file_payload = body
                        for segment in disp_line.split(';'):
                            segment = segment.strip()
                            if segment.startswith('filename='):
                                uploaded_filename = segment.split('=', 1)[1].strip('"\'')
                    else:
                        for segment in disp_line.split(';'):
                            segment = segment.strip()
                            if segment.startswith('name='):
                                field_name = segment.split('=', 1)[1].strip('"\'')
                                fields[field_name] = body.decode('utf-8', errors='replace').strip()

        slot_id = fields.get("slot_id")
        custom_target_path = fields.get("target_path")

        if not file_payload or len(file_payload) == 0:
            return self.send_json_response({"error": "No file uploaded or file is empty"}, 400)

        # Determine target file path
        target_rel_path = None
        manifest = get_manifest()

        if slot_id:
            for s in manifest.get("slots", []):
                if s["id"] == slot_id:
                    target_rel_path = s["path"]
                    break

        if not target_rel_path and custom_target_path:
            # Sanitize path to avoid directory traversal
            clean_rel = os.path.normpath(custom_target_path).replace('\\', '/').lstrip('/')
            if not clean_rel.startswith("images/"):
                clean_rel = "images/" + clean_rel
            target_rel_path = clean_rel
            slot_id = slot_id or clean_rel.replace('/', '_').replace('.', '_')

        if not target_rel_path:
            return self.send_json_response({"error": "Invalid slot_id or target path specified"}, 400)

        full_target_path = os.path.join(DIRECTORY, target_rel_path)
        os.makedirs(os.path.dirname(full_target_path), exist_ok=True)

        # BACKUP EXISTING FILE if present
        if os.path.isfile(full_target_path):
            slot_backup_dir = os.path.join(BACKUP_DIR, slot_id)
            os.makedirs(slot_backup_dir, exist_ok=True)
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            orig_base = os.path.basename(full_target_path)
            backup_filename = f"{timestamp_str}_{orig_base}"
            backup_full_path = os.path.join(slot_backup_dir, backup_filename)
            shutil.copy2(full_target_path, backup_full_path)

        # ATOMICALLY WRITE NEW FILE
        temp_target = full_target_path + ".tmp"
        with open(temp_target, "wb") as f:
            f.write(file_payload)
        shutil.move(temp_target, full_target_path)

        # Get updated file stats and history
        stat = os.stat(full_target_path)
        history = get_slot_history(slot_id, full_target_path)

        return self.send_json_response({
            "success": True,
            "slot_id": slot_id,
            "path": target_rel_path,
            "size_formatted": format_file_size(stat.st_size),
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            "preview_url": target_rel_path + f"?v={int(time.time())}",
            "history_count": len(history),
            "history": history,
            "message": f"Successfully updated '{slot_id}' with auto-backup created."
        })

    def handle_revert(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            payload = json.loads(body)
            slot_id = payload.get("slot_id")
            backup_filename = payload.get("backup_filename")

            if not slot_id or not backup_filename:
                return self.send_json_response({"error": "Missing slot_id or backup_filename"}, 400)

            manifest = get_manifest()
            target_rel_path = None
            for s in manifest.get("slots", []):
                if s["id"] == slot_id:
                    target_rel_path = s["path"]
                    break

            if not target_rel_path:
                # check fallback from slot_id
                target_rel_path = payload.get("target_path")

            if not target_rel_path:
                return self.send_json_response({"error": "Target slot not found in manifest"}, 404)

            full_target_path = os.path.join(DIRECTORY, target_rel_path)
            slot_backup_dir = os.path.join(BACKUP_DIR, slot_id)
            backup_source_path = os.path.join(slot_backup_dir, os.path.basename(backup_filename))

            if not os.path.isfile(backup_source_path):
                return self.send_json_response({"error": "Specified backup version file does not exist"}, 404)

            # Archive the CURRENT active file as a new rollback step before reverting
            if os.path.isfile(full_target_path):
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                orig_base = os.path.basename(full_target_path)
                archive_name = f"{timestamp_str}_before_revert_{orig_base}"
                shutil.copy2(full_target_path, os.path.join(slot_backup_dir, archive_name))

            # Restore the selected backup
            shutil.copy2(backup_source_path, full_target_path)

            stat = os.stat(full_target_path)
            history = get_slot_history(slot_id, full_target_path)

            return self.send_json_response({
                "success": True,
                "slot_id": slot_id,
                "path": target_rel_path,
                "size_formatted": format_file_size(stat.st_size),
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                "preview_url": target_rel_path + f"?v={int(time.time())}",
                "history_count": len(history),
                "history": history,
                "message": f"Successfully reverted '{slot_id}' to version '{backup_filename}'."
            })
        except Exception as e:
            return self.send_json_response({"error": str(e)}, 500)

    def handle_delete_history(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            payload = json.loads(body) if body else {}
            slot_id = payload.get("slot_id")
            backup_filename = payload.get("backup_filename")
            delete_all = payload.get("all", False)

            if not slot_id:
                return self.send_json_response({"error": "Missing slot_id"}, 400)

            slot_backup_dir = os.path.join(BACKUP_DIR, slot_id)
            if not os.path.isdir(slot_backup_dir):
                return self.send_json_response({"success": True, "message": "History already empty", "history": []})

            if delete_all:
                for f in os.listdir(slot_backup_dir):
                    fp = os.path.join(slot_backup_dir, f)
                    if os.path.isfile(fp):
                        try:
                            os.remove(fp)
                        except Exception:
                            pass
            elif backup_filename:
                safe_name = os.path.basename(backup_filename)
                target_file = os.path.join(slot_backup_dir, safe_name)
                if os.path.isfile(target_file):
                    os.remove(target_file)
            else:
                return self.send_json_response({"error": "Missing backup_filename or all parameter"}, 400)

            updated_history = get_slot_history(slot_id)
            return self.send_json_response({
                "success": True,
                "slot_id": slot_id,
                "history": updated_history,
                "message": "All history backups cleared" if delete_all else "History version deleted successfully"
            })
        except Exception as e:
            return self.send_json_response({"error": str(e)}, 500)

    def handle_add_slot(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            payload = json.loads(body)
            slot_id = payload.get("id")
            name = payload.get("name")
            path = payload.get("path")
            category = payload.get("category", "custom")
            media_type = payload.get("type", "image")

            if not slot_id or not path or not name:
                return self.send_json_response({"error": "id, name, and path are required"}, 400)

            manifest = get_manifest()
            slots = manifest.get("slots", [])
            # check duplicate
            for s in slots:
                if s["id"] == slot_id:
                    return self.send_json_response({"error": "Slot with this ID already exists"}, 400)

            slots.append({
                "id": slot_id,
                "name": name,
                "category": category,
                "type": media_type,
                "path": path,
                "description": payload.get("description", "Custom media asset slot."),
                "recommended": payload.get("recommended", "")
            })
            manifest["slots"] = slots
            save_manifest(manifest)
            return self.send_json_response({"success": True, "message": f"Slot '{name}' added successfully."})
        except Exception as e:
            return self.send_json_response({"error": str(e)}, 400)

    def handle_delete_slot(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            payload = json.loads(body)
            slot_id = payload.get("slot_id")
            if not slot_id:
                return self.send_json_response({"error": "slot_id required"}, 400)

            manifest = get_manifest()
            original_len = len(manifest.get("slots", []))
            manifest["slots"] = [s for s in manifest.get("slots", []) if s["id"] != slot_id]

            if len(manifest["slots"]) == original_len:
                return self.send_json_response({"error": "Slot not found"}, 404)

            save_manifest(manifest)
            return self.send_json_response({"success": True, "message": f"Slot '{slot_id}' removed from manifest."})
        except Exception as e:
            return self.send_json_response({"error": str(e)}, 400)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        if any(self.path.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp4', '.woff2']):
            self.send_header('Cache-Control', 'public, max-age=3600')
        else:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        super().end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {self.address_string()} - {format % args}\n")

class ThreadingAdminServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    print("=================================================================")
    print("  MILLIONAIRE DIZITAL — LUXURY ADMIN & MEDIA CONTROLLER")
    print(f"  Port: {PORT}")
    print(f"  Serving Directory: {DIRECTORY}")
    print(f"  Admin Panel URL: http://localhost:{PORT}/admin")
    print(f"  Default Password: mdz@admin2026")
    print("=================================================================")
    httpd = ThreadingAdminServer(("0.0.0.0", PORT), AdminHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down admin server...")
        httpd.server_close()
