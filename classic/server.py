#!/usr/bin/env python3
# ChartForge 本地服务：零依赖静态服务器 + /api/brand 品牌色提取代理
import http.server
import socketserver
import urllib.request
import urllib.parse
import re
import json
import os
from collections import Counter

PORT = int(os.environ.get("PORT", "8000"))


def extract_brand(html):
    """极简品牌色提取：统计页面内 #rrggbb 出现频次，取前两名作为主/辅色；
    并读取 <meta name=theme-color> 与内联 font-family。"""
    colors = re.findall(r'#([0-9a-fA-F]{6})', html)
    cnt = Counter(c.lower() for c in colors)
    top = [f"#{c}" for c, _ in cnt.most_common(3)]
    accent = top[0] if len(top) > 0 else "#2F6FED"
    accent2 = top[1] if len(top) > 1 else "#F5803E"

    theme_color = re.search(r'<meta[^>]+name=["\']theme-color["\'][^>]+content=["\'](#?[0-9a-fA-F]{6})["\']', html)
    if theme_color:
        accent = theme_color.group(1) if theme_color.group(1).startswith("#") else "#" + theme_color.group(1)

    font = re.search(r'font-family:\s*([^;"\']+)', html)
    font_stack = "'Inter','Helvetica Neue',Arial,sans-serif"
    if font:
        fam = font.group(1).split(",")[0].strip().strip("'\"")
        font_stack = f"'{fam}','Helvetica Neue',Arial,sans-serif"
    return {"accent": accent, "accent2": accent2, "font": font_stack}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/brand":
            qs = urllib.parse.parse_qs(parsed.query)
            url = qs.get("url", [""])[0]
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ChartForgeBot/0.1"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    html = resp.read().decode("utf-8", "ignore")
                data = extract_brand(html)
                body = json.dumps(data).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"ChartForge 运行中 → http://localhost:{PORT}")
        httpd.serve_forever()
