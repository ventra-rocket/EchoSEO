#!/usr/bin/env python3
"""Build the Ventra SEO executive one-pager (self-contained HTML).

Reads the 5 diagram SVGs from this folder and inlines them (offline, no CDN),
adds detailed Vietnamese business narrative + charts drawn in pure SVG/CSS.
Output: docs/ventra-seo-vision-onepager.html

Run:  python3 docs/diagrams/build_onepager.py   (run build_diagrams.py first)
"""
from __future__ import annotations

import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent


def svg(name: str) -> str:
    p = HERE / f"{name}.svg"
    return p.read_text(encoding="utf-8") if p.exists() else f"<!-- missing {name}.svg -->"


def donut(pct: int, label: str) -> str:
    r, c = 70, 2 * math.pi * 70
    done = c * pct / 100
    return f"""<svg viewBox="0 0 180 180" width="180" height="180">
  <circle cx="90" cy="90" r="70" fill="none" stroke="#26304d" stroke-width="20"/>
  <circle cx="90" cy="90" r="70" fill="none" stroke="#34d399" stroke-width="20"
    stroke-dasharray="{done:.1f} {c-done:.1f}" stroke-dashoffset="{c/4:.1f}" transform="rotate(-90 90 90)" stroke-linecap="round"/>
  <text x="90" y="86" text-anchor="middle" font-size="34" font-weight="800" fill="#e6eaf5">{pct}%</text>
  <text x="90" y="112" text-anchor="middle" font-size="12" fill="#9aa6c4">{label}</text>
</svg>"""


def bars(rows, unit, note=""):
    mx = max(v for _, v, _ in rows) or 1
    out = ['<div class="bars">']
    for label, val, color in rows:
        w = max(3, val / mx * 100)
        out.append(
            f'<div class="bar-row"><span class="bar-label">{label}</span>'
            f'<span class="bar-track"><span class="bar-fill" style="width:{w:.1f}%;background:{color}"></span></span>'
            f'<span class="bar-val">{unit}{val:g}</span></div>')
    out.append("</div>")
    if note:
        out.append(f'<p class="chart-note">{note}</p>')
    return "\n".join(out)


