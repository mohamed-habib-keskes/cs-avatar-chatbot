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
import urllib.request
import urllib.error

PORT = 8000
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "qwen/qwen3.6-27b"

GROQ_API_KEY = "7ot il api key"  # set in main() before the server starts


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
    """Locate the html file to serve, tolerating renamed downloads
    like 'file1 (1).html' from repeated downloads."""
    exact = os.path.join(folder, "file1.html")
    if os.path.isfile(exact):
        return "file1.html"

    candidates = sorted(glob.glob(os.path.join(folder, "file1*.html")))
    if candidates:
        return os.path.basename(candidates[0])

    all_html = sorted(glob.glob(os.path.join(folder, "*.html")))
    if len(all_html) == 1:
        return os.path.basename(all_html[0])

    return None


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # keep the console clean

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404, "Not found")
            return

        if not GROQ_API_KEY:
            self._send_json(
                503,
                {"error": "No Groq API key is configured on this server. "
                          "Restart file2.py and enter one when prompted."},
            )
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

        payload = json.dumps({
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 200,
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

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                self._send_raw(resp.status, resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            print(f"[groq error] {e.code}: {err_body[:300]!r}")
            self._send_raw(e.code, err_body)
        except Exception as e:
            print(f"[proxy error] {e}")
            self._send_json(502, {"error": f"Could not reach Groq: {e}"})

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
        print("No key entered — the page will load, but chat requests will fail")
        print("until you restart this script with a key.")

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
    print(f"  Serving folder: {folder}")
    print("=" * 60)

    if viewer_file is None:
        print("  Couldn't find file1.html in this folder.")
        print("  Files actually present here:")
        for name in sorted(os.listdir(folder)):
            if not name.startswith('.'):
                print(f"    - {name}")
        print()
        print("  Move file2.py into the SAME folder as the .html")
        print("  file you downloaded, then run this script again.")
        print("=" * 60)
    else:
        url = f"http://{lan_ip}:{port}/{viewer_file}"
        print(f"  Found: {viewer_file}")
        print()
        print("  On THIS computer, open:")
        print(f"    {url}")
        print()
        print("  Then click 'SCAN ON PHONE' inside the page — any number")
        print("  of phones on the same WiFi can scan it, chat, and load")
        print("  the model at the same time, without ever needing a key.")

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