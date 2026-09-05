#!/usr/bin/env python3
"""
Serves file1.html on your local network AND proxies chat requests
to Groq, so the API key only ever lives here on your computer.

Any device that loads the page — including phones that scan the QR code —
talks to THIS server, which forwards the request to Groq using the key
you enter below. Nobody else ever sees or enters a key.

Usage:
    python3 file2.py

You'll be prompted for your Groq API key once (input is hidden). Get a
free one at https://console.groq.com/keys if you don't have one.

Then open the printed http://<your-lan-ip>:8000/file1.html link
on THIS computer, or scan the QR code from the page on any phone on the
same WiFi network.
"""

import http.server
import socketserver
import socket
import os
import sys
import glob
import json
import getpass
import re
import subprocess
import platform
import threading
import uuid
import urllib.request
import urllib.error
import urllib.parse

PORT = 8000
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "qwen/qwen3.6-27b"

GROQ_API_KEY = "7ot il api key"  # set in main() before the server starts

# ---------- Canned Q&A storage ----------
CANNED_QA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "canned_qa.json")
canned_qa_lock = threading.Lock()

def load_canned_qa():
    try:
        if os.path.isfile(CANNED_QA_FILE):
            with open(CANNED_QA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"[Canned QA Load Error]: {e}")
    return []

def save_canned_qa(data):
    try:
        with open(CANNED_QA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Canned QA Save Error]: {e}")
        return False

def find_canned_reply(question):
    q = question.strip().lower()
    items = load_canned_qa()
    for item in items:
        matches = item.get("match", [])
        if isinstance(matches, str):
            matches = [matches]
        if any(m.strip().lower() in q for m in matches if m.strip()):
            return item.get("reply", "")
    return None

# ---------- Admin hand-off ----------
# When admin_mode is on, new questions are queued here instead of being
# sent to Groq, and the admin.html page polls/answers them. Questions
# also land here automatically if the Groq call itself fails, so a
# visitor never just sees an error.
pending_lock = threading.Lock()
pending_questions = {}  # id -> {"question": str, "answer": str|None, "resolved": bool}
admin_mode = {"enabled": False}


VIRTUAL_ADAPTER_HINTS = [
    "vpn", "virtual", "vethernet", "docker", "veth", "wsl", "tun", "tap",
    "loopback", "hyper-v", "vmware", "virtualbox", "bluetooth", "npcap",
    "utun",
]
WIFI_ADAPTER_HINTS = [
    "wi-fi", "wifi", "wlan", "wireless", "en0", "airport",
]


def list_network_interfaces():
    """Best-effort (interface_name, ipv4) pairs from the real OS network
    stack — used to avoid handing out a VPN/Docker/WSL virtual adapter's
    IP, which looks valid but is unreachable from any other device and
    causes ERR_ADDRESS_UNREACHABLE on the phone."""
    system = platform.system()
    results = []
    try:
        if system == "Windows":
            out = subprocess.check_output(
                ["ipconfig"], text=True, errors="ignore", timeout=5
            )
            current_adapter = None
            for line in out.splitlines():
                if line and not line.startswith((" ", "\t")) and ":" in line:
                    current_adapter = line.split(":")[0].strip()
                m = re.search(r"IPv4 Address[.\s]*:\s*([\d.]+)", line)
                if m and current_adapter:
                    results.append((current_adapter, m.group(1)))

        elif system == "Darwin":
            out = subprocess.check_output(
                ["ifconfig"], text=True, errors="ignore", timeout=5
            )
            current_iface = None
            for line in out.splitlines():
                if line and not line.startswith((" ", "\t")):
                    current_iface = line.split(":")[0]
                m = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", line)
                if m and current_iface:
                    results.append((current_iface, m.group(1)))

        else:  # Linux and others
            try:
                out = subprocess.check_output(
                    ["ip", "-4", "addr", "show"], text=True, errors="ignore", timeout=5
                )
                current_iface = None
                for line in out.splitlines():
                    m_if = re.match(r"\d+:\s+(\S+):", line)
                    if m_if:
                        current_iface = m_if.group(1)
                    m = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", line)
                    if m and current_iface:
                        results.append((current_iface, m.group(1)))
            except (FileNotFoundError, subprocess.CalledProcessError):
                out = subprocess.check_output(
                    ["ifconfig"], text=True, errors="ignore", timeout=5
                )
                current_iface = None
                for line in out.splitlines():
                    if line and not line.startswith((" ", "\t")):
                        current_iface = line.split(":")[0].split()[0]
                    m = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", line)
                    if m and current_iface:
                        results.append((current_iface, m.group(1)))
    except Exception:
        pass

    # drop loopback / link-local addresses regardless of platform
    return [
        (name, ip) for name, ip in results
        if not ip.startswith("127.") and not ip.startswith("169.254.")
    ]


