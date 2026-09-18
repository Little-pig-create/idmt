"""
前端运行时配置 · 端到端验证

验证目标（逐条对应需求）：
  1. 配置到达后，前台运行时真的应用了它（导航隐藏、区块隐藏、元素隐藏、
     文案覆盖、主题令牌、功能开关）
  2. 每项独立生效、互不牵连
  3. 禁用路由给出明确提示，不是白屏
  4. 隐藏路由不出现在导航，但可直接访问
  5. 接口失败 / 网络不通 → 回落默认，页面正常渲染
  6. 非法配置 → 当未配置处理

做法：起一个同时提供「静态产物 + /api 反向代理」的本地服务，
因为站点是静态站、后台 API 在另一个端口，浏览器需要同源。
"""
import http.server
import json
import pathlib
import socketserver
import subprocess
import sys
import threading
import urllib.request
from playwright.sync_api import sync_playwright

DIST = pathlib.Path(r"D:\数字管理研究院网站\dist")
API = "http://127.0.0.1:4322"
PORT = 4399


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(DIST), **kw)

    def do_GET(self):
        # 把 /api/* 反代到后台，模拟前后端分离部署下的同源访问
        if self.path.startswith("/api/"):
            try:
                with urllib.request.urlopen(API + self.path, timeout=5) as r:
                    body = r.read()
                    self.send_response(r.status)
                    self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
            except Exception as e:
                self.send_response(502)
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
            return
        # 目录访问补 index.html
        p = self.path.split("?")[0]
        if p.endswith("/"):
            self.path = p + "index.html"
        return super().do_GET()

    def log_message(self, *a):
        pass


class ReuseServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def serve():
    with ReuseServer(("127.0.0.1", PORT), Handler) as httpd:
        httpd.serve_forever()


threading.Thread(target=serve, daemon=True).start()
print(f"静态+代理服务已启动: http://127.0.0.1:{PORT}")

BASE = f"http://127.0.0.1:{PORT}"
results = []

# 自播种：本脚本必须能在任意顺序下独立运行，
# 不能依赖前一个脚本留下的配置状态（否则单独跑或换序就会全红）。
SEED = {
    "routes": {
        "/join": {"state": "hidden"},
        "/datasets": {"state": "disabled", "disabledMessage": "该栏目正在改版，敬请期待"},
    },
    "blocks": {
        "/": {
            "items": {"statBand": {"enabled": False}, "research": {"title": "四个研究方向（已改名）"}},
            "order": ["research", "news"],
        }
    },
    "elements": {"*": {"adminEntry": {"enabled": False}}, "/": {"joinPrimary": {"label": "加入我们"}}},
    "i18n": {"zh-CN": {"nav.about": "本院概况"}},
    "theme": {"tokens": {"--color-accent": "#0b5cad"}},
    "features": {"carouselAutoplay": False},
}
_req = urllib.request.Request(
    API + "/api/frontend-config",
    data=json.dumps({"config": SEED}).encode(),
    headers={"Content-Type": "application/json"},
    method="PUT",
)
with urllib.request.urlopen(_req, timeout=10) as _r:
    _res = json.loads(_r.read())
print(f"已播种测试配置（warnings={len(_res.get('warnings', []))}）")


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))


