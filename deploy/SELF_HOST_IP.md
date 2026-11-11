# 单机 IP 部署（115.159.38.245:8080）

前台与后台跑在同一台 Ubuntu 24.04 上，只暴露 **8080** 一个端口：

```
浏览器
  │  http://115.159.38.245:8080
  ▼
Caddy 容器 idmt-site (:8080)
  ├─ /            → /opt/idmt/app/dist        静态前台
  ├─ /admin/*     → 127.0.0.1:4322（strip /admin）
  └─ /api/*       → 127.0.0.1:4322
                        ▲
              systemd: idmt-admin
              node admin/server.mjs
```

## 目录

| 路径 | 内容 |
|---|---|
| `/opt/idmt/app` | 站点源码 + 构建产物 `dist/` + `admin/dist/` |
| `/opt/idmt/idmt.env` | 后台环境变量（密码、会话密钥、BASE_PATH、SITE_URL） |
| `/opt/idmt/Caddyfile` | 8080 路由 |
| `/opt/idmt/caddy_data` | Caddy 数据卷 |

## 构建参数

自托管必须显式覆盖两个变量，否则产物仍指向 GitHub Pages：

```bash
BASE_PATH=/ SITE_URL=http://115.159.38.245:8080 npm run build
VITE_SITE_URL=http://115.159.38.245:8080 ADMIN_BASE=/admin/ npm run build --prefix admin
```

`idmt.env` 里同样写入 `BASE_PATH=/` 与 `SITE_URL=...`，
这样后台「构建发布」触发的 `npm run build` 不会把前缀改回 `/idmt`。

## 服务

```bash
sudo systemctl status idmt-admin      # 后台 API + SPA
sudo systemctl restart idmt-admin

docker ps --filter name=idmt-site     # 前台 Caddy
docker logs --tail 50 idmt-site
```

`idmt-admin.service` 的 `ExecStart=/usr/local/bin/node admin/server.mjs`，
`WorkingDirectory=/opt/idmt/app`，读取 `/opt/idmt/idmt.env`。

## 更新流程

```bash
# 本地打包（排除依赖与产物）
tar --exclude=node_modules --exclude=dist --exclude=.git \
    --exclude=admin/node_modules --exclude=admin/dist \
    -czf /tmp/idmt-src.tgz .

scp /tmp/idmt-src.tgz ubuntu@115.159.38.245:/tmp/
ssh ubuntu@115.159.38.245 '
  rm -rf /opt/idmt/app && mkdir -p /opt/idmt/app &&
  tar -C /opt/idmt/app -xzf /tmp/idmt-src.tgz &&
  cd /opt/idmt/app &&
  npm ci --no-audit --no-fund &&
  npm ci --prefix admin --no-audit --no-fund &&
  BASE_PATH=/ SITE_URL=http://115.159.38.245:8080 npm run build &&
  VITE_SITE_URL=http://115.159.38.245:8080 ADMIN_BASE=/admin/ npm run build --prefix admin
'
sudo systemctl restart idmt-admin
```

> 注意：`rm -rf /opt/idmt/app` 会替换目录 inode，
> Caddy 容器需要重建才能看到新产物：
> `docker rm -f idmt-site` 后再执行 `docker run ...`（见下）。

## 首次创建容器

```bash
docker run -d --name idmt-site --restart unless-stopped --network host \
  -v /opt/idmt/app/dist:/srv:ro \
  -v /opt/idmt/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v /opt/idmt/caddy_data:/data \
  -v /opt/idmt/caddy_config:/config \
  caddy:2-alpine
```

## 已知限制

- 仅 HTTP，无域名与证书；如需 HTTPS，把 8080 换成 80/443 并配置域名。
- 后台无 basic_auth 第二道门，仅应用层登录；建议后续在 Caddy 加 `basic_auth`。
- 构建产物直接覆盖 `dist/`，没有 release 目录与回滚；依赖 Git 与 GitHub Actions 的历史产物。
- 腾讯云轻量防火墙需放行 TCP 8080。
