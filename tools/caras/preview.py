# Decodifica caras.bin como lo hace la placa y arma una hoja de muestra (para revisar sin la placa).
# Uso: python3 preview.py caras.bin salida.png [filtro] [color_ojos_hex]
import struct, sys, re
from PIL import Image

W, H = 320, 172
d = open(sys.argv[1], 'rb').read()
out = sys.argv[2]
filtro = re.compile(sys.argv[3]) if len(sys.argv) > 3 else None
eye = tuple(int((sys.argv[4] if len(sys.argv) > 4 else '5ef2ff')[i:i + 2], 16) for i in (0, 2, 4))
assert d[:4] == b'CARA' and d[4] == 2
p = 5
n = struct.unpack_from('<H', d, p)[0]; p += 2
pal = struct.unpack_from('<%dH' % n, d, p); p += 2 * n
c = struct.unpack_from('<H', d, p)[0]; p += 2
clips = []
for _ in range(c):
    l = d[p]; p += 1
    name = d[p:p + l].decode(); p += l
    ms, nf, loop, off = struct.unpack_from('<HHBI', d, p); p += 9
    clips.append((name, ms, nf, loop, off))
offs = sorted(o for *_, o in clips) + [len(d)]

def color(code):
    if code < 16:
        k = code / 7
        return tuple(int(v * k) for v in eye)
    v = pal[code - 16]
    return (((v >> 11) & 31) << 3, ((v >> 5) & 63) << 2, (v & 31) << 3)

def frames(off):
    buf = bytearray(W * H)
    p = off
    while True:
        while True:
            y = d[p]; p += 1
            if y == 0xFF: break
            op = d[p]; p += 1
            if op == 1:
                buf[y * W:(y + 1) * W] = buf[(y - 1) * W:y * W]
                continue
            x0, nn = struct.unpack_from('<HH', d, p); p += 4
            x = x0
            while x < x0 + nn:
                code, ln = d[p], d[p + 1]; p += 2
                buf[y * W + x:y * W + x + ln] = bytes([code]) * ln
                x += ln
        yield bytes(buf)
        if p >= len(d) or p in offs: return

sel = [cl for cl in clips if not filtro or filtro.search(cl[0])]
print('%d clips' % len(clips))
for name, ms, nf, loop, off in sel:
    size = offs[offs.index(off) + 1] - off
    print('%-28s %4d cuadros %7.1f KB' % (name, nf, size / 1024))
# hoja: por clip, 6 cuadros repartidos
cols = 6
sheet = Image.new('RGB', (cols * (W + 4), len(sel) * (H + 16)), (40, 40, 40))
lut = [color(i) for i in range(256 if len(pal) + 16 > 256 else len(pal) + 16)]
for r, (name, ms, nf, loop, off) in enumerate(sel):
    fs = list(f for _, f in zip(range(nf), frames(off)))
    picks = [fs[int(i * (len(fs) - 1) / max(1, cols - 1))] for i in range(cols)] if len(fs) > 1 else fs
    for k, f in enumerate(picks):
        img = Image.new('RGB', (W, H))
        img.putdata([lut[b] for b in f])
        sheet.paste(img, (k * (W + 4), r * (H + 16) + 14))
sheet.save(out)
