#!/usr/bin/env python3
"""
InfiCatalog Self-Hosted Keep-Alive Worker
Pings the Render backend health check endpoint every 12-14 minutes to prevent
the free-tier instance from spinning down due to inactivity.

Usage:
    python scripts/keep_alive.py [TARGET_URL] [INTERVAL_MINUTES]

Example:
    python scripts/keep_alive.py https://inficatalog-api.onrender.com/api/health/ 12
"""

import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime

DEFAULT_URL = os.environ.get("HEALTH_CHECK_URL", "https://inficatalog-api.onrender.com/api/health/")
DEFAULT_INTERVAL_MINUTES = int(os.environ.get("PING_INTERVAL_MINUTES", "12"))


def ping_endpoint(url: str) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start = time.time()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "InfiCatalog-KeepAlive/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            duration = round(time.time() - start, 2)
            code = response.getcode()
            print(f"[{now}] Ping OK | Status: {code} | Latency: {duration}s | URL: {url}")
    except urllib.error.HTTPError as e:
        duration = round(time.time() - start, 2)
        print(f"[{now}] Ping Warning | Status: {e.code} | Latency: {duration}s | Reason: {e.reason}")
    except Exception as e:
        duration = round(time.time() - start, 2)
        print(f"[{now}] Ping Failed | Latency: {duration}s | Error: {e}")


def main():
    target_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    interval_minutes = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_INTERVAL_MINUTES
    interval_seconds = interval_minutes * 60

    print("=" * 65)
    print(" InfiCatalog Self-Hosted Keep-Alive Worker")
    print(f" Target Endpoint:   {target_url}")
    print(f" Ping Interval:     Every {interval_minutes} minutes ({interval_seconds}s)")
    print("=" * 65)

    while True:
        ping_endpoint(target_url)
        time.sleep(interval_seconds)


if __name__ == "__main__":
    main()