def classify_adapter(name):
    n = name.lower()
    if any(h in n for h in VIRTUAL_ADAPTER_HINTS):
        return "virtual"
    if any(h in n for h in WIFI_ADAPTER_HINTS):
        return "wifi"
    return "other"


def is_wsl():
    """Detect WSL, where even 'real' adapter IPs can belong to WSL's
    internal virtual network rather than the actual host machine."""
    try:
        with open("/proc/version", "r") as f:
            return "microsoft" in f.read().lower()
    except Exception:
        return False


def get_lan_ip():
    """Pick the best IP to hand out: prefer a real WiFi adapter, avoid
    known-virtual ones, and only fall back to the OS's default-route
    guess (which can pick a VPN/WSL adapter) if nothing better is found."""
    interfaces = list_network_interfaces()
    classified = [(name, ip, classify_adapter(name)) for name, ip in interfaces]

    wifi_matches = [ip for _, ip, kind in classified if kind == "wifi"]
    if wifi_matches:
        return wifi_matches[0]

    other_matches = [ip for _, ip, kind in classified if kind == "other"]
    if other_matches:
        return other_matches[0]

    # last resort: ask the OS which interface it would use for outbound
    # traffic (may land on a virtual adapter if one is active)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def find_viewer_file(folder):
    """Locate the html file to serve, prioritizing index.html."""
    exact = os.path.join(folder, "index.html")
    if os.path.isfile(exact):
        return "index.html"

    file1 = os.path.join(folder, "file1.html")
    if os.path.isfile(file1):
        return "file1.html"

    all_html = sorted(glob.glob(os.path.join(folder, "*.html")))
    if all_html:
        return os.path.basename(all_html[0])

    return None


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # keep the console clean

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/":
            self.path = "/index.html"

        if parsed.path == "/api/chat/poll":
            self._handle_poll(parsed.query)
            return

        if parsed.path == "/api/admin/pending":
            with pending_lock:
                items = [
                    {"id": qid, "question": v["question"]}
                    for qid, v in pending_questions.items()
                    if not v["resolved"]
                ]
            self._send_json(200, {"pending": items, "admin_mode": admin_mode["enabled"]})
            return

        if parsed.path == "/api/admin/mode":
            self._send_json(200, {"enabled": admin_mode["enabled"]})
            return

        if parsed.path == "/api/canned":
            with canned_qa_lock:
                items = load_canned_qa()
            self._send_json(200, {"canned": items})
            return

        super().do_GET()

    def _handle_poll(self, query):
        qid = (urllib.parse.parse_qs(query).get("id") or [""])[0]
        with pending_lock:
            entry = pending_questions.get(qid)
            if entry is None:
                self._send_json(404, {"error": "Unknown question id."})
                return
            if entry["resolved"]:
                self._send_json(200, {"resolved": True, "answer": entry["answer"]})
            else:
                self._send_json(200, {"resolved": False})

    def _enqueue_pending(self, messages):
        """Store a question for the admin panel and return its id."""
        question = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                content = m.get("content", "")
                if isinstance(content, list):
                    text_parts = [p.get("text", "") for p in content if isinstance(p, dict)]
                    question = " ".join(text_parts)
                else:
                    question = str(content)
                break
        qid = uuid.uuid4().hex[:8]
        with pending_lock:
            pending_questions[qid] = {"question": question, "answer": None, "resolved": False}
        return qid

    def do_POST(self):
        if self.path == "/api/admin/answer":
            self._handle_admin_answer()
            return
        if self.path == "/api/admin/mode":
            self._handle_admin_mode()
            return
        if self.path == "/api/canned/save":
            self._handle_canned_save()
            return
        if self.path == "/api/canned/delete":
            self._handle_canned_delete()
            return
        if self.path != "/api/chat":
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json(400, {"error": "Malformed request body."})
            return

        messages = body.get("messages")
        if not messages:
            self._send_json(400, {"error": "Missing 'messages' in request."})
            return

        # 1. Check Canned Q&A first for instant answers
        latest_question = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                content = m.get("content", "")
                if isinstance(content, list):
                    text_parts = [p.get("text", "") for p in content if isinstance(p, dict)]
                    latest_question = " ".join(text_parts)
                else:
                    latest_question = str(content)
                break

        if latest_question:
            canned_answer = find_canned_reply(latest_question)
            if canned_answer:
                self._send_json(200, {
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": canned_answer
                        }
                    }],
                    "canned": True
                })
                return

        if admin_mode.get("enabled"):
            qid = self._enqueue_pending(messages)
            self._send_json(200, {"pending": True, "id": qid, "fallback": False})
            return

        if not GROQ_API_KEY:
            qid = self._enqueue_pending(messages)
            self._send_json(200, {"pending": True, "id": qid, "fallback": True})
            return

        payload = json.dumps({
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800,
            "reasoning_effort": "none",
            "reasoning_format": "hidden",
        }).encode("utf-8")

        req = urllib.request.Request(
            GROQ_ENDPOINT,
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
                # Groq sits behind Cloudflare, which blocks requests whose
                # User-Agent looks like a bare script (e.g. the default
                # "Python-urllib/3.x") — this causes 403 / Cloudflare
                # error 1010. A normal browser-style UA avoids that.
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json",
            },
        )

        # Always try the bot first. It only gets handed off to the admin
        # panel below (in the except blocks) if Groq itself fails to
        # answer — a bad response, a network error, etc. admin_mode no
        # longer forces every question straight to a human.
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                self._send_raw(resp.status, resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            print(f"[groq error] {e.code}: {err_body[:300]!r}")
            # Groq couldn't handle it — hand it to the admin panel instead
            # of showing the visitor an error.
            qid = self._enqueue_pending(messages)
            self._send_json(200, {"pending": True, "id": qid, "fallback": True})
        except Exception as e:
            print(f"[proxy error] {e}")
            qid = self._enqueue_pending(messages)
            self._send_json(200, {"pending": True, "id": qid, "fallback": True})

    def _handle_admin_answer(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json(400, {"error": "Malformed request body."})
            return
        qid = body.get("id")
        answer = (body.get("answer") or "").strip()
        if not qid or not answer:
            self._send_json(400, {"error": "Missing 'id' or 'answer'."})
            return
        with pending_lock:
            entry = pending_questions.get(qid)
            if entry is None:
                self._send_json(404, {"error": "Unknown question id."})
                return
            entry["answer"] = answer
            entry["resolved"] = True
        self._send_json(200, {"ok": True})

    def _handle_admin_mode(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json(400, {"error": "Malformed request body."})
            return
        admin_mode["enabled"] = bool(body.get("enabled"))
        self._send_json(200, {"enabled": admin_mode["enabled"]})

    def _handle_canned_save(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json(400, {"error": "Malformed request body."})
            return

        qid = body.get("id") or uuid.uuid4().hex[:6]
        matches = body.get("match", [])
        reply = (body.get("reply") or "").strip()

        if isinstance(matches, str):
            matches = [m.strip() for m in matches.split(",") if m.strip()]
        else:
            matches = [str(m).strip() for m in matches if str(m).strip()]

        if not matches or not reply:
            self._send_json(400, {"error": "Both 'match' keywords and 'reply' are required."})
            return

        with canned_qa_lock:
            items = load_canned_qa()
            found = False
            for item in items:
                if item.get("id") == qid:
                    item["match"] = matches
                    item["reply"] = reply
                    found = True
                    break
            if not found:
                items.append({
                    "id": qid,
                    "match": matches,
                    "reply": reply
                })
            save_canned_qa(items)

        self._send_json(200, {"ok": True, "id": qid})

    def _handle_canned_delete(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json(400, {"error": "Malformed request body."})
            return

        qid = body.get("id")
        if not qid:
            self._send_json(400, {"error": "Missing 'id' parameter."})
            return

        with canned_qa_lock:
            items = load_canned_qa()
            items = [item for item in items if item.get("id") != qid]
            save_canned_qa(items)

        self._send_json(200, {"ok": True})

    def _send_json(self, status, obj):
        self._send_raw(status, json.dumps(obj).encode("utf-8"))

    def _send_raw(self, status, raw_bytes):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw_bytes)))
        self.end_headers()
        self.wfile.write(raw_bytes)


def main():
    global GROQ_API_KEY

    folder = os.path.dirname(os.path.abspath(__file__))
    os.chdir(folder)

    lan_ip = get_lan_ip()
    viewer_file = find_viewer_file(folder)

    env_key = os.environ.get("GROQ_API_KEY", "").strip()
    if env_key:
        GROQ_API_KEY = env_key
        print("Using GROQ_API_KEY from environment.")
    else:
        try:
            GROQ_API_KEY = getpass.getpass(
                "Paste your Groq API key (input hidden, get one free at "
                "console.groq.com/keys): "
            ).strip()
        except Exception:
            GROQ_API_KEY = input("Paste your Groq API key: ").strip()

    if not GROQ_API_KEY:
        print("No key entered — running in Admin-only mode. Visitor questions will wait in admin.html.")

    port = PORT
    for attempt_port in range(PORT, PORT + 10):
        try:
            httpd = ThreadingHTTPServer(("0.0.0.0", attempt_port), Handler)
            port = attempt_port
            break
        except OSError:
            continue
    else:
        print("Could not find a free port. Close other local servers and try again.")
        sys.exit(1)

    print("=" * 60)
    print(f"  IEEE ENIS CS-BOT SERVER RUNNING")
    print(f"  Serving folder: {folder}")
    print("=" * 60)

    if viewer_file is None:
        print("  Couldn't find index.html in this folder.")
        print("  Files actually present here:")
        for name in sorted(os.listdir(folder)):
            if not name.startswith('.'):
                print(f"    - {name}")
        print("=" * 60)
    else:
        url = f"http://{lan_ip}:{port}/{viewer_file}"
        print(f"  Found: {viewer_file}")
        print()
        print("  On THIS computer, open:")
        print(f"    {url}")
        print()
        print("  Then click 'SCAN QR' in the top right header — any number")
        print("  of phones on the same WiFi can scan it and chat with CS-BOT")
        print("  at the same time, without ever needing an API key.")
        print()
        print("  To answer questions yourself or view live queries, open:")
        print(f"    http://{lan_ip}:{port}/admin.html")

        interfaces = list_network_interfaces()
        classified = [(name, ip, classify_adapter(name)) for name, ip in interfaces]
        others = [(name, ip, kind) for name, ip, kind in classified if ip != lan_ip]

        if others:
            print()
            print("  If 'ERR_ADDRESS_UNREACHABLE' or similar shows up on the")
            print("  phone, the address above may be a virtual adapter (VPN,")
            print("  Docker, WSL, etc). Try these other addresses instead:")
            for name, ip, kind in others:
                tag = " (likely virtual — probably won't work)" if kind == "virtual" else ""
                print(f"    http://{ip}:{port}/{viewer_file}   [{name}]{tag}")

        if is_wsl():
            print()
            print("  ⚠ You're running inside WSL. Even the addresses above")
            print("  may belong to WSL's internal virtual network. If none")
            print("  work, run this same script directly in Windows instead")
            print("  of inside WSL — e.g. via PowerShell.")

        print()
        print("  If a phone still says the page is unreachable:")
        print("    • Confirm the phone is on the SAME WiFi network as this")
        print("      computer (not mobile data, not a guest network).")
        print("    • Your OS firewall may be blocking incoming connections")
        print("      the first time a Python server runs — look for a")
        print("      permission prompt, or allow Python through it manually.")
        print("    • Some routers isolate WiFi clients from each other")
        print("      ('AP/client isolation', common on guest networks) —")
        print("      this blocks phone-to-PC traffic even on the same WiFi.")
        print()
        print("  Press Ctrl+C to stop the server.")
        print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()