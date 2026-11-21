#!/usr/bin/env python3
"""Real headless Chromium smoke using the module's standard browser DOM APIs."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
import subprocess
import threading

ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_):pass
def main():
    prior=Path.cwd()
    os.chdir(ROOT)
    try:
        server=ThreadingHTTPServer(("127.0.0.1",0),Quiet)
        th=threading.Thread(target=server.serve_forever,daemon=True)
        th.start()
        try:
            url="http://127.0.0.1:"+str(server.server_port)+"/tests/browser-smoke.html"
            command=["chromium","--headless","--no-sandbox","--disable-gpu",
              "--disable-dev-shm-usage","--no-first-run","--no-default-browser-check",
              "--virtual-time-budget=7000","--dump-dom",url]
            run=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=32)
            assert run.returncode==0,run.stderr[-1200:]
            assert 'data-result="PASS"' in run.stdout,run.stdout[-2600:]+run.stderr[-300:]
            print("BROWSER_DOM_SMOKE_PASSED (Chromium): isolated actor settings, target and tooltip removed, outcome preserved.")
        finally:
            server.shutdown()
            th.join(timeout=5)
            server.server_close()
    finally:
        os.chdir(prior)
if __name__=="__main__":
    main()
