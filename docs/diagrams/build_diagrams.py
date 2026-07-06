#!/usr/bin/env python3
"""Build Ventra SEO flow diagrams.

One abstract scene model -> two outputs:
  * `<name>.excalidraw`  editable Excalidraw canvas (open on excalidraw.com)
  * `<name>.svg`         self-rendered vector, inlined into the HTML gallery

Fully offline: does not depend on the Excalidraw library or any network/CDN.
Run:  python3 docs/diagrams/build_diagrams.py
"""
from __future__ import annotations

import html
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent
FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif"

# role -> (fill, stroke) from the skill color palette
ROLE = {
    "ui":       ("#a5d8ff", "#1971c2"),
    "backend":  ("#d0bfff", "#7048e8"),
    "db":       ("#b2f2bb", "#2f9e44"),
    "storage":  ("#ffec99", "#f08c00"),
    "ai":       ("#e599f7", "#9c36b5"),
    "external": ("#ffc9c9", "#e03131"),
    "queue":    ("#fff3bf", "#fab005"),
    "decision": ("#ffd8a8", "#e8590c"),
    "zone":     ("#eef1f6", "#94a3b8"),
}
INK = "#1f2937"


class Scene:
    """Collects abstract primitives; renders to Excalidraw JSON and to SVG."""

    def __init__(self) -> None:
        self.prims: list[dict] = []
        self._seed = 1000

    def seed(self) -> int:
        self._seed += 7
        return self._seed

    # ---- authoring API ----
    def zone(self, x, y, w, h, label=None):
        self.prims.append({"k": "zone", "x": x, "y": y, "w": w, "h": h, "label": label})

    def box(self, x, y, w, h, lines, role="backend", shape="rect"):
        b = {"k": "box", "x": x, "y": y, "w": w, "h": h,
             "lines": lines if isinstance(lines, list) else [lines],
             "role": role, "shape": shape,
             "cx": x + w / 2, "cy": y + h / 2}
        self.prims.append(b)
        return b

    def text(self, x, y, s, size=15, color=INK, anchor="start", bold=False):
        self.prims.append({"k": "text", "x": x, "y": y, "s": s, "size": size,
                           "color": color, "anchor": anchor, "bold": bold})

    def arrow(self, a: dict, b: dict, dashed=False, label=None):
        p1 = _edge(a, b["cx"], b["cy"])
        p2 = _edge(b, a["cx"], a["cy"])
        self.prims.append({"k": "arrow", "p1": p1, "p2": p2, "dashed": dashed, "label": label})

    # ---- Excalidraw output ----
    def to_excalidraw(self) -> dict:
        els: list[dict] = []
        for p in self.prims:
            if p["k"] == "zone":
                fill, stroke = ROLE["zone"]
                els.append(_ex_rect(self.seed(), p["x"], p["y"], p["w"], p["h"], fill, stroke, opacity=40, round=True))
                if p["label"]:
                    els.append(_ex_text(self.seed(), p["x"] + 16, p["y"] + 12, p["label"], 16, "#64748b"))
            elif p["k"] == "box":
                fill, stroke = ROLE[p["role"]]
                if p["shape"] == "ellipse":
                    els.append(_ex_ellipse(self.seed(), p["x"], p["y"], p["w"], p["h"], fill, stroke))
                elif p["shape"] == "diamond":
                    els.append(_ex_diamond(self.seed(), p["x"], p["y"], p["w"], p["h"], fill, stroke))
                else:
                    els.append(_ex_rect(self.seed(), p["x"], p["y"], p["w"], p["h"], fill, stroke))
                txt = "\n".join(p["lines"])
                th = len(p["lines"]) * 20
                els.append(_ex_text(self.seed(), p["x"], p["cy"] - th / 2, txt, 15, INK,
                                    width=p["w"], align="center"))
            elif p["k"] == "text":
                els.append(_ex_text(self.seed(), p["x"], p["y"], p["s"], p["size"], p["color"],
                                    align=("center" if p["anchor"] == "middle" else "left")))
            elif p["k"] == "arrow":
                els.append(_ex_arrow(self.seed(), p["p1"], p["p2"], p["dashed"]))
        return {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
                "elements": els, "appState": {"viewBackgroundColor": "#ffffff", "gridSize": 20},
                "files": {}}

    # ---- SVG output ----
    def to_svg(self) -> str:
        minx = min(p.get("x", p.get("p1", (1e9, 0))[0] if p["k"] == "arrow" else 1e9) for p in self.prims)
        # robust bbox
        xs, ys = [], []
        for p in self.prims:
            if p["k"] in ("zone", "box"):
                xs += [p["x"], p["x"] + p["w"]]; ys += [p["y"], p["y"] + p["h"]]
            elif p["k"] == "arrow":
                xs += [p["p1"][0], p["p2"][0]]; ys += [p["p1"][1], p["p2"][1]]
            elif p["k"] == "text":
                xs += [p["x"], p["x"] + 260]; ys += [p["y"], p["y"] + 24]
        pad = 30
        minx, miny = min(xs) - pad, min(ys) - pad
        maxx, maxy = max(xs) + pad, max(ys) + pad
        w, h = maxx - minx, maxy - miny
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx:.0f} {miny:.0f} {w:.0f} {h:.0f}" '
               f'width="{w:.0f}" height="{h:.0f}" font-family="{FONT}">']
        out.append('<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" '
                    'markerUnits="userSpaceOnUse"><path d="M0,0 L9,3 L0,6 z" fill="#475569"/></marker></defs>')
        # z-order: zones, then arrows, then boxes, then text
        for p in [x for x in self.prims if x["k"] == "zone"]:
            fill, stroke = ROLE["zone"]
            out.append(f'<rect x="{p["x"]}" y="{p["y"]}" width="{p["w"]}" height="{p["h"]}" rx="18" '
                       f'fill="{fill}" fill-opacity="0.5" stroke="{stroke}" stroke-dasharray="6 6"/>')
            if p["label"]:
                out.append(_svg_text(p["x"] + 16, p["y"] + 26, p["label"], 15, "#64748b", "start", True))
        for p in [x for x in self.prims if x["k"] == "arrow"]:
            (x1, y1), (x2, y2) = p["p1"], p["p2"]
            dash = ' stroke-dasharray="7 6"' if p["dashed"] else ""
            out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                       f'stroke="#475569" stroke-width="2"{dash} marker-end="url(#ah)"/>')
            if p["label"]:
                mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                tw = len(p["label"]) * 7 + 12
                out.append(f'<rect x="{mx - tw/2:.0f}" y="{my - 12:.0f}" width="{tw}" height="20" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/>')
                out.append(_svg_text(mx, my + 3, p["label"], 12, "#475569", "middle"))
        for p in [x for x in self.prims if x["k"] == "box"]:
            fill, stroke = ROLE[p["role"]]
            out.append(_svg_shape(p, fill, stroke))
            n = len(p["lines"]); lh = 18
            y0 = p["cy"] - (n - 1) * lh / 2
            for i, ln in enumerate(p["lines"]):
                bold = i == 0
                out.append(_svg_text(p["cx"], y0 + i * lh + 5, ln, 15 if bold else 13,
                                     INK, "middle", bold))
        for p in [x for x in self.prims if x["k"] == "text"]:
            out.append(_svg_text(p["x"], p["y"], p["s"], p["size"], p["color"], p["anchor"], p["bold"]))
        out.append("</svg>")
        return "\n".join(out)