CSS = """
:root{--bg:#0b1020;--panel:#131a2e;--panel2:#0f1626;--ink:#e6eaf5;--muted:#9aa6c4;--brand:#7c3aed;--brand2:#6366f1;--accent:#22d3ee;--ok:#34d399;--warn:#fbbf24;--danger:#f87171;--line:#26304d}
*{box-sizing:border-box} html{scroll-behavior:smooth}
body{margin:0;background:radial-gradient(1300px 700px at 82% -12%,rgba(124,58,237,.28),transparent 60%),radial-gradient(1100px 560px at -12% 8%,rgba(34,211,238,.16),transparent 55%),var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans',Arial,sans-serif}
a{color:var(--accent);text-decoration:none} a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header.hero{padding:70px 20px 34px;text-align:center}
.badge{display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:6px 14px;margin-bottom:18px;background:var(--panel2)}
h1{font-size:clamp(32px,6vw,60px);margin:.08em 0;line-height:1.06;background:linear-gradient(90deg,#fff,#c4b5fd 52%,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero .lead{color:#cdd5ea;font-size:clamp(16px,2.4vw,22px);max-width:820px;margin:14px auto 0}
.hero .oneliner{color:var(--muted);max-width:760px;margin:14px auto 0;font-style:italic}
nav.toc{position:sticky;top:0;z-index:30;backdrop-filter:blur(10px);background:rgba(11,16,32,.8);border-bottom:1px solid var(--line)}
nav.toc ul{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:1080px;margin:0 auto;padding:9px 12px;list-style:none}
nav.toc a{color:var(--muted);font-size:12.5px;font-weight:600;padding:6px 10px;border-radius:9px}
nav.toc a:hover{color:var(--ink);background:var(--panel)}
section{padding:40px 0;border-top:1px solid var(--line);scroll-margin-top:56px}
.kicker{font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand2);font-weight:800;margin:0 0 6px}
h2{font-size:clamp(22px,3.4vw,32px);margin:0 0 8px;line-height:1.15}
.sub{color:var(--muted);margin:0 0 22px;max-width:820px}
p{margin:0 0 14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:8px 0}
.stat{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0;overflow:hidden}
.stat .big{font-size:clamp(21px,2.5vw,26px);font-weight:800;line-height:1.14;letter-spacing:-.01em;overflow-wrap:anywhere;background:linear-gradient(90deg,#fff,#a5b4fc);-webkit-background-clip:text;background-clip:text;color:transparent}
.stat .big .star{font-size:.55em;-webkit-text-fill-color:#fbbf24;color:#fbbf24;vertical-align:.5em;margin-left:2px}
.stat .cap{color:var(--muted);font-size:13px;margin-top:4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:820px){.cols,.cols3{grid-template-columns:1fr}}
.card{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:14px;padding:18px}
.card h4{margin:0 0 8px;font-size:16px;display:flex;gap:8px;align-items:center}
.card p{margin:0;color:#c8d0e6;font-size:14.5px}
.diagram{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;overflow:auto;margin:8px 0}
.diagram svg{display:block;max-width:100%;height:auto;margin:0 auto}
table{width:100%;border-collapse:collapse;font-size:14px;margin:6px 0}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-size:12px;letter-spacing:.04em;text-transform:uppercase}
td strong{color:#fff}
.pill{display:inline-block;font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;border:1px solid var(--line)}
.ok{color:var(--ok);border-color:rgba(52,211,153,.4);background:rgba(52,211,153,.09)}
.warn{color:var(--warn);border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.09)}
.danger{color:var(--danger);border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.09)}
.bars{margin:8px 0}
.bar-row{display:flex;align-items:center;gap:12px;margin:9px 0}
.bar-label{width:150px;font-size:13.5px;color:#cdd5ea;text-align:right;flex:none}
.bar-track{flex:1;background:var(--panel2);border:1px solid var(--line);border-radius:8px;height:24px;overflow:hidden}
.bar-fill{display:block;height:100%;border-radius:8px}
.bar-val{width:80px;font-size:13.5px;font-weight:700;color:#fff;flex:none}
.chart-note{color:var(--muted);font-size:13px;margin-top:8px}
.chart-wrap{display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.note{border-left:3px solid var(--brand);background:rgba(124,58,237,.09);padding:12px 16px;border-radius:0 10px 10px 0;color:#dfe4f3;font-size:14.5px;margin:14px 0}
.note.warn{border-color:var(--warn);background:rgba(251,191,36,.08)}
ul.clean{margin:8px 0 0;padding-left:20px} ul.clean li{margin:7px 0;color:#cdd5ea}
.ask{background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(34,211,238,.10));border:1px solid var(--brand2);border-radius:16px;padding:24px}
footer{padding:30px 0 70px;color:var(--muted);font-size:13px;text-align:center;border-top:1px solid var(--line)}
code{background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:12.5px}
.phases{display:flex;flex-direction:column;gap:16px;margin-top:8px}
.phase{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-left-width:4px;border-radius:14px;padding:18px 20px}
.phase-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:4px}
.phase-head .pnum{font-size:12px;font-weight:800;letter-spacing:.12em;color:var(--muted)}
.phase-head h4{margin:0;font-size:18px}
.phase-dur{margin-left:auto;font-size:12.5px;font-weight:700;color:#0b1020;background:#a5b4fc;border-radius:999px;padding:3px 12px}
.phase .goal{color:#cdd5ea;font-size:14.5px;margin:4px 0 12px}
.worklist{display:grid;grid-template-columns:1fr 1fr;gap:2px 22px;margin:0;padding:0}
@media(max-width:820px){.worklist{grid-template-columns:1fr}}
.worklist li{margin:5px 0;color:#c8d0e6;font-size:14px;list-style:none;padding-left:18px;position:relative}
.worklist li:before{content:"\\25B9";position:absolute;left:0;color:var(--brand2)}
.phase .exit{margin-top:12px;font-size:13.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:10px}
.phase .exit b{color:var(--ok)}
"""

