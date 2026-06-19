#!/usr/bin/env python3
"""Generate AI Translate - English to Bangla PNG icons without external deps.

Draws a rounded indigo->purple gradient tile with a white AI "sparkle" glyph
(a large 4-point star plus a small accent star) indicating AI + technology.
Pure stdlib (zlib + struct).
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


def in_sparkle(px, py, cx, cy, radius, exp=0.62):
    # A 4-point "sparkle" (astroid-style) star: concave sides, sharp cusps on the
    # axes. |dx|^exp + |dy|^exp <= radius^exp with exp < 1 gives the AI-sparkle look.
    if radius <= 0:
        return False
    dx = abs(px - cx)
    dy = abs(py - cy)
    return (dx ** exp + dy ** exp) <= (radius ** exp)


def sparkle_coverage(tx, ty, sparkles, samples=3):
    # Supersample for smooth (anti-aliased) sparkle edges.
    hits = 0
    total = samples * samples
    step = 1.0 / samples
    base = -0.5 + step / 2.0
    for sy in range(samples):
        oy = base + sy * step
        for sx in range(samples):
            ox = base + sx * step
            for (cx, cy, r) in sparkles:
                if in_sparkle(tx + ox, ty + oy, cx, cy, r):
                    hits += 1
                    break
    return hits / total


def make_icon(size):
    radius = max(2, int(size * 0.22))

    # AI sparkle: a large 4-point star slightly upper-left, plus a small accent
    # star at the lower-right (the familiar "AI" multi-sparkle), in white.
    main = (size * 0.43, size * 0.43, size * 0.30)
    accent = (size * 0.72, size * 0.72, size * 0.13)
    sparkles = [main, accent]

    pixels = bytearray()
    for y in range(size):
        pixels.append(0)  # filter type 0 per scanline
        for x in range(size):
            r, g, b = gradient_color(x, y, size)
            a = rounded_alpha(x, y, size, radius)

            tx, ty = x + 0.5, y + 0.5
            cov = sparkle_coverage(tx, ty, sparkles)
            if cov > 0:
                # Blend white sparkle over the gradient by coverage.
                r = int(lerp(r, 0xFF, cov))
                g = int(lerp(g, 0xFF, cov))
                b = int(lerp(b, 0xFF, cov))

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