# ---------- geometry ----------
def _edge(box, tx, ty):
    cx, cy = box["cx"], box["cy"]
    dx, dy = tx - cx, ty - cy
    if dx == 0 and dy == 0:
        return (cx, cy)
    hw, hh = box["w"] / 2, box["h"] / 2
    tvals = []
    if dx != 0:
        tvals.append(hw / abs(dx))
    if dy != 0:
        tvals.append(hh / abs(dy))
    t = min(tvals)
    return (cx + dx * t, cy + dy * t)


# ---------- SVG helpers ----------
def _svg_text(x, y, s, size, color, anchor, bold=False):
    weight = "700" if bold else "500"
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" '
            f'text-anchor="{anchor}" font-weight="{weight}">{html.escape(s)}</text>')


def _svg_shape(p, fill, stroke):
    x, y, w, h = p["x"], p["y"], p["w"], p["h"]
    if p["shape"] == "ellipse":
        return f'<ellipse cx="{p["cx"]}" cy="{p["cy"]}" rx="{w/2}" ry="{h/2}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    if p["shape"] == "diamond":
        pts = f'{p["cx"]},{y} {x+w},{p["cy"]} {p["cx"]},{y+h} {x},{p["cy"]}'
        return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'


# ---------- Excalidraw helpers ----------
_BASE = {"fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid", "roughness": 0,
         "opacity": 100, "angle": 0, "isDeleted": False, "groupIds": [], "boundElements": None,
         "link": None, "locked": False, "version": 1, "versionNonce": 1}


