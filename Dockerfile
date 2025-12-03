# ─── 基础镜像：安装依赖 ─────────────────────────────────────────
FROM node:23-slim AS base

# 安装 corepack（slim 镜像中默认未安装）
# 并准备指定版本的 yarn
RUN npm install -g corepack && \
    corepack enable && \
    corepack prepare yarn@4.3.0 --activate

# 设置工作目录
WORKDIR /app

# 安装依赖（production + dev）
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
# 安装依赖包
RUN yarn install

# ─── 构建阶段：Next.js 构建 ───────────────────────────────────────
FROM base AS builder

# 拷贝源码（排除 node_modules 避免覆盖已安装的依赖）
COPY app ./app
COPY components ./components
COPY public ./public
COPY service ./service
COPY *.ts *.tsx *.js *.mjs *.json ./
COPY tailwind.config.ts postcss.config.mjs next.config.mjs ./

# 执行 Next.js 构建
RUN npm run build

# ─── 运行阶段：Standalone 输出 ────────────────────────────────────
FROM node:23-slim AS runner

WORKDIR /app

# 生产环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 拷贝构建产物
# public 静态资源
COPY --from=builder /app/public ./public
# standalone 输出目录（包含 server.js 和 package.json）
COPY --from=builder /app/.next/standalone ./
# Next.js 静态文件
COPY --from=builder /app/.next/static ./.next/static

# 开放端口
EXPOSE 3000

# 启动
CMD ["node", "server.js"]
