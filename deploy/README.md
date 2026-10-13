# 自托管部署（Docker Compose）

GitHub Pages 那条路仍然在跑（`.github/workflows/ci.yml`），这套**不是它的替代品**，
只解决一件 Pages 做不到的事：`admin/` 内容后台是常驻 Node 进程，直接写 `src/content`，
Pages 只发静态产物，承载不了。

下面每条都在本机 Docker 上实测过（构建 → 六门禁 → 发布 → Caddy 出网 → 回滚 → 鉴权），
实测环境是 `DMI_ROOT` 在 ext4、`DMI_REPO` 在 ext4；把仓库放 NTFS 共享目录时
容器内的写权限与软链行为需要重测。

## 三个服务

| 服务 | 镜像 | 职责 | 对外 |
|---|---|---|---|
| `proxy` | `caddy:2.10-alpine` | 静态站出网 + `/api/**` 分流 + 后台 basic_auth + TLS | 80/443 |
| `admin` | `deploy/Dockerfile` 构建 | `node admin/server.mjs`：后台 SPA 与 `/api/**` | 无（只在 web/internal 网内） |
| `publisher` | 同上 | 一次性：`build` → 六道门禁 → 产物落 `releases/` → 翻 `current` 软链 | 不参与 `up` |

站点产物**不进镜像**：`dist/` 实测 2.4 MB（其中 `fonts/` 自托管子集 1.1 MB），Caddy 直接 `file_server` 挂出来。
好处是换一次内容不必重构镜像，且回滚就是把软链翻回上一个目录，秒级、无重启。

## 首次装机

```bash
# 0) 主机目录：releases/ 存历史产物，current 是指向其中一版的相对软链
sudo mkdir -p /srv/dmi/releases

# 1) 仓库落到 /srv/dmi/repo（deploy/.env 的 DMI_REPO 指哪就是哪）
git clone <仓库地址> /srv/dmi/repo && cd /srv/dmi/repo

# 2) 配置：DMI_ROOT/DMI_REPO/地址
cp deploy/.env.example deploy/.env && $EDITOR deploy/.env

# 3) 后台口令（唯一一道门，务必设强口令 —— 后台自身零鉴权）
printf 'admin %s\n' "$(docker run --rm caddy:2.10-alpine caddy hash-password --plaintext '你的口令')" \
  > deploy/site/admin.users
chmod 600 deploy/site/admin.users

# 4) 镜像（依赖层单独拆过，改内容不必重装 194 MB node_modules）
docker build -f deploy/Dockerfile -t dmi/admin:node22 .

# 5) 起服务 + 发第一版（compose 自动读同目录的 .env，不必 --env-file）
docker compose -f deploy/compose.yaml up -d
docker compose -f deploy/compose.yaml --profile tools run --rm publisher
```

本地试跑（无 DNS、明文 HTTP）再叠一层 `deploy/compose.local.yaml`，
它只把 8443/8444 映射出来，配置项见 `SITE_ADDR=http://:8443` / `ADMIN_ADDR=http://:8444`：

```bash
docker compose -f deploy/compose.yaml -f deploy/compose.local.yaml up -d
```

## 日常改内容

1. 后台（`https://admin.<域名>/`）编辑 → 保存，写进 `src/content/**.md` 与 `public/images/`；
2. 发布：`docker compose -f deploy/compose.yaml --profile tools run --rm publisher`。

后台界面上那个「重新构建」按钮（`POST /api/build`）在容器形态下**用不了**：
`admin` 容器 `read_only: true`，且 `dist/` 不在任何挂载点上，构建产物无处可落
（实测报 `ENOENT … /home/node/.config/astro`，再往后是 vite 写不进 `node_modules/.vite`）。
发布一律走 `publisher` —— 这也是门禁能在发布路径上游的原因。

**新内容里的汉字不在子集里时，`FONTS-001` 只警告、不拦发布**（实测输出：
`（不阻断发布，只是那几个字观感不齐）`，发布照样 DONE）。那几个字会回落到系统字体，
与周围的自托管字形明显不齐。所以后台写完新条目后，正字这一步在开发机上做：
`npm run fonts` 需要 `pyftsubset`，而镜像里没有（`.dockerignore` 也排掉了 41 MB 的
`.fonts-src/`），必须本地跑完提交 `public/fonts/*.woff2` + `src/styles/fonts.css`，
服务器 `git pull` 后重新发布。

## 发布产物与回滚

`publisher` 的写法是 `releases/<UTC 时间戳>/` + `current` 软链原子翻（`ln -sfn` 到临时名再 `mv -Tf`），
所以历史版本都留在盘上：

```bash
ls /srv/dmi/releases                        # 全部历史
ln -sfn releases/20261013T021500Z /srv/dmi/current.new && mv -Tf /srv/dmi/current.new /srv/dmi/current
```

翻完不用重启 Caddy —— 它每个请求现解析路径。实测：翻到旧版后首页 HTML 里的资源
从 `/_astro/BaseLayout.otXzQ9Y7.css` 变回 `/idmt/_astro/BaseLayout.BdqiWiBH.css`，
再翻回来立即生效，全程零中断。

留一个坑在这儿：**`current` 必须是相对软链**（`releases/<ts>`，不是 `/srv/releases/<ts>`）。
`publisher` 把 `DMI_ROOT` 挂成 `/srv`、`proxy` 挂成 `/srv/dmi`，绝对路径的软链
在 proxy 容器里解析到 `/srv/releases`，那边根本没这个目录 —— 站点会整站 404，
而 `docker compose ps` 一切正常。

