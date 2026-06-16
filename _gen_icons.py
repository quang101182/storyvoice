# -*- coding: utf-8 -*-
"""Génère les icônes PWA de StoryVoice (fond dégradé sombre + livre ouvert + ondes sonores)."""
import math
from PIL import Image, ImageDraw

OUT = "icons"

# Palette app
VIOLET = (122, 84, 255)   # ~ --violet vif
CYAN   = (70, 224, 255)   # --cyan
GOLD   = (255, 212, 121)  # --gold
PAPER  = (233, 236, 255)  # --txt
DARK   = (5, 6, 15)       # --bg


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_bg(size):
    """Dégradé diagonal violet sombre -> presque noir bleuté."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    top = (38, 26, 92)      # violet profond
    bot = (7, 9, 22)        # noir bleuté
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = lerp(top, bot, t)
    return img


def draw_glyph(img, size, inset=0.0):
    """Dessine un livre ouvert + 3 ondes sonores, centré. inset = marge intérieure (0..0.5)."""
    d = ImageDraw.Draw(img, "RGBA")
    s = size
    pad = int(s * inset)
    area = s - 2 * pad
    cx = s / 2
    # --- Livre ouvert (deux pages en V ouvert vers le haut) ---
    by = pad + area * 0.30      # haut des pages
    bb = pad + area * 0.74      # bas du livre
    spine = pad + area * 0.40   # creux central (le dos plus haut que les bords)
    half = area * 0.30
    # page gauche
    left = [
        (cx, by + area * 0.06),
        (cx - half, by + area * 0.16),
        (cx - half, bb),
        (cx, bb - area * 0.02),
    ]
    right = [
        (cx, by + area * 0.06),
        (cx + half, by + area * 0.16),
        (cx + half, bb),
        (cx, bb - area * 0.02),
    ]
    d.polygon(left, fill=PAPER + (255,))
    d.polygon(right, fill=(200, 206, 245, 255))
    # dos central
    d.line([(cx, by + area * 0.06), (cx, bb - area * 0.02)], fill=(120, 130, 200, 255), width=max(2, int(s * 0.012)))
    # lignes de texte (petits traits)
    lw = max(1, int(s * 0.012))
    for i, fy in enumerate((0.40, 0.50, 0.60)):
        yy = pad + area * fy
        d.line([(cx - half * 0.78, yy + area * 0.045), (cx - area * 0.07, yy + area * 0.015)], fill=(110, 120, 180, 220), width=lw)
        d.line([(cx + area * 0.07, yy + area * 0.015), (cx + half * 0.78, yy + area * 0.045)], fill=(150, 160, 210, 200), width=lw)
    # --- Ondes sonores (arcs) en haut à droite, dégradé cyan->gold ---
    ox = pad + area * 0.74
    oy = pad + area * 0.26
    for i, col in enumerate((CYAN, lerp(CYAN, GOLD, 0.5), GOLD)):
        r = area * (0.10 + i * 0.075)
        bbox = [ox - r, oy - r, ox + r, oy + r]
        d.arc(bbox, start=-55, end=55, fill=col + (255,), width=max(2, int(s * 0.018)))
    return img


def rounded_mask(size, radius_frac=0.22):
    m = Image.new("L", (size, size), 0)
    dd = ImageDraw.Draw(m)
    r = int(size * radius_frac)
    dd.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return m


def make_any(size):
    """Icône 'any' : coins arrondis, glyphe avec marge."""
    bg = gradient_bg(size).convert("RGBA")
    draw_glyph(bg, size, inset=0.16)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(bg, (0, 0), rounded_mask(size))
    return out


def make_maskable(size):
    """Icône maskable : fond plein (pas de coins transparents), glyphe dans la safe zone (~62%)."""
    bg = gradient_bg(size).convert("RGBA")
    draw_glyph(bg, size, inset=0.20)
    return bg


def make_apple(size=180):
    """iOS : fond plein opaque (iOS arrondit lui-même)."""
    bg = gradient_bg(size).convert("RGB")
    draw_glyph(bg, size, inset=0.16)
    return bg


make_any(192).save(f"{OUT}/icon-192.png")
make_any(512).save(f"{OUT}/icon-512.png")
make_maskable(192).save(f"{OUT}/maskable-192.png")
make_maskable(512).save(f"{OUT}/maskable-512.png")
make_apple(180).save(f"{OUT}/apple-touch-icon.png")
print("Icônes générées :", OUT)