STATS = "".join([
    ('<div class="stat"><div class="big">~4.000<span class="star">★</span></div><div class="cap">OpenSEO trên GitHub · MIT · nền tảng để fork</div></div>'),
    ('<div class="stat"><div class="big">~55%</div><div class="cap">tính năng nền tảng đã có sẵn từ ngày đầu</div></div>'),
    ('<div class="stat"><div class="big">$0,0006</div><div class="cap">chi phí mỗi truy vấn SERP (DataForSEO)</div></div>'),
    ('<div class="stat"><div class="big">~50%</div><div class="cap">truy vấn Google đã có AI Overviews</div></div>'),
    ('<div class="stat"><div class="big">1–3 tuần</div><div class="cap">ước tính tới bản MVP đổi thương hiệu</div></div>'),
    ('<div class="stat"><div class="big">2 ngôn ngữ</div><div class="cap">Việt + Anh ngay từ đầu</div></div>'),
])

PRICING = bars([
    ("Semrush", 139.95, "#f87171"),
    ("Moz", 99, "#fbbf24"),
    ("Ubersuggest", 12, "#60a5fa"),
    ("Ventra (self-host)", 0, "#34d399"),
], unit="$", note="Giá thuê bao/tháng của các suite. Ventra self-host miễn phí — người dùng chỉ trả chi phí dữ liệu thực dùng (BYO-key).")

COST = bars([
    ("SerpApi (~)", 7.0, "#f87171"),
    ("DataForSEO", 0.6, "#34d399"),
], unit="$", note="Chi phí xấp xỉ cho mỗi 1.000 truy vấn SERP — DataForSEO rẻ hơn 10–16× ở quy mô lớn, lại kèm sẵn CSDL từ khoá + backlink.")

TMPL = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Ventra SEO — Tầm nhìn & Định hướng</title>
<style>%%CSS%%</style>
</head>
<body>
<header class="hero"><div class="wrap">
  <div class="badge">Tài liệu định hướng · 2026-07-03 · Bản nháp nội bộ</div>
  <h1>Ventra SEO</h1>
  <p class="lead">Nền tảng SEO <b>mở</b> và <b>agent-native</b> — tự host được, thay thế Semrush/Ahrefs, xây trên nền mã nguồn mở đã trưởng thành.</p>
  <p class="oneliner">"Nền tảng SEO mở không chỉ trả lời câu hỏi — nó tự làm việc và chứng minh kết quả bằng chính dữ liệu Search Console của bạn."</p>
</div></header>

<nav class="toc"><div class="wrap"><ul>
  <li><a href="#tldr">Tóm tắt</a></li>
  <li><a href="#problem">Vấn đề</a></li>
  <li><a href="#market">Cơ hội</a></li>
  <li><a href="#solution">Giải pháp</a></li>
  <li><a href="#moat">Lợi thế</a></li>
  <li><a href="#feasible">Khả thi</a></li>
  <li><a href="#arch">Kiến trúc</a></li>
  <li><a href="#agent">Agent</a></li>
  <li><a href="#business">Kinh doanh</a></li>
  <li><a href="#roadmap">Lộ trình</a></li>
  <li><a href="#plan">Kế hoạch phase</a></li>
  <li><a href="#risk">Rủi ro</a></li>
  <li><a href="#kpi">KPI</a></li>
  <li><a href="#next">Định hướng</a></li>
</ul></div></nav>

<main class="wrap">

<section id="tldr">
  <p class="kicker">Tóm tắt điều hành</p>
  <h2>Cơ hội xây một nền tảng SEO thế hệ mới với chi phí và rủi ro thấp</h2>
  <p class="sub">Thay vì xây từ đầu (4–8 tháng), chúng ta <b>fork</b> OpenSEO — một dự án mã nguồn mở MIT đã trưởng thành (~74k dòng code, ~4.000★, cập nhật hàng tuần) đã giải quyết sẵn phần khó nhất, rồi khác biệt hoá bằng lớp AI-agent, dữ liệu bên-thứ-nhất và song ngữ Việt–Anh.</p>
  <div class="stats">%%STATS%%</div>
  <div class="note">Điểm mấu chốt: ~55% nền tảng đã có sẵn; hầu hết phần còn lại là <b>xây sản phẩm, không phải nghiên cứu</b> vì lớp dữ liệu (DataForSEO) đã lo phần khó. Lợi thế bền vững nằm ở <b>vòng lặp agent read-write + hợp nhất dữ liệu người dùng + kinh tế mã nguồn mở</b> — thứ các ông lớn khó sao chép vì sẽ tự ăn vào doanh thu thuê bao của họ.</div>
</section>