## `base` 与站点前缀

`astro.config.mjs` 的 `base` 现在是 `/idmt`（Pages 项目站要它）。自建服务器一般直接吃域名根，
换过去要三件事一起做：

1. `base` 改成 `'/'`，`astro.config.mjs` 的 `site` 与 `src/data/site.ts` 的 `url` 改成真实域名；
2. 重跑 `npm run fonts`（fonts.css 里的字体 URL 跟着 `base` 走，不改会撞 FONTS-002）；
3. 在浏览器里点一遍导航与搜索 —— 覆写型的运行时拼路门禁看不见（README 的部署节写了原因）。

`deploy/site/Caddyfile` 是按 **base = `/`** 写的，也就是上面这条路。
想在自己的服务器上原样沿用 `/idmt` 前缀，用同目录的 **`Caddyfile.idmt`**
（把整站包进 `handle_path /idmt/*`，并在站点级 `redir / /idmt/ 308`）—— 这条也在本机实测过：
`/` 308、`/idmt/` 200、`/idmt/about/` 200、`/idmt/_astro/*.css` 200 + immutable、
`/idmt/api/frontend-config` 200、其余 `/idmt/api/**` 404、`/idmt/nope` 404 且是站点自己的 404 页，
浏览器侧 118 条链接零漏前缀、搜索页 34 处高亮、报头「内容发布后台」仍是 `/idmt/admin`（没被覆写成 `/admin`）。

**为什么非要有这个变体**：Astro 的产物**不嵌套前缀目录**（`dist/` 根就是 `index.html`、`_astro/`…），
但 HTML 里每条链接都带 `/idmt/`。用无前缀版 `Caddyfile` 发布 base=`/idmt` 的产物时，
首页 `/` 返回 200 看着正常，实际它自己引用的 `/idmt/_astro/BaseLayout.BdqiWiBH.css` 全是 404
（同一文件在 `/_astro/…` 下 200）—— 站点变成无样式、导航全断，而 `docker compose ps` 一切正常。
换文件的方法见 `deploy/compose.local.yaml` 里那行 `command`。

## 公网面与凭据

| 入口 | 结果 |
|---|---|
| `GET /api/frontend-config` | 放行，代理到后台（前台运行时配置的唯一动态来源） |
| 其余 `/api/**`（含 `PUT /api/content/**`、`POST /api/build`） | 404，公网碰不到写接口 |
| `ADMIN_ADDR`（独立域名/端口） | `basic_auth` → 通过后才代理到后台 |
| `admin` 容器 | `read_only` + `cap_drop ALL` + `no-new-privileges` + `internal` 网络出不去 |

可写面只有三处 bind：`src/content`、`public/images`、`src/data/site-config.json`
（对应后台的条目编辑、素材上传、前端粒度管理）。备份就备这三处 + `releases/` +
`deploy/site/admin.users` + Caddy 的两个卷（`caddy_data` 存证书）。

`ADMIN_ROLE` 只是后台界面的编辑/只读开关，**不是鉴权**（`admin/server.mjs:371` 自称的
安全边界是「只监听回环」，容器里改成 `0.0.0.0` 后这道边界就没了，全靠 Caddy 那层）。

## 实测踩过的五个坑

1. **单文件 bind 锁 inode**：`- ./Caddyfile:/etc/caddy/Caddyfile:ro` 时，宿主编辑器保存 = 换新 inode，
   容器永远读旧那份，`caddy reload` 也静默用旧配置。改成挂 `./site` 目录后改文件即 reload 生效。
2. **`header` 规则不互斥**：`header /* Cache-Control "max-age=300"` 会把
   `header /_astro/* … "immutable"` 盖掉（两种先后顺序都试过，都被压成 300）。
   现在两条规则写在互斥的 `handle` 块里。
3. **compose 会插值 `$`**：`bcrypt` 哈希 `$2y$12$GZMk…` 经 `environment:` 或 `env_file:` 传进容器时，
   `$GZMk` 被当成变量替换掉（实测只剩 `$2y$12/bjW6…`），怎么输口令都是 401。
   现在哈希走 Caddyfile 的 `import admin.users`，不经过 compose。
4. **`sh -c` 里的 `$` 必须写 `$$`**：`publisher` 的 `REL="$(date -u …)"` 与 `$REL`
   不经 compose 插值就会先被吃掉（实测报 `The "REL" variable is not set`，
   产物目录变成空的 `/srv/releases/`，`cp` 直接失败）。compose 文件里所有 shell 变量同理。
5. **别把仓库 bind 到 `/app` 上跑构建**：那一层会把镜像里装好的 `node_modules` 整个盖掉，
   依赖只能再挂命名卷垫回来（卷跟着镜像初始化，改了 `package-lock` 不会同步）；
   更要紧的是 `publisher` 以 root 跑，构建产物变成 root 所有落在宿主 checkout 里，
   之后在同一份 checkout 上 `npm run build` 直接 `EACCES … node_modules/.vite`（实测卡死过一次，
   清理得进容器 `rm -rf`，宿主 `chown -R` 都跑不动）。
   现在改成 `tar` 把纯源码（排除依赖与产物，约 5 MB）复制进镜像的 `/app`，仓库只挂 `:ro`，
   宿主 checkout 全程零写入 —— 实测 `find . -user root` 为空。
