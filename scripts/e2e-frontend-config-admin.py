"""验证后台管理界面：模块可见、六个分页签、空状态、保存反馈、无权限隐藏。"""
import json
import pathlib
import urllib.request
from playwright.sync_api import sync_playwright

ADMIN = "http://127.0.0.1:4322"      # admin 角色
ADMIN_EDITOR = "http://127.0.0.1:4390"  # editor 角色

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))


def put(cfg, base=ADMIN):
    req = urllib.request.Request(
        base + "/api/frontend-config",
        data=json.dumps({"config": cfg}).encode(),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


# 先清空配置，验证空状态
put({})

with sync_playwright() as p:
    b = p.chromium.launch()

    print("=== 1. admin 角色：模块可见 ===")
    page = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:150]))
    page.goto(ADMIN, wait_until="networkidle")
    page.wait_for_timeout(1500)

    nav_text = page.evaluate("() => document.querySelector('.MuiDrawer-root')?.innerText ?? ''")
    check("侧栏出现「前端粒度管理」", "前端粒度管理" in nav_text)
    check("与「内容集合」分组并列", "内容集合" in nav_text and "站点配置" in nav_text)

    # 点进模块
    page.get_by_text("前端粒度管理", exact=True).first.click()
    page.wait_for_timeout(1500)

    body = page.evaluate("() => document.body.innerText")
    check("模块标题出现", "前端粒度管理" in body)
    for tab in ["页面与路由", "区块与组件", "元素", "文案 i18n", "主题与样式", "功能开关"]:
        check(f"分页签「{tab}」存在", tab in body)

    check("空状态提示「暂无配置」", "暂无配置" in body)
    check("提示「使用前端默认内容」", "使用前端默认内容" in body)
    check("无 JS 错误", len(errs) == 0, "; ".join(errs[:2]))

    # ---------- 编辑并保存 ----------
    print("\n=== 2. 编辑 + 保存反馈 ===")
    page.get_by_role("tab", name="功能开关").click()
    page.wait_for_timeout(800)
    # 关掉第一个开关
    switches = page.locator('.MuiSwitch-input')
    check("功能开关页有开关控件", switches.count() > 0, str(switches.count()))
    if switches.count() > 0:
        switches.first.click()
        page.wait_for_timeout(400)
        check("出现「有未保存的改动」", "未保存" in page.evaluate("() => document.body.innerText"))

    page.get_by_role("button", name="保存配置").click()
    page.wait_for_timeout(2000)
    after = page.evaluate("() => document.body.innerText")
    check("保存后有成功反馈", "已保存" in after or "配置已保存" in after)

    # 落盘校验
    with urllib.request.urlopen(ADMIN + "/api/frontend-config/source", timeout=10) as r:
        src = json.loads(r.read())
    check("配置确实已持久化", src["persisted"] is True and isinstance(src["config"]["features"], dict))

    page.close()

    # ---------- 权限：editor ----------
    print("\n=== 3. editor 角色：模块不可用 ===")
    page2 = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    page2.goto(ADMIN_EDITOR, wait_until="networkidle")
    page2.wait_for_timeout(1500)
    nav2 = page2.evaluate("() => document.querySelector('.MuiDrawer-root')?.innerText ?? ''")
    check("侧栏仍列出该项", "前端粒度管理" in nav2)
    check("但标注无权限", "无权限" in nav2 or "editor" in nav2)
    disabled = page2.evaluate(
        """() => { const btns = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
                   const t = btns.find(b => b.innerText.includes('前端粒度管理'));
                   return t ? t.classList.contains('Mui-disabled') : null; }"""
    )
    check("该项为禁用态", disabled is True, str(disabled))
    page2.close()
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
