"""Local preview only: python tools/serve.py [port]. Use HTTPS static hosting in production."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys


class Handler(SimpleHTTPRequestHandler):
    # Windows registry MIME mappings can otherwise serve .mjs as text/plain.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    root = Path(__file__).resolve().parents[1] / 'dist'
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(root)))
    print(f'Local preview: http://127.0.0.1:{port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