<section id="problem">
  <p class="kicker">01 · Bối cảnh &amp; Vấn đề</p>
  <h2>Công cụ SEO vừa đắt, vừa lỗi thời trước làn sóng AI</h2>
  <div class="cols3">
    <div class="card"><h4>💸 Chi phí cao</h4><p>Các suite phổ biến $99–$500/tháng, khoá người dùng vào thuê bao và không cho sở hữu dữ liệu của chính mình.</p></div>
    <div class="card"><h4>🤖 Search đang đổi</h4><p>~50% truy vấn Google đã hiển thị AI Overviews; ChatGPT/Perplexity trở thành cửa ngõ mới. "Hiển thị trong AI" là hạng mục tăng nhanh nhất.</p></div>
    <div class="card"><h4>🔒 Chỉ đọc, không làm</h4><p>Các công cụ (kể cả bản MCP của Semrush/Ahrefs) chỉ <b>đọc</b> dữ liệu. Người dùng vẫn phải tự viết, tự sửa, tự theo dõi thủ công.</p></div>
  </div>
</section>

<section id="market">
  <p class="kicker">02 · Cơ hội thị trường</p>
  <h2>Khoảng trống: mở, agent-native, và bản địa hoá</h2>
  <p class="sub">Thị trường SEO tools do vài ông lớn thống trị trên diện rộng, nhưng để hở đúng ba lớp mà một đội nhỏ có thể chiếm.</p>
  <div class="cols">
    <div>
      <ul class="clean">
        <li><b>Mở &amp; tự host</b> — gần như không đối thủ lớn nào cho tự host + sở hữu dữ liệu.</li>
        <li><b>Agent-native (read-write)</b> — các ông lớn ngại trao quyền "ghi/xuất bản" cho agent vì làm rỗng dashboard của họ.</li>
        <li><b>AI-search / GEO visibility</b> — hạng mục mới nhất, tăng nhanh nhất; OpenSEO đã có nền tảng sẵn.</li>
        <li><b>Thị trường Việt Nam</b> — hầu như chưa có công cụ SEO bản địa hoá tiếng Việt.</li>
      </ul>
    </div>
    <div class="card">
      <h4>Giá thuê bao hàng tháng của đối thủ</h4>
      %%PRICING%%
    </div>
  </div>
  <div class="note warn">Không đua thứ bất khả thi: quy mô chỉ số backlink (Ahrefs ~500M referring domains) hay bề rộng PPC/social của Semrush. Ta <b>mua</b> dữ liệu đó qua DataForSEO và thắng ở độ mở + agent + giá.</div>
</section>

<section id="solution">
  <p class="kicker">03 · Giải pháp</p>
  <h2>Ventra: dashboard mạnh + lớp agent tự làm việc</h2>
  <p class="sub">Đầy đủ nghiệp vụ SEO cốt lõi trong một sản phẩm, với hai "mặt": bảng điều khiển trực quan cho người làm, và lớp AI-agent tự động hoá phần lặp đi lặp lại — cân bằng, cả hai đều là công dân hạng nhất.</p>
  <table>
    <thead><tr><th>Nhóm tính năng</th><th>MVP</th><th>V1</th><th>Sau</th></tr></thead>
    <tbody>
      <tr><td>Nghiên cứu &amp; nhóm từ khoá · rank tracking · backlink · audit · đối thủ · GSC</td><td><span class="pill ok">✓</span></td><td></td><td></td></tr>
      <tr><td>MCP server + agent skills (hỗ trợ) · AI-search visibility (cơ bản)</td><td><span class="pill ok">✓</span></td><td></td><td></td></tr>
      <tr><td>Song ngữ Việt + Anh</td><td><span class="pill ok">✓</span></td><td></td><td></td></tr>
      <tr><td>Tối ưu nội dung on-page · audit sâu theo lịch · rank local + SERP features · GA4/Bing · báo cáo white-label · Managed Cloud · vòng lặp agent read-write</td><td></td><td><span class="pill warn">✓</span></td><td></td></tr>
      <tr><td>Programmatic SEO · pipeline agent tự chủ · đa tenant cho agency</td><td></td><td></td><td><span class="pill">✓</span></td></tr>
    </tbody>
  </table>
</section>