def _ex_rect(seed, x, y, w, h, fill, stroke, opacity=100, round=True):
    e = dict(_BASE, type="rectangle", id=f"r{seed}", x=x, y=y, width=w, height=h,
             strokeColor=stroke, backgroundColor=fill, seed=seed, opacity=opacity)
    if round:
        e["roundness"] = {"type": 3}
    return e


def _ex_ellipse(seed, x, y, w, h, fill, stroke):
    return dict(_BASE, type="ellipse", id=f"e{seed}", x=x, y=y, width=w, height=h,
                strokeColor=stroke, backgroundColor=fill, seed=seed)


def _ex_diamond(seed, x, y, w, h, fill, stroke):
    return dict(_BASE, type="diamond", id=f"d{seed}", x=x, y=y, width=w, height=h,
                strokeColor=stroke, backgroundColor=fill, seed=seed)


def _ex_text(seed, x, y, text, size, color, width=None, align="left"):
    lines = text.split("\n")
    w = width if width else max(len(l) for l in lines) * size * 0.62
    return dict(_BASE, type="text", id=f"t{seed}", x=x, y=y, width=w, height=len(lines) * size * 1.25,
                text=text, originalText=text, fontSize=size, fontFamily=2, textAlign=align,
                verticalAlign="top", strokeColor=color, backgroundColor="transparent",
                seed=seed, containerId=None, lineHeight=1.25)


def _ex_arrow(seed, p1, p2, dashed=False):
    e = dict(_BASE, type="arrow", id=f"a{seed}", x=p1[0], y=p1[1],
             width=p2[0] - p1[0], height=p2[1] - p1[1], strokeColor="#475569",
             backgroundColor="transparent", seed=seed,
             points=[[0, 0], [p2[0] - p1[0], p2[1] - p1[1]]],
             startArrowhead=None, endArrowhead="arrow")
    if dashed:
        e["strokeStyle"] = "dashed"
    return e


