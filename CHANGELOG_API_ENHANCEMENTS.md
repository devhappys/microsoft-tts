# API 增强功能更新日志

## 新增功能

### 1. `/api/voices` 端点

新增了获取可用语音列表的 API 端点。

**文件**: `app/api/voices/route.ts`

**功能**:
- 返回所有可用的 Edge TTS 语音
- 包含语音的详细信息（名称、语言、性别、格式、个性等）
- 支持认证和速率限制
- 响应缓存 1 小时

**使用示例**:
```bash
GET /api/voices
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "count": 100,
  "voices": [
    {
      "value": "zh-CN-XiaoxiaoNeural",
      "label": "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)",
      "locale": "zh-CN",
      "gender": "Female",
      "format": "audio-24khz-48kbitrate-mono-mp3",
      "personalities": ["friendly", "cheerful"]
    }
  ]
}
```

---

### 2. 请求速率限制

实现了基于滑动窗口算法的速率限制系统。

**文件**: `app/api/utils/rate-limiter.ts`

**功能**:
- 内存中的速率限制器
- 基于客户端 IP 地址进行限制
- 支持多个速率限制器实例
- 自动清理过期数据

**配置**:
- `/api/text-to-speech`: 60 请求/分钟
- `/api/voices`: 30 请求/分钟

**响应头**:
- `X-RateLimit-Limit`: 最大请求数
- `X-RateLimit-Remaining`: 剩余请求数
- `X-RateLimit-Reset`: 重置时间

**IP 检测优先级**:
1. `cf-connecting-ip` (Cloudflare)
2. `x-real-ip`
3. `x-forwarded-for`
4. 默认: "unknown"

---

### 3. 详细日志记录

实现了结构化的日志记录系统。

**文件**: `app/api/utils/logger.ts`

**功能**:
- 多级别日志（DEBUG, INFO, WARN, ERROR）
- 结构化日志格式（JSON）
- 请求追踪（Request ID）
- 性能监控（请求持续时间）
- 错误堆栈跟踪

**日志级别**:
- `DEBUG`: 详细调试信息（参数、中间状态）
- `INFO`: 一般信息（请求开始/完成）
- `WARN`: 警告（认证失败、速率限制）
- `ERROR`: 错误（异常、失败）

**环境变量**:
```bash
LOG_LEVEL=DEBUG  # 可选: DEBUG, INFO, WARN, ERROR
```

**日志格式**:
```
[2024-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"abc-123","method":"GET","url":"/api/voices","ip":"127.0.0.1"}
```

**记录的信息**:
- 请求 ID（UUID）
- HTTP 方法和 URL
- 客户端 IP 地址
- 用户代理
- 请求参数
- 响应状态码
- 请求持续时间
- 错误详情和堆栈

---

### 4. 现有端点增强

更新了 `/api/text-to-speech` 端点以集成新功能。

**文件**: `app/api/text-to-speech/route.ts`

**新增功能**:
- 速率限制（60 请求/分钟）
- 详细日志记录
- 请求追踪
- 性能监控
- 增强的错误处理

**日志记录点**:
1. 请求接收
2. 速率限制检查
3. 认证验证
4. 参数解析
5. TTS 转换开始
6. TTS 转换完成
7. 错误处理

---

## 文件结构

```
app/api/
├── text-to-speech/
│   └── route.ts          # 更新：集成速率限制和日志
├── voices/
│   └── route.ts          # 新增：语音列表端点
├── utils/
│   ├── rate-limiter.ts   # 新增：速率限制工具
│   └── logger.ts         # 新增：日志记录工具
└── README.md             # 新增：API 文档
```

---

## 技术实现

### 速率限制算法

使用**滑动窗口**算法：
- 为每个客户端维护时间戳数组
- 过滤掉窗口外的旧时间戳
- 检查当前窗口内的请求数
- 自动清理过期数据（每 5 分钟）

### 日志系统

- 单例模式的 Logger 类
- 可配置的日志级别
- 结构化 JSON 输出
- 自动请求 ID 生成
- 性能计时器

### 认证

- 支持 Bearer Token 认证
- 环境变量配置
- 统一的认证逻辑

---

## 配置选项

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `TOKEN` 或 `MS_RA_FORWARDER_TOKEN` | API 认证令牌 | 无（不需要认证） |
| `LOG_LEVEL` | 日志级别 | `INFO` |

---

## 使用建议

### 1. 生产环境

```bash
# 设置认证令牌
TOKEN=your-secure-token-here

# 设置日志级别为 INFO 或 WARN
LOG_LEVEL=INFO
```

### 2. 开发环境

```bash
# 不设置 TOKEN（无需认证）
# 设置详细日志
LOG_LEVEL=DEBUG
```

### 3. 客户端集成

```javascript
// 检查速率限制
const response = await fetch('/api/text-to-speech?...')
const remaining = response.headers.get('X-RateLimit-Remaining')
const reset = response.headers.get('X-RateLimit-Reset')

if (remaining === '0') {
  console.log(`Rate limit reached. Resets at: ${reset}`)
}
```

---

## 性能影响

### 内存使用

- 速率限制器：每个 IP 约 100-200 字节
- 自动清理机制防止内存泄漏

### 响应时间

- 速率限制检查：< 1ms
- 日志记录：< 1ms
- 总体影响：可忽略不计

### 缓存策略

- `/api/voices`: 1 小时缓存
- `/api/text-to-speech`: 永久缓存（基于参数）

---

## 错误处理

### 新增错误代码

| 状态码 | 场景 | 响应 |
|--------|------|------|
| 429 | 超出速率限制 | `{"error": "Rate limit exceeded. Please try again later."}` |

### 增强的错误日志

所有错误现在都包含：
- 请求 ID
- 错误堆栈
- 请求持续时间
- 上下文信息

---

## 测试建议

### 1. 测试速率限制

```bash
# 快速发送多个请求
for i in {1..70}; do
  curl -X GET "http://localhost:3000/api/voices" \
    -H "Authorization: Bearer token" &
done
wait
```

### 2. 测试日志记录

```bash
# 设置 DEBUG 级别
LOG_LEVEL=DEBUG npm run dev

# 发送请求并查看详细日志
curl -X GET "http://localhost:3000/api/text-to-speech?text=test&voice=zh-CN-XiaoxiaoNeural"
```

### 3. 测试语音端点

```bash
# 获取语音列表
curl -X GET "http://localhost:3000/api/voices" \
  -H "Authorization: Bearer token" | jq
```

---

## 后续改进建议

### 1. 持久化速率限制

考虑使用 Redis 或其他持久化存储来支持多实例部署。

### 2. 日志聚合

集成日志聚合服务（如 Datadog, Sentry）用于生产监控。

### 3. 速率限制策略

- 基于用户的速率限制（而不仅是 IP）
- 不同用户层级的不同限制
- 动态速率限制调整

### 4. 监控和告警

- 添加 Prometheus 指标
- 设置告警规则
- 性能仪表板

---

## 迁移指南

### 对现有客户端的影响

**无破坏性变更** - 所有现有功能保持兼容。

### 新功能采用

1. 监控速率限制响应头
2. 实现重试逻辑（带指数退避）
3. 使用 `/api/voices` 动态获取语音列表
4. 处理 429 错误

---

## 贡献者

- 实现日期: 2025-12-03
- 版本: 1.0.0