<section id="moat">
  <p class="kicker">04 · Lợi thế cạnh tranh</p>
  <h2>"Agent-native" chưa đủ — hào nằm ở read-WRITE + dữ liệu + kinh tế mở</h2>
  <table>
    <thead><tr><th>Tiêu chí</th><th>Semrush / Ahrefs</th><th>OpenSEO (nền)</th><th>Ventra</th></tr></thead>
    <tbody>
      <tr><td>Agent truy cập</td><td>MCP chỉ đọc</td><td>MCP chỉ đọc</td><td><strong>Vòng lặp read-WRITE</strong></td></tr>
      <tr><td>Hợp nhất dữ liệu GSC/GA4</td><td>Hạn chế</td><td>Chỉ GSC</td><td><strong>GSC+GA4+Bing trong ngữ cảnh agent</strong></td></tr>
      <tr><td>Mở / tự host</td><td>Không</td><td>Có (MIT)</td><td><strong>Có (MIT)</strong></td></tr>
      <tr><td>Chi phí</td><td>$99–500/tháng</td><td>BYO-key</td><td><strong>BYO-key → Managed PAYG</strong></td></tr>
      <tr><td>Song ngữ VN/EN</td><td>EN</td><td>EN</td><td><strong>VN + EN</strong></td></tr>
    </tbody>
  </table>
  <div class="cols3" style="margin-top:16px">
    <div class="card"><h4>🔁 Read-WRITE</h4><p>Agent tự chạy: từ khoá → brief → viết → sửa on-page → theo dõi. Đối thủ ngại làm vì disrupt chính họ.</p></div>
    <div class="card"><h4>🧬 Hợp nhất dữ liệu</h4><p>Trộn click/impression GSC + conversion GA4 + dữ liệu đối thủ trong một ngữ cảnh agent.</p></div>
    <div class="card"><h4>🌐 Kinh tế mở</h4><p>BYO-key + mã nguồn mở + cộng đồng skill marketplace = hiệu ứng mạng, không lock-in.</p></div>
  </div>
</section>

<section id="feasible">
  <p class="kicker">05 · Vì sao nhanh &amp; rẻ</p>
  <h2>Đứng trên vai một dự án đã trưởng thành</h2>
  <div class="chart-wrap">
    <div>%%DONUT%%</div>
    <div style="flex:1;min-width:280px">
      <p>OpenSEO đã dựng sẵn phần khó và tốn kém: tích hợp DataForSEO (7 nhóm API), MCP server 18 công cụ, 7 agent skills, rank tracking theo lịch, crawler audit + Lighthouse, tích hợp GSC, tính năng AI-Visibility, và cơ chế xác thực 3 chế độ.</p>
      <p style="color:var(--muted)">Phần còn thiếu (tối ưu nội dung, audit sâu, GA4/Bing, báo cáo white-label) đều là <b>độ khó thấp–trung bình</b> ở tầng sản phẩm — không phải bài toán nghiên cứu dữ liệu.</p>
    </div>
  </div>
</section>

<section id="arch">
  <p class="kicker">06 · Kiến trúc hệ thống</p>
  <h2>Một ứng dụng hợp nhất, chạy hoàn toàn trên Cloudflare</h2>
  <p class="sub">TanStack Start (React 19) chạy trên Cloudflare Workers; dữ liệu ở D1/SQLite; tác vụ nền qua Workflows + cron; dữ liệu SEO qua DataForSEO sau một lớp trừu tượng để không lệ thuộc một nhà cung cấp.</p>
  <div class="diagram">%%SVG_ARCH%%</div>
</section>

<section id="agent">
  <p class="kicker">07 · Cách agent hoạt động</p>
  <h2>Vòng lặp read-WRITE — trái tim khác biệt của Ventra</h2>
  <div class="diagram">%%SVG_AGENT%%</div>
  <p class="sub" style="margin-top:14px">Và bên dưới, mỗi truy vấn đi qua lớp cache-first để tối ưu chi phí dữ liệu:</p>
  <div class="diagram">%%SVG_REQ%%</div>
</section>