# ================= Diagrams =================
def d_architecture() -> Scene:
    s = Scene()
    s.text(40, 34, "Kiến trúc & luồng dữ liệu Ventra SEO", 22, "#0f172a", bold=True)
    # zones
    s.zone(40, 60, 1080, 130, "Client / Agent")
    s.zone(40, 220, 1080, 150, "Cloudflare Workers · TanStack Start (React 19)")
    s.zone(40, 400, 1080, 130, "Cloudflare primitives")
    s.zone(40, 560, 1080, 150, "Data Layer · provider abstraction")
    # client
    ui = s.box(120, 95, 240, 80, ["Trình duyệt", "Dashboard UI"], "ui")
    agent = s.box(760, 95, 240, 80, ["AI Agent", "MCP client"], "ai")
    # workers
    routes = s.box(110, 255, 240, 95, ["Routes +", "Server Functions"], "backend")
    feats = s.box(440, 250, 300, 105, ["Feature Services", "keyword · rank · backlink",
                                       "audit · competitor · ai-search"], "backend")
    mcp = s.box(830, 255, 240, 95, ["MCP Server", "18 tools + skills"], "backend")
    # primitives
    d1 = s.box(80, 430, 170, 80, ["D1 / SQLite", "Drizzle"], "db")
    kv = s.box(270, 430, 150, 80, ["KV ×2"], "db")
    r2 = s.box(440, 430, 190, 80, ["R2", "Lighthouse blobs"], "storage")
    do = s.box(650, 430, 190, 80, ["Durable Objects", "chat agent"], "queue")
    wf = s.box(860, 430, 210, 80, ["Workflows + Cron", "rank · audit"], "queue")
    # data
    iface = s.box(430, 590, 300, 90, ["SEO Data Interface", "provider abstraction"], "decision", "diamond")
    dfs = s.box(80, 595, 260, 80, ["DataForSEO", "BYO-key · primary"], "external")
    fp = s.box(820, 595, 260, 80, ["First-party OAuth", "GSC · GA4 · Bing (free)"], "db")
    # flows
    s.arrow(ui, routes); s.arrow(agent, mcp)
    s.arrow(routes, feats); s.arrow(mcp, feats)
    s.arrow(feats, d1); s.arrow(feats, wf)
    s.arrow(feats, iface); s.arrow(mcp, iface, dashed=True)
    s.arrow(iface, dfs); s.arrow(iface, fp)
    return s


def d_request_flow() -> Scene:
    s = Scene()
    s.text(40, 34, "Luồng xử lý một yêu cầu (request flow)", 22, "#0f172a", bold=True)
    y = 110
    browser = s.box(40, y, 190, 90, ["Trình duyệt", "gọi RPC"], "ui")
    sfn = s.box(300, y, 190, 90, ["Server Function", "TanStack Start"], "backend")
    feat = s.box(560, y, 190, 90, ["Feature Service", "+ repository"], "backend")
    iface = s.box(820, y, 200, 90, ["SEO Data", "Interface"], "decision", "diamond")
    dfs = s.box(1090, y, 190, 90, ["DataForSEO", "API"], "external")
    cache = s.box(820, y + 190, 200, 90, ["D1 cache", "keyword_metrics"], "db")
    s.arrow(browser, sfn); s.arrow(sfn, feat); s.arrow(feat, iface); s.arrow(iface, dfs)
    s.arrow(iface, cache, dashed=True, label="cache-first")
    s.text(1090, y + 185, "hit → trả ngay từ cache", 14, "#2f9e44")
    s.text(1090, y + 212, "miss → gọi DataForSEO,", 13, "#64748b")
    s.text(1090, y + 234, "lưu cache rồi trả về UI", 13, "#64748b")
    return s


def d_agent_loop() -> Scene:
    s = Scene()
    s.text(40, 30, "Vòng lặp Agent read-WRITE — lợi thế cạnh tranh", 22, "#0f172a", bold=True)
    cx, cy, r = 470, 360, 210
    labels = [
        (["Keyword", "research"], "ai"),
        (["Content", "brief"], "ai"),
        (["Draft", "AI writing"], "ai"),
        (["On-page", "fix"], "ai"),
        (["Monitor", "GSC / GA4"], "db"),
    ]
    boxes = []
    n = len(labels)
    for i, (lines, role) in enumerate(labels):
        ang = -math.pi / 2 + i * 2 * math.pi / n
        bx = cx + r * math.cos(ang) - 100
        by = cy + r * math.sin(ang) - 45
        boxes.append(s.box(bx, by, 200, 90, lines, role))
    center = s.box(cx - 95, cy - 40, 190, 80, ["Chứng minh bằng", "dữ liệu của bạn"], "decision")
    for i in range(n):
        s.arrow(boxes[i], boxes[(i + 1) % n])
    return s


