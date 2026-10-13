# DMI 内容后台 + 站点构建器
#
# 一个镜像两用：
#   * 常驻服务：node admin/server.mjs      （托管后台 SPA 与 /api/**）
#   * 一次性发布：docker compose --profile tools run --rm publisher（build → 门禁 → 产物落到 releases/）
#
# 为什么站点本身不进镜像：静态产物 dist/ 实测 3.6 MB，由 Caddy 直接 file_server 服务，
# 换一次内容不必重新构建镜像，也能秒级翻软链回滚。

FROM node:22.23.3-bookworm-slim

# 仓库没有 engines 字段，Node 版本只写在 README，靠这个标签钉住。
# 22.23.3 而不是 22.12：node_modules 里的 undici@8.11 要求 node >= 22.19，
# 用 22.12 构建会刷 EBADENGINE 警告（能跑，但等于每次发布都赌一把）。
WORKDIR /app

# 依赖层单独拆出来：内容改了不必重装 194 MB 的 node_modules
COPY package.json package-lock.json ./
COPY admin/package.json admin/package-lock.json ./admin/
RUN npm ci --no-audit --no-fund \
  && npm ci --prefix admin --no-audit --no-fund

COPY . .

# 后台 SPA 打进镜像；运行期不再 vite build
RUN npm run build --prefix admin

# server.mjs 的 ROOT 是 admin 的上级目录（即 /app），内容读写与 npm run build 都以它为准
ENV NODE_ENV=production \
    ADMIN_HOST=0.0.0.0 \
    ADMIN_PORT=4322

EXPOSE 4322
USER node
CMD ["node", "admin/server.mjs"]