<section id="business">
  <p class="kicker">08 · Mô hình kinh doanh</p>
  <h2>Open-core: miễn phí thu hút → managed sinh lời</h2>
  <div class="cols">
    <div class="diagram" style="background:#fff">%%SVG_FUNNEL%%</div>
    <div class="card">
      <h4>Đơn vị kinh tế</h4>
      %%COST%%
      <p style="margin-top:10px;color:var(--muted);font-size:13.5px">Managed Cloud tính credit với markup minh bạch 20–40% trên chi phí dữ liệu + tiện lợi; seats chỉ tính cho giá trị cộng tác, không khoá dữ liệu thô.</p>
    </div>
  </div>
</section>

<section id="roadmap">
  <p class="kicker">09 · Lộ trình &amp; cột mốc</p>
  <h2>Từ fork đến sản phẩm bán được</h2>
  <div class="diagram">%%SVG_PHASE%%</div>
  <table>
    <thead><tr><th>Mốc</th><th>Giai đoạn</th><th>Hoàn thành khi</th></tr></thead>
    <tbody>
      <tr><td><strong>M0 · Ventra chạy</strong></td><td>Phase 0 (1–3 tuần)</td><td>App đổi thương hiệu, tự host trên Cloudflare, song ngữ, đã track upstream</td></tr>
      <tr><td><strong>M1 · MVP</strong></td><td>~4–8 tuần</td><td>Tính năng kế thừa + lớp agent + VN/EN + quick-wins; phát hành mã nguồn mở</td></tr>
      <tr><td><strong>M2 · Nội dung + audit</strong></td><td>V1</td><td>Engine tối ưu nội dung + audit sâu theo lịch</td></tr>
      <tr><td><strong>M3 · Bật doanh thu</strong></td><td>V1</td><td>Managed Cloud PAYG (beta) + báo cáo white-label</td></tr>
      <tr><td><strong>M4 · Vòng lặp tự động</strong></td><td>V1→Sau</td><td>Agent read-write GA kèm guardrails</td></tr>
      <tr><td><strong>M5 · Mở rộng quy mô</strong></td><td>Sau</td><td>Programmatic SEO hoặc đa tenant cho agency</td></tr>
    </tbody>
  </table>
  <p class="chart-note">Ước tính cho đội nhỏ (~2–4 người). Sẽ chuẩn hoá lại mốc thời gian sau M0 khi biết vận tốc thực tế với Cloudflare.</p>
</section>

