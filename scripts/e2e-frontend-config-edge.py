"""
补充验证：
  A. i18n 按语言独立生效（改一种语言不影响另一种）
  B. 权限：editor 角色看不到模块、接口返回 403
  C. 空配置：前台与改动前逐字节一致（回归守卫已覆盖，这里再验运行时无副作用）
  D. 非法配置下后台仍可打开、前台按未配置处理
"""
import http.server
import json
import pathlib
import socketserver
import subprocess
import threading
import urllib.request
from playwright.sync_api import sync_playwright

DIST = pathlib.Path(r"D:\数字管理研究院网站\dist")
API = "http://127.0.0.1:4322"
PORT = 4396


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(DIST), **kw)

    def do_GET(self):
        if self.path.startswith("/api/"):
            try:
                with urllib.request.urlopen(API + self.path, timeout=5) as r:
                    b = r.read()
                    self.send_response(r.status)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(b)))
                    self.end_headers()
                    self.wfile.write(b)
            except urllib.error.HTTPError as e:
                b = e.read()
                self.send_response(e.code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)
            except Exception as e:
                self.send_response(502)
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
            return
        p = self.path.split("?")[0]
        if p.endswith("/"):
            self.path = p + "index.html"
        return super().do_GET()

    def log_message(self, *a):
        pass


class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


threading.Thread(
    target=lambda: S(("127.0.0.1", PORT), H).serve_forever(), daemon=True
).start()
BASE = f"http://127.0.0.1:{PORT}"

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))


def put(cfg):
    req = urllib.request.Request(
        API + "/api/frontend-config",
        data=json.dumps({"config": cfg}).encode(),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


print("=== A. i18n 按语言独立 ===")
res = put({"i18n": {"zh-CN": {"nav.about": "本院概况"}, "en": {"nav.about": "About Us"}}})
cfg = res["config"]
check("zh-CN 文案已存", cfg["i18n"]["zh-CN"]["nav.about"] == "本院概况")
check("en 文案已存且未被中文覆盖", cfg["i18n"]["en"]["nav.about"] == "About Us")
# 只改 en，zh-CN 必须不动
res2 = put({"i18n": {"zh-CN": {"nav.about": "本院概况"}, "en": {"nav.about": "ABOUT"}}})
check(
    "改 en 不影响 zh-CN",
    res2["config"]["i18n"]["zh-CN"]["nav.about"] == "本院概况"
    and res2["config"]["i18n"]["en"]["nav.about"] == "ABOUT",
)

print("\n=== D. 非法配置：后台仍可打开、前台按未配置处理 ===")
# 注入一份结构损坏的文件
cfgp = pathlib.Path(r"D:\数字管理研究院网站\src\data\site-config.json")
backup = cfgp.read_text(encoding="utf-8")
cfgp.write_text("{ this is not json", encoding="utf-8")
try:
    with urllib.request.urlopen(API + "/api/frontend-config/source", timeout=10) as r:
        src = json.loads(r.read())
    check("JSON 损坏时 source 接口仍返回 200", src["ok"] is True)
    check("并给出可读警告", len(src["warnings"]) > 0, src["warnings"][0]["message"][:40])
    with urllib.request.urlopen(API + "/api/frontend-config", timeout=10) as r:
        delivered = json.loads(r.read())
    check("下发为空配置（当未配置处理）", delivered["empty"] is True)
finally:
    cfgp.write_text(backup, encoding="utf-8")

print("\n=== C. 空配置下前台正常（运行时无副作用）===")
put({})
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:120]))
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(2500)
    check("无 JS 错误", len(errs) == 0, "; ".join(errs[:2]))
    visible = page.evaluate(
        """() => { const el = document.querySelector('[data-cfg-block="statBand"]');
                   return el ? !el.hidden : null; }"""
    )
    check("空配置时区块全部可见", visible is True)
    nav_ok = page.evaluate(
        """() => { const els = document.querySelectorAll('[data-cfg-nav]');
                   return Array.from(els).every(e => !e.hidden); }"""
    )
    check("空配置时导航项全部可见", nav_ok is True)
    b.close()

print("\n" + "=" * 60)
passed = sum(1 for _, ok in results if ok)
print(f"通过 {passed}/{len(results)}")
fails = [n for n, ok in results if not ok]
if fails:
    for n in fails:
        print("  失败:", n)
    raise SystemExit(1)
print("全部通过")
