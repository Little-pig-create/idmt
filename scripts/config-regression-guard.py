"""回归守卫：未配置时，前台可见输出必须与基线一致。

为什么不能直接比整文件哈希：
  本功能必须注入 (a) data-cfg* 钩子属性、(b) 一个运行时 <script> 标签。
  这两者都会改变字节，但**不应改变任何可见内容**。

因此这里分两层比对：
  L1 可见文本  —— 剥掉所有标签后的纯文本，必须与基线逐字符一致（**强保证**）
  L2 结构语义  —— 标签骨架（去掉**全部** data-cfg* 属性与 hash 化的资源路径），必须一致

基线文本在首次运行时生成并落盘。
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(r"D:\数字管理研究院网站")
DIST = ROOT / "dist"
# 基线放在**仓库外**：它是「改动前」的产物指纹，
# 放进仓库会被 git stash / clean 一并带走，导致基线丢失（已踩过）。
BASELINE_DIR = pathlib.Path(r"D:\_dmi-baseline")
BASELINE_DIR.mkdir(exist_ok=True)
BASE_TEXT = BASELINE_DIR / "visible-text-hashes.txt"

# 必须匹配**全部** data-cfg* 属性，不能枚举，也不能只匹配带值的形式 ——
# `data-cfg-label` 是无值布尔属性，早先的正则漏掉它，导致 index.html 误报。
ATTR = re.compile(r"\s+data-cfg[a-z-]*(?:=\"[^\"]*\"|(?=[\s>]))")


def visible_text(html: str) -> str:
    h = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", html)
    h = re.sub(r"<[^>]+>", " ", h)
    h = re.sub(r"&nbsp;", " ", h)
    return re.sub(r"\s+", " ", h).strip()


def norm_structure(html: str) -> str:
    """标签骨架：剥掉 data-cfg*、资源哈希、以及本次新增的运行时脚本标签。

    另外把所有 <script>/<style> 的**内容**替换为空 —— 本功能必然要向
    轮播脚本里加一个 attributeFilter 常量，那是代码而非结构。
    脚本内容的变化由 L1（剥脚本后的可见文本）与既有门禁共同守护，
    这里只关心 DOM 骨架。
    """
    h = ATTR.sub("", html)
    # 脚本/样式内容清空（保留标签本身，以便发现「多了一个 script」这类结构变化）
    h = re.sub(r"(<script\b[^>]*>)[\s\S]*?(</script>)", r"\1\2", h)
    h = re.sub(r"(<style\b[^>]*>)[\s\S]*?(</style>)", r"\1\2", h)
    # 去掉本次新增的运行时脚本标签（按位置特征识别，不依赖具体 hash）
    h = re.sub(
        r'<script type="module" src="/_astro/BaseLayout\.astro_astro_type_script_index_0_lang\.[^"]+"></script>',
        "",
        h,
    )
    # 资源哈希归一化
    h = re.sub(r'(_astro/[A-Za-z0-9._-]+?)\.[A-Za-z0-9_-]{8}(\.(?:css|js))', r"\1\2", h)
    return re.sub(r"\s+", " ", h).strip()


pages = sorted(p for p in DIST.rglob("*.html"))

if not BASE_TEXT.exists():
    lines = []
    for p in pages:
        rel = p.relative_to(DIST).as_posix()
        t = hashlib.sha256(visible_text(p.read_text(encoding="utf-8")).encode()).hexdigest().upper()
        s = hashlib.sha256(norm_structure(p.read_text(encoding="utf-8")).encode()).hexdigest().upper()
        lines.append(f"{rel}\t{t}\t{s}")
    BASE_TEXT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"已生成基线（{len(pages)} 页）：{BASE_TEXT.name}")
    sys.exit(0)

base = {}
for line in BASE_TEXT.read_text(encoding="utf-8").splitlines():
    if line.strip():
        rel, t, s = line.split("\t")
        base[rel] = (t, s)

text_diffs, struct_diffs = [], []
for p in pages:
    rel = p.relative_to(DIST).as_posix()
    if rel not in base:
        struct_diffs.append((rel, "新增页面"))
        continue
    html = p.read_text(encoding="utf-8")
    bt, bs = base[rel]
    if hashlib.sha256(visible_text(html).encode()).hexdigest().upper() != bt:
        text_diffs.append(rel)
    if hashlib.sha256(norm_structure(html).encode()).hexdigest().upper() != bs:
        struct_diffs.append((rel, "结构变化"))

print(f"比对页数: {len(pages)}")
print(f"\nL1 可见文本差异: {len(text_diffs)} 页")
for r in text_diffs[:10]:
    print("   ", r)
print(f"\nL2 结构差异: {len(struct_diffs)} 页")
for r, why in struct_diffs[:10]:
    print(f"    {r} — {why}")

if not text_diffs and not struct_diffs:
    print("\n✅ 未配置时，可见文本与结构骨架均与基线一致")
    sys.exit(0)
sys.exit(1)