def d_phase0() -> Scene:
    s = Scene()
    s.text(40, 34, "Luồng thực thi Phase 0 (fork → M0)", 22, "#0f172a", bold=True)
    p1 = s.box(430, 90, 300, 90, ["P01 · Fork + Deploy", "đường găng"], "decision")
    p2 = s.box(120, 260, 250, 90, ["P02 · Rebrand", "→ Ventra"], "backend")
    p3 = s.box(455, 260, 250, 90, ["P03 · Strip / gate", "hosted couplings"], "backend")
    p5 = s.box(790, 260, 250, 90, ["P05 · Provider", "abstraction seam"], "backend")
    p4 = s.box(120, 430, 250, 90, ["P04 · i18n", "VN + EN"], "ui")
    p6 = s.box(455, 600, 250, 90, ["P06 · Verify", "Milestone M0"], "db")
    s.arrow(p1, p2); s.arrow(p1, p3); s.arrow(p1, p5)
    s.arrow(p2, p4)
    s.arrow(p2, p6); s.arrow(p3, p6); s.arrow(p4, p6); s.arrow(p5, p6)
    return s


def d_funnel() -> Scene:
    s = Scene()
    s.text(40, 34, "Mô hình open-core — luồng doanh thu", 22, "#0f172a", bold=True)
    free = s.box(250, 90, 560, 90, ["Free · Self-host (BYO-key)", "mồi thu hút · ~0 rủi ro chi phí dữ liệu"], "db")
    managed = s.box(330, 260, 400, 90, ["Managed Cloud · PAYG credits", "markup minh bạch 20–40% · doanh thu chính"], "ai")
    seats = s.box(400, 430, 260, 90, ["Team / Pro seats", "collaboration"], "backend")
    s.arrow(free, managed); s.arrow(managed, seats)
    s.text(840, 140, "Cộng đồng + skill marketplace", 14, "#64748b")
    s.text(840, 310, "Ventra quản lý DataForSEO + OAuth", 14, "#64748b")
    s.text(690, 480, "Không khoá dữ liệu thô sau seats", 14, "#64748b")
    return s


DIAGRAMS = {
    "01-system-architecture": (d_architecture, "Kiến trúc & luồng dữ liệu",
        "App hợp nhất TanStack Start trên Cloudflare Workers; agent và dashboard cùng đi qua feature services rồi tới data layer."),
    "02-request-flow": (d_request_flow, "Luồng xử lý một yêu cầu",
        "Mỗi truy vấn: UI → server function → feature → SEO Data Interface, ưu tiên cache D1, miss thì gọi DataForSEO."),
    "03-agent-loop": (d_agent_loop, "Vòng lặp Agent read-WRITE",
        "Agent không chỉ đọc: keyword → brief → draft → fix → monitor, lặp lại và chứng minh bằng GSC/GA4."),
    "04-phase0-flow": (d_phase0, "Luồng thực thi Phase 0",
        "P01 là đường găng; P02/P03/P05 song song; P04 sau P02; P06 chốt Milestone M0."),
    "05-business-funnel": (d_funnel, "Mô hình open-core",
        "Free self-host thu hút → Managed Cloud PAYG sinh lời → seats mở rộng; không khoá dữ liệu thô."),
}


def build():
    svgs = {}
    for key, (fn, title, desc) in DIAGRAMS.items():
        scene = fn()
        (OUT / f"{key}.excalidraw").write_text(
            json.dumps(scene.to_excalidraw(), ensure_ascii=False, indent=1), encoding="utf-8")
        svg = scene.to_svg()
        (OUT / f"{key}.svg").write_text(svg, encoding="utf-8")
        svgs[key] = (svg, title, desc)
        print(f"built {key}: .excalidraw + .svg")
    _write_html(svgs)


