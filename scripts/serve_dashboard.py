from __future__ import annotations

import argparse
import os
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_PORT = 8765
MAX_PORT_TRIES = 20
UI_VERSION = "ui-v3-20260930"
ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "dashboard"


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Serve the dashboard without browser caching during local development."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class DashboardServer(ThreadingHTTPServer):
    allow_reuse_address = True


def _port_is_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def _pick_port(preferred: int, strict: bool) -> int:
    if strict:
        if not _port_is_available(preferred):
            raise OSError(f"Port {preferred} is already in use.")
        return preferred

    for port in range(preferred, preferred + MAX_PORT_TRIES):
        if _port_is_available(port):
            return port
    raise OSError(
        f"No free local port found in range {preferred}-{preferred + MAX_PORT_TRIES - 1}."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Open the Yield Curve Lab dashboard with a no-cache local server."
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Preferred port (default: {DEFAULT_PORT}). If busy, the next free port is used.",
    )
    parser.add_argument(
        "--strict-port",
        action="store_true",
        help="Fail instead of trying another port when --port is busy.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Start the server without opening a browser automatically.",
    )
    parser.add_argument(
        "--selftest",
        action="store_true",
        help="Open the dashboard with its JavaScript/Python parity self-test enabled.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    index = DASHBOARD / "index.html"
    if not index.exists():
        print(f"ERROR: dashboard/index.html was not found at: {index}", file=sys.stderr)
        print("Make sure you extracted the whole project before running this launcher.", file=sys.stderr)
        return 2

    try:
        port = _pick_port(args.port, args.strict_port)
    except OSError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 3

    os.chdir(DASHBOARD)
    query = f"?v={UI_VERSION}"
    if args.selftest:
        query += "&selftest=1"
    url = f"http://127.0.0.1:{port}/{query}#/today"

    try:
        server = DashboardServer(("127.0.0.1", port), NoCacheHandler)
    except OSError as exc:
        print(f"ERROR: cannot start dashboard server on port {port}: {exc}", file=sys.stderr)
        return 4

    print("=" * 62)
    print("Yield Curve Lab - local dashboard")
    print(f"URL: {url}")
    if port != args.port:
        print(f"Note: port {args.port} was busy, so port {port} is being used instead.")
    print("Press Ctrl+C in this window to stop the server.")
    print("=" * 62)

    if not args.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDashboard server stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