<section id="plan">
  <p class="kicker">10 · Kế hoạch chi tiết các phase</p>
  <h2>Làm gì trong từng giai đoạn</h2>
  <p class="sub">Sắp theo phạm vi, không khoá ngày. Mỗi phase có mục tiêu, hạng mục công việc chính và điều kiện hoàn thành rõ ràng.</p>
  <div class="phases">

    <div class="phase" style="border-left-color:#e8590c">
      <div class="phase-head"><span class="pnum">PHASE 0</span><h4>Fork &amp; Foundation</h4><span class="phase-dur">1–3 tuần · M0</span></div>
      <p class="goal">Mục tiêu: một Ventra chạy được — đổi thương hiệu, song ngữ, tự host trên Cloudflare, sẵn "khe" cho tính năng sau.</p>
      <ul class="worklist">
        <li>Fork OpenSEO + track remote <code>upstream</code></li>
        <li>Dựng hạ tầng Cloudflare (D1/KV/R2/DO/Workflows) + deploy self-host</li>
        <li>Đổi thương hiệu → Ventra (UI, MCP tools, skills, web, wrangler)</li>
        <li>Tách/ẩn coupling hosted (PostHog/Loops/Reddit/Autumn) sau cờ <code>hosted</code></li>
        <li>Dựng khung i18n VN + EN, tách chuỗi, seed bản dịch Việt</li>
        <li>Thêm lớp provider-abstraction cho DataForSEO</li>
      </ul>
      <p class="exit"><b>Hoàn thành khi:</b> app đổi thương hiệu, song ngữ, self-host chạy trên Cloudflare, CI xanh (prettier/knip/tsc/oxlint + test), đã track upstream.</p>
    </div>

    <div class="phase" style="border-left-color:#1971c2">
      <div class="phase-head"><span class="pnum">PHASE 1 · MVP</span><h4>Lõi SEO agent-native (open-core)</h4><span class="phase-dur">~4–8 tuần · M1</span></div>
      <p class="goal">Mục tiêu: phát hành một sản phẩm mã nguồn mở mạch lạc, khác biệt. ~80% kế thừa — công sức nằm ở hoàn thiện, agent panel, song ngữ và các quick-win.</p>
      <ul class="worklist">
        <li>Hoàn thiện: keyword + cluster, rank global, backlink</li>
        <li>Audit cơ bản + Lighthouse/CWV, competitor, GSC</li>
        <li>MCP + agent skills (hỗ trợ) + AI-search visibility cơ bản</li>
        <li>UX cân bằng: dashboard chỉn chu + agent panel hạng nhất</li>
        <li>Song ngữ VN + EN cho toàn bộ surface MVP</li>
        <li>Quick-win: rank loop theo lịch + cảnh báo (SerpBear)</li>
        <li>Quick-win: đối chiếu số liệu thực GSC (reconciliation)</li>
        <li>Quick-win: chấm nội dung "đèn giao thông" + audit phân mức</li>
      </ul>
      <p class="exit"><b>Hoàn thành khi:</b> phát hành mã nguồn mở, nút "Deploy to Cloudflare" một chạm, tài liệu; định vị = "nền tảng SEO mở, agent-native".</p>
    </div>

    <div class="phase" style="border-left-color:#9c36b5">
      <div class="phase-head"><span class="pnum">PHASE 2 · V1</span><h4>Tool → Business</h4><span class="phase-dur">~2–4 tháng · M2–M4</span></div>
      <p class="goal">Mục tiêu: biến công cụ tự host thành sản phẩm bán được; mở tier doanh thu và hào read-write.</p>
      <ul class="worklist">
        <li>Engine tối ưu nội dung on-page (brief · entity/NLP · score · AI writing · internal link)</li>
        <li>Audit sâu theo lịch (indexation · schema · robots/sitemap · broken link)</li>
        <li>Rank local + SERP features (gồm hiện diện AI Overview)</li>
        <li>Tích hợp GA4 + Bing Webmaster (tái dùng pattern GSC)</li>
        <li>Báo cáo white-label + dashboard cho agency</li>
        <li>Managed Cloud (PAYG credits, markup 20–40%)</li>
        <li>Vòng lặp agent read-write (guardrails + eval harness)</li>
        <li>Đào sâu GEO/AI-search (prompt tracking, LLM mention)</li>
      </ul>
      <p class="exit"><b>Hoàn thành khi:</b> managed cloud beta, agency white-label được, agent tự làm end-to-end. <span style="color:var(--warn)">M3 phụ thuộc điều khoản resale của DataForSEO.</span></p>
    </div>

    <div class="phase" style="border-left-color:#64748b">
      <div class="phase-head"><span class="pnum">PHASE 3 · SAU</span><h4>Tự động hoá trần cao</h4><span class="phase-dur">M5 · khi core ổn định</span></div>
      <p class="goal">Mục tiêu: khai thác các hạng mục xây nặng nhưng tiềm năng lớn — chỉ làm khi lõi vững và nhu cầu đã được xác thực.</p>
      <ul class="worklist">
        <li>Programmatic SEO engine (template + dataset → publish + index monitor + guardrail thin-content)</li>
        <li>Pipeline agent tự chủ (research → publish → monitor → recover)</li>
        <li>Đa tenant cho agency + skill marketplace</li>
        <li>Cân nhắc lộ trình portability off-Cloudflare (nếu cần)</li>
      </ul>
      <p class="exit"><b>Ngoài phạm vi (YAGNI):</b> dữ liệu PPC, theo dõi social, bề rộng marketing-suite; sở hữu backlink index; hạ tầng scraping proxy.</p>
    </div>

  </div>
</section>