def _write_html(svgs: dict):
    css = """
    :root{--bg:#0b1020;--panel:#131a2e;--panel2:#0f1626;--ink:#e6eaf5;--muted:#9aa6c4;--brand:#7c3aed;--brand2:#6366f1;--accent:#22d3ee;--line:#26304d}
    *{box-sizing:border-box} html{scroll-behavior:smooth}
    body{margin:0;background:radial-gradient(1200px 600px at 80% -10%,rgba(124,58,237,.25),transparent 60%),radial-gradient(1000px 500px at -10% 10%,rgba(34,211,238,.15),transparent 55%),var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans',Arial,sans-serif}
    a{color:var(--accent);text-decoration:none} a:hover{text-decoration:underline}
    header.hero{padding:60px 24px 30px;max-width:1180px;margin:0 auto;text-align:center}
    .badge{display:inline-block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:6px 14px;margin-bottom:16px;background:var(--panel2)}
    h1{font-size:clamp(28px,5vw,48px);margin:.1em 0;line-height:1.1;background:linear-gradient(90deg,#fff,#c4b5fd 55%,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent}
    .tagline{color:var(--muted);max-width:760px;margin:12px auto 0}
    nav.toc{position:sticky;top:0;z-index:20;backdrop-filter:blur(10px);background:rgba(11,16,32,.75);border-bottom:1px solid var(--line)}
    nav.toc ul{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:1180px;margin:0 auto;padding:10px 16px;list-style:none}
    nav.toc a{color:var(--muted);font-size:13px;font-weight:600;padding:7px 12px;border-radius:10px}
    nav.toc a:hover{color:var(--ink);background:var(--panel)}
    main{max-width:1180px;margin:0 auto;padding:24px 16px 80px}
    section{margin:30px 0;background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.25)}
    section h2{margin:0 0 4px;font-size:22px;display:flex;align-items:center;gap:10px}
    section h2 .n{font-size:13px;color:var(--brand2);border:1px solid var(--line);border-radius:8px;padding:2px 8px;background:var(--panel2)}
    .sub{color:var(--muted);margin:0 0 16px}
    .diagram{background:#ffffff;border:1px solid var(--line);border-radius:12px;padding:14px;overflow:auto}
    .diagram svg{display:block;max-width:100%;height:auto;margin:0 auto}
    .src{margin-top:10px;font-size:13px;color:var(--muted)}
    footer{max-width:1180px;margin:0 auto;padding:24px 16px 60px;color:var(--muted);font-size:13px;text-align:center;border-top:1px solid var(--line)}
    code{background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:12.5px}
    """
    nav = "".join(f'<li><a href="#{k}">{html.escape(t)}</a></li>' for k, (_, t, _) in svgs.items())
    secs = []
    for i, (k, (svg, title, desc)) in enumerate(svgs.items(), 1):
        secs.append(
            f'<section id="{k}"><h2><span class="n">{i:02d}</span> {html.escape(title)}</h2>'
            f'<p class="sub">{html.escape(desc)}</p>'
            f'<div class="diagram">{svg}</div>'
            f'<p class="src">Nguồn canvas (chỉnh trên excalidraw.com): <code>docs/diagrams/{k}.excalidraw</code></p></section>')
    doc = (
        "<!DOCTYPE html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"UTF-8\"/>\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n"
        "<title>Ventra SEO — Kiến trúc & Luồng (Excalidraw)</title>\n<style>" + css + "</style>\n</head>\n<body>\n"
        "<header class=\"hero\"><div class=\"badge\">Excalidraw · 2026-07-03 · Foundation</div>"
        "<h1>Ventra SEO — Kiến trúc &amp; Các luồng đi</h1>"
        "<p class=\"tagline\">Sơ đồ Excalidraw (SVG offline) cho kiến trúc hệ thống, luồng xử lý, vòng lặp agent, "
        "kế hoạch Phase 0 và mô hình kinh doanh. File <code>.excalidraw</code> nguồn nằm trong <code>docs/diagrams/</code>.</p></header>\n"
        "<nav class=\"toc\"><ul>" + nav + "</ul></nav>\n<main>\n" + "\n".join(secs) + "\n</main>\n"
        "<footer>Tạo bằng skill <code>excalidraw</code> (file-based) · một model → <code>.excalidraw</code> + SVG · "
        "nguồn: <code>docs/project-overview-pdr.md</code>, <code>docs/project-roadmap.md</code>, "
        "<code>plans/reports/research-summary-260703-1047-ventra-seo.md</code></footer>\n</body>\n</html>\n")
    (OUT.parent / "ventra-seo-architecture-plan.html").write_text(doc, encoding="utf-8")
    print("wrote docs/ventra-seo-architecture-plan.html")


if __name__ == "__main__":
    build()
