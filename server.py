#!/usr/bin/env python3
"""
Servidor local para desenvolvimento — MilRaízes
Corre: python3 server.py
Abre:  http://localhost:8080
"""
import http.server
import socketserver
import os
import re

PORT = 8080
DIR  = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} → {fmt % args}")

    # Silence the default noisy log for static assets
    def log_request(self, code='-', size='-'):
        if str(code) not in ('200', '304'):
            super().log_request(code, size)

    # Range request support — needed so <video> can seek (scroll-scrub, etc.)
    def send_head(self):
        path = self.translate_path(self.path)
        range_header = self.headers.get('Range')
        if not range_header or not os.path.isfile(path):
            return super().send_head()

        match = re.match(r'bytes=(\d*)-(\d*)', range_header)
        if not match:
            return super().send_head()

        file_size = os.path.getsize(path)
        start_str, end_str = match.groups()
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        if start > end or start >= file_size:
            self.send_error(416, "Requested range not satisfiable")
            return None

        f = open(path, 'rb')
        f.seek(start)
        self._range = (start, end)
        self.send_response(206)
        ctype = self.guess_type(path)
        self.send_header("Content-type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if hasattr(self, '_range'):
            start, end = self._range
            remaining = end - start + 1
            bufsize = 64 * 1024
            while remaining > 0:
                chunk = source.read(min(bufsize, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        else:
            super().copyfile(source, outputfile)

    def end_headers(self):
        if not hasattr(self, '_range'):
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"\n  Mil Raízes · servidor local")
    print(f"  http://localhost:{PORT}\n")
    print("  Ctrl+C para parar\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor parado.")