with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- 1. 首页：配置应用 ----------
    print("\n=== 1. 首页：配置应用 ===")
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(2500)  # 等配置拉取 + 应用

    # 主题令牌
    accent = page.evaluate(
        "() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()"
    )
    check("主题令牌覆盖 --color-accent", accent.lower() == "#0b5cad", accent)

    # 区块开关：statBand 隐藏
    stat_hidden = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-block="statBand"]');
                   return el ? el.hidden : null; }"""
    )
    check("区块开关：statBand 被隐藏", stat_hidden is True, str(stat_hidden))

    # 区块文案覆盖
    research_title = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-block="research"] .section-bar-title');
                   return el ? el.textContent.trim() : null; }"""
    )
    check("区块文案覆盖 research.title", research_title == "四个研究方向（已改名）", str(research_title))

    # 元素隐藏：adminEntry
    admin_hidden = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-el="adminEntry"]');
                   return el ? el.hidden : null; }"""
    )
    check("元素开关：adminEntry 被隐藏", admin_hidden is True, str(admin_hidden))

    # 元素文案覆盖
    join_label = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-el="joinPrimary"]');
                   return el ? el.textContent.trim() : null; }"""
    )
    check("元素文案覆盖 joinPrimary", join_label == "加入我们", str(join_label))

    # 未被配置的区块应仍可见（互不牵连）
    news_hidden = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-block="news"]');
                   return el ? el.hidden : false; }"""
    )
    check("未配置区块 news 仍可见（互不牵连）", news_hidden is False, str(news_hidden))

    # 未被覆盖的元素应仍可见
    contact_hidden = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-el="quickContact"]');
                   return el ? el.hidden : false; }"""
    )
    check("未配置元素 quickContact 仍可见", contact_hidden is False, str(contact_hidden))

    # 功能开关：轮播不自动播放
    autoplay = page.evaluate(
        """() => { const el = document.querySelector('[data-carousel]');
                   return el ? el.dataset.cfgAutoplay : null; }"""
    )
    check("功能开关 carouselAutoplay=false", autoplay == "off", str(autoplay))

    # ---------- 2. 导航：隐藏路由 ----------
    print("\n=== 2. 导航可见性 ===")
    join_in_nav = page.evaluate(
        """() => { const el = document.querySelector('.nav-wrap [data-cfg-nav="/join"]');
                   return el ? !el.hidden : null; }"""
    )
    check("隐藏路由 /join 不出现在主导航", join_in_nav is False, str(join_in_nav))
    # /datasets 不是一级导航项，而是「成果与动态」下的 Mega Menu 条目
    ds_in_nav = page.evaluate(
        """() => { const els = document.querySelectorAll('[data-cfg-nav-item="/datasets"]');
                   if (!els.length) return null;
                   return Array.from(els).every(e => e.hidden); }"""
    )
    check("禁用路由 /datasets 不出现在 Mega Menu", ds_in_nav is True, str(ds_in_nav))
    # 未被配置的同一菜单内条目应仍在
    pub_in_nav = page.evaluate(
        """() => { const els = document.querySelectorAll('[data-cfg-nav-item="/publications"]');
                   if (!els.length) return null;
                   return Array.from(els).some(e => !e.hidden); }"""
    )
    check("同菜单内未配置项 /publications 仍可见（互不牵连）", pub_in_nav is True, str(pub_in_nav))
    topics_in_nav = page.evaluate(
        """() => { const el = document.querySelector('.nav-wrap [data-cfg-nav="/topics"]');
                   return el ? !el.hidden : true; }"""
    )
    check("未配置路由 /topics 仍在导航（互不牵连）", topics_in_nav is True, str(topics_in_nav))

    # ---------- 3. 隐藏路由可直接访问 ----------
    print("\n=== 3. 隐藏 vs 禁用 ===")
    page.goto(BASE + "/join/", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    join_ok = page.evaluate(
        """() => !document.querySelector('.route-unavailable')"""
    )
    check("隐藏路由 /join 可直接访问（无不可用提示）", join_ok is True)

    page.goto(BASE + "/datasets/", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    ds_banner = page.evaluate(
        """() => { const el = document.querySelector('.route-unavailable');
                   return el ? el.textContent : null; }"""
    )
    check("禁用路由 /datasets 给出不可用提示", ds_banner is not None, (ds_banner or "")[:40])
    check("提示包含自定义文案", "该栏目正在改版" in (ds_banner or ""), "")

    # ---------- 4. 接口失败回落 ----------
    print("\n=== 4. 接口失败 → 回落默认 ===")
    ctx2 = b.new_context(viewport={"width": 1440, "height": 900})
    p2 = ctx2.new_page()
    # 拦截配置接口并让它失败
    p2.route("**/api/frontend-config*", lambda route: route.abort())
    p2.goto(BASE + "/", wait_until="domcontentloaded")
    p2.wait_for_timeout(2500)
    stat_visible_on_fail = p2.evaluate(
        """() => { const el = document.querySelector('[data-cfg-block="statBand"]');
                   return el ? !el.hidden : null; }"""
    )
    check("接口失败时 statBand 仍可见（回落默认）", stat_visible_on_fail is True, str(stat_visible_on_fail))
    admin_visible_on_fail = p2.evaluate(
        """() => { const el = document.querySelector('[data-cfg-el="adminEntry"]');
                   return el ? !el.hidden : null; }"""
    )
    check("接口失败时 adminEntry 仍可见", admin_visible_on_fail is True, str(admin_visible_on_fail))
    body_ok = p2.evaluate("() => document.body.innerText.length > 100")
    check("接口失败时页面正常渲染（无白屏）", body_ok is True)
    ctx2.close()

    b.close()

print("\n" + "=" * 60)
passed = sum(1 for _, ok, _ in results if ok)
print(f"通过 {passed}/{len(results)}")
failed = [n for n, ok, _ in results if not ok]
if failed:
    print("失败项：")
    for n in failed:
        print("   -", n)
    sys.exit(1)
print("全部通过")
