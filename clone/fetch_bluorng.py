#!/usr/bin/env python3
import urllib.request
import ssl
import re
import traceback

log = open("fetch_log.txt", "w", encoding="utf-8")

def p(msg):
    print(msg)
    log.write(msg + "\n")
    log.flush()

try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = "https://bluorng.com/collections/new-in"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    with open("bluorng-new-in.html", "w", encoding="utf-8") as f:
        f.write(html)

    p(f"Downloaded {len(html)} bytes")

    keywords = ["flashlight", "torch", "Advance Filters", "mobile-facets", "facets__open", "icon-flashlight", "advance-filter", "advance_filter"]
    for kw in keywords:
        matches = [(m.start(), html[max(0,m.start()-80):m.end()+400]) for m in re.finditer(re.escape(kw), html, re.I)]
        if matches:
            p(f"\n=== {kw}: {len(matches)} matches ===")
            for i, (pos, snippet) in enumerate(matches[:5]):
                p(f"  [{i}] pos {pos}:")
                p(snippet[:600])

    css_urls = re.findall(r'//bluorng\.com/cdn/shop/t/\d+/assets/[^"\']+\.css[^"\']*', html)
    css_urls = ["https:" + u if u.startswith("//") else u for u in dict.fromkeys(css_urls)]
    p(f"\n=== CSS assets ({len(css_urls)}) ===")
    for u in css_urls:
        p(u)

    js_urls = re.findall(r'//bluorng\.com/cdn/shop/t/\d+/assets/[^"\']+\.js[^"\']*', html)
    js_urls = ["https:" + u if u.startswith("//") else u for u in dict.fromkeys(js_urls)]
    p(f"\n=== JS assets ({len(js_urls)}) ===")
    for u in js_urls:
        p(u)

    # Find SVG near Advance Filters
    for m in re.finditer(r'Advance Filters', html, re.I):
        start = max(0, m.start() - 2000)
        end = min(len(html), m.end() + 500)
        p(f"\n=== Context around 'Advance Filters' at {m.start()} ===")
        p(html[start:end])
        break

except Exception as e:
    p(f"ERROR: {e}")
    p(traceback.format_exc())
finally:
    log.close()
