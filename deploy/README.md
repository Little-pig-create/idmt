# 自托管部署 · IDMT 官网 + 内容后台

三个容器：

| 服务 | 镜像 | 职责 | 端口 |
|---|---|---|---|
| `proxy` | `caddy:2.10-alpine` | 静态站出网、TLS、安全头、后台 `basic_auth` | 80 / 443 |
| `admin` | 本项目 Dockerfile | 托管后台 SPA 与 `/api/**`，读写 `src/content` | 4322（内网） |
| `publisher` | 同上（profile `tools`） | 一次性构建 → 门禁 → 产物写入 `releases/` | — |

站点本身不进镜像：`dist/` 由 Caddy `file_server` 直接服务，换内容不必重建镜像，
回滚只是把 `current` 软链指回上一个 release。

## 1. 准备

```bash
cp deploy/.env.example deploy/.env
```

至少修改：

```ini
SITE_ADDR=dmi.example.edu.cn
ADMIN_ADDR=admin.dmi.example.edu.cn
ADMIN_PASSWORD=一个足够长的口令
ADMIN_SECRET=随机 32 字节（多实例部署必填）
```

后台口令哈希（`basic_auth` 第二道门）：

```bash
caddy hash-password --plaintext 'your-password'
cp deploy/site/admin.users.example deploy/site/admin.users
# 把哈希写进 admin.users
```

## 2. 启动

```bash
docker compose -f deploy/compose.yaml up -d
docker compose -f deploy/compose.yaml --profile tools run --rm publisher
```

`publisher` 会依次执行 `build → audit → taste → contrast → smoke`，
全部通过后把 `dist/` 复制到 `/srv/dmi/releases/<UTC 时间戳>/` 并切换 `current` 软链。
任一门禁失败即中止，线上保持上一个版本。

## 3. 访问

- 前台：`https://dmi.example.edu.cn`（若沿用 `/idmt` 前缀，用同目录的 `Caddyfile.idmt`）
- 后台：`https://admin.dmi.example.edu.cn` → `basic_auth` → 登录页（`ADMIN_PASSWORD`）

## 4. 鉴权模型

| 层 | 机制 |
|---|---|
| 网络 | `admin` 只加入 `internal` 网络，公网不可直达 |
| 代理 | Caddy `basic_auth`（`admin.users`） |
| 应用 | 登录接口签发 HttpOnly + SameSite=Strict 会话 Cookie；所有写接口校验 |

前台不暴露任何 API：`/api/**` 在站点域一律返回 404。

## 5. 后台 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（无需登录） |
| POST | `/api/login` `/api/logout` | 会话 |
| GET | `/api/me` `/api/schema` `/api/stats` | 会话 / 模型 / 统计 |
| GET/POST | `/api/entries?collection=` | 列表 / 新建 |
| GET/PUT/DELETE | `/api/entries/:collection/:id` | 单条读写删 |
| GET/POST | `/api/assets` | 素材列表 / 上传（原始二进制 + `?name=`） |
| DELETE | `/api/assets/:name` | 删除素材 |
| GET/PUT | `/api/settings` | 站点设置 |
| GET/POST | `/api/build` | 构建状态 / 触发构建 |

## 6. 备份与回滚

- 内容：`src/content/**` 与 `src/data/site-settings.json`，纳入 Git 即可。
- 产物：`/srv/dmi/releases/` 每次发布一个目录，`current` 指向其一。
- 回滚：`ln -sfn releases/<旧时间戳> /srv/dmi/current.new && mv -Tf /srv/dmi/current.new /srv/dmi/current`

## 7. 本地验证

```bash
docker compose -f deploy/compose.local.yaml up --build
# 前台 http://localhost:8443  后台 http://localhost:8444
```

本地编排不启用 TLS，`basic_auth` 账号文件可留空。
