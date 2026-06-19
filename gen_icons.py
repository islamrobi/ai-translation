#!/usr/bin/env python3
"""Generate H2R - Translate PNG icons without external deps.

Draws a rounded indigo->purple gradient tile with a stylized white speech
bubble + translate glyph. Pure stdlib (zlib + struct).
"""
import os
import struct
import zlib


def lerp(a, b, t):
    return a + (b - a) * t


def gradient_color(x, y, size):
    # Diagonal gradient from indigo (#4f46e5) to purple (#7c3aed)
    t = (x + y) / (2 * (size - 1)) if size > 1 else 0
    r = int(lerp(0x4F, 0x7C, t))
    g = int(lerp(0x46, 0x3A, t))
    b = int(lerp(0xE5, 0xED, t))
    return r, g, b


def rounded_alpha(x, y, size, radius):
    # Anti-aliased rounded-rectangle mask.
    cx = min(max(x, radius), size - 1 - radius)
    cy = min(max(y, radius), size - 1 - radius)
    dx = x - cx
    dy = y - cy
    dist = (dx * dx + dy * dy) ** 0.5
    if dist <= radius - 1:
        return 255
    if dist >= radius:
        return 0
    return int(255 * (radius - dist))


def make_icon(size):
    radius = max(2, int(size * 0.22))
    # Speech-bubble rectangle area (white) within the tile.
    pad = size * 0.22
    bx0, by0 = pad, pad
    bx1, by1 = size - pad, size - pad * 1.15
    br = max(1.0, size * 0.10)

    pixels = bytearray()
    for y in range(size):
        pixels.append(0)  # filter type 0 per scanline
        for x in range(size):
            r, g, b = gradient_color(x, y, size)
            a = rounded_alpha(x, y, size, radius)

            inside = False
            tx, ty = x + 0.5, y + 0.5
            if bx0 <= tx <= bx1 and by0 <= ty <= by1:
                # rounded corners of the bubble
                ccx = min(max(tx, bx0 + br), bx1 - br)
                ccy = min(max(ty, by0 + br), by1 - br)
                if ((tx - ccx) ** 2 + (ty - ccy) ** 2) ** 0.5 <= br:
                    inside = True

            # little tail at bottom-left of the bubble
            tail = False
            tlx = bx0 + (bx1 - bx0) * 0.30
            if by1 - 0.5 <= ty <= by1 + size * 0.12:
                half = (size * 0.12) - (ty - by1)
                if tlx - half <= tx <= tlx + max(0.0, half):
                    tail = True

            if inside or tail:
                r, g, b = 0xFF, 0xFF, 0xFF
                # draw two indigo "translate" bars inside the bubble
                rel_y = (ty - by0) / max(1.0, (by1 - by0))
                if 0.32 <= rel_y <= 0.46 and bx0 + br <= tx <= bx1 - br:
                    r, g, b = 0x4F, 0x46, 0xE5
                if 0.58 <= rel_y <= 0.72 and bx0 + br <= tx <= (bx0 + (bx1 - bx0) * 0.72):
                    r, g, b = 0x7C, 0x3A, 0xED

            pixels.extend((r, g, b, a))
    return bytes(pixels)


def write_png(path, size):
    raw = make_icon(size)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        out = struct.pack(">I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return out + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(os.path.join(out_dir, f"icon{size}.png"), size)
        print("wrote", f"icons/icon{size}.png")


if __name__ == "__main__":
    main()
