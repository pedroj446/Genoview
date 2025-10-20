# -*- coding: utf-8 -*-


import os
import webview
from backend.api import Api

def get_frontend_path():
    base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, "frontend", "index.html")

if __name__ == "__main__":
    api = Api()
    window = webview.create_window(
        "Navegador Genômico ",
        url=get_frontend_path(),
        js_api=api,
        width=1200,
        height=800
    )
    webview.start(debug=False)