<section id="risk">
  <p class="kicker">11 · Rủi ro &amp; giảm thiểu</p>
  <h2>Nhìn thẳng vào rủi ro</h2>
  <table>
    <thead><tr><th>Rủi ro</th><th>Mức</th><th>Giảm thiểu</th></tr></thead>
    <tbody>
      <tr><td>Lệ thuộc hạ tầng Cloudflare (D1/DO/Workflows)</td><td><span class="pill warn">Trung bình</span></td><td>Đánh đổi có chủ đích để đi nhanh; giữ các "khe" DB/provider sạch để chuyển đổi sau</td></tr>
      <tr><td>Điều khoản DataForSEO về bán lại đa tenant</td><td><span class="pill warn">Cần xác minh</span></td><td>Kiểm tra ToS trước khi mở tier Managed; phương án dự phòng: mỗi tenant tự dùng key</td></tr>
      <tr><td>Lệ thuộc một nhà cung cấp dữ liệu</td><td><span class="pill warn">Trung bình</span></td><td>Lớp provider-abstraction từ Phase 0; có thể thêm ScaleSERP/Bright Data</td></tr>
      <tr><td>Google siết scraping (vụ kiện SerpApi 12/2025)</td><td><span class="pill">Theo dõi</span></td><td>Dùng aggregator (rủi ro phân tán) + dữ liệu bên-thứ-nhất; tránh SerpApi</td></tr>
      <tr><td>i18n &amp; posture cân bằng tăng phạm vi MVP</td><td><span class="pill">Thấp</span></td><td>Tái dùng dashboard sẵn có; i18n dựng khung ở Phase 0, dịch tăng dần</td></tr>
    </tbody>
  </table>
  <div class="note">License đã xác nhận <b>MIT</b> — việc thương mại hoá bản managed hoàn toàn hợp lệ.</div>
</section>

<section id="kpi">
  <p class="kicker">12 · KPI &amp; mục tiêu</p>
  <h2>Đo lường thành công</h2>
  <div class="cols3">
    <div class="card"><h4>⭐ North star</h4><p>Số instance tự host hoạt động hàng tuần có chạy ≥1 workflow agent.</p></div>
    <div class="card"><h4>⚡ Activation</h4><p>% cài đặt kết nối GSC + chạy tác vụ agent đầu tiên — mục tiêu ≥ 40%.</p></div>
    <div class="card"><h4>🔁 Retention</h4><p>% instance còn hoạt động ở ngày 30 — mục tiêu ≥ 30%.</p></div>
  </div>
</section>

<section id="next">
  <p class="kicker">13 · Định hướng &amp; bước kế tiếp</p>
  <h2>Đề xuất: đồng thuận khởi động Phase 0</h2>
  <div class="ask">
    <p>Chúng ta có một cơ hội hiếm: xây một nền tảng SEO thế hệ mới với <b>rủi ro thấp và tốc độ cao</b>, nhờ đứng trên một nền mã nguồn mở đã trưởng thành và một khác biệt hoá rõ ràng (agent read-write + dữ liệu người dùng + mở + song ngữ).</p>
    <p style="margin-bottom:0"><b>Định hướng đề xuất:</b> khởi động <b>Phase 0 (Fork &amp; Foundation, 1–3 tuần)</b> để đạt mốc M0 — một Ventra chạy được, đổi thương hiệu, song ngữ, tự host trên Cloudflare — rồi cùng đánh giá lại trước khi cam kết nguồn lực cho MVP.</p>
    <ul class="clean" style="margin-top:14px">
      <li>Cần chuẩn bị: fork OpenSEO, tài khoản Cloudflare, một API key DataForSEO để thử.</li>
      <li>Quyết định đã chốt: fork trên Cloudflare · open-core prosumer · song ngữ VN+EN · posture cân bằng dashboard + agent.</li>
    </ul>
  </div>
</section>

</main>
<footer>Ventra SEO · tài liệu định hướng nội bộ · dựa trên nghiên cứu tại
<code>plans/reports/research-summary-260703-1047-ventra-seo.md</code> ·
sơ đồ: <code>docs/diagrams/*.excalidraw</code></footer>
</body>
</html>
"""


def build():
    out = TMPL
    repl = {
        "%%CSS%%": CSS,
        "%%STATS%%": STATS,
        "%%PRICING%%": PRICING,
        "%%COST%%": COST,
        "%%DONUT%%": donut(55, "đã có sẵn"),
        "%%SVG_ARCH%%": svg("01-system-architecture"),
        "%%SVG_REQ%%": svg("02-request-flow"),
        "%%SVG_AGENT%%": svg("03-agent-loop"),
        "%%SVG_PHASE%%": svg("04-phase0-flow"),
        "%%SVG_FUNNEL%%": svg("05-business-funnel"),
    }
    for k, v in repl.items():
        out = out.replace(k, v)
    dest = DOCS / "ventra-seo-vision-onepager.html"
    dest.write_text(out, encoding="utf-8")
    print(f"wrote {dest}")


if __name__ == "__main__":
    build()
