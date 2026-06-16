# -*- coding: utf-8 -*-
"""Capture l'écran du Honor via ADB et resize <=1800px AVANT lecture (règle critique screenshot)."""
import subprocess, sys, io
from PIL import Image

ADB = r"C:\Users\quang\AppData\Local\Android\Sdk\platform-tools\adb.exe"
SERIAL = "AQCK024C17020477"  # Honor PTP-N49
OUT = sys.argv[1] if len(sys.argv) > 1 else "_honor_shot.png"
MAX_SIDE = 1800

raw = subprocess.run([ADB, "-s", SERIAL, "exec-out", "screencap", "-p"], capture_output=True).stdout
img = Image.open(io.BytesIO(raw))
w, h = img.size
scale = min(1.0, MAX_SIDE / max(w, h))
if scale < 1.0:
    img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
img.save(OUT)
print(f"capture {w}x{h} -> {img.size[0]}x{img.size[1]} ({OUT})")
assert max(img.size) <= MAX_SIDE, "DEPASSE 1800 — ne pas Read"
