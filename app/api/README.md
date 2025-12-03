# API Documentation

## Endpoints

### 1. GET /api/voices

获取所有可用的语音列表。

#### 请求

```bash
GET /api/voices
Authorization: Bearer <token>  # 如果设置了 TOKEN 环境变量
```

#### 响应

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

#### 响应头

- `X-RateLimit-Limit`: 速率限制的最大请求数
- `X-RateLimit-Remaining`: 当前窗口剩余请求数
- `X-RateLimit-Reset`: 速率限制重置时间
- `Cache-Control`: 缓存控制（1小时）

#### 速率限制

- **30 请求/分钟** 每个 IP 地址

---

### 2. GET /api/text-to-speech

将文本转换为语音。

#### 请求

```bash
GET /api/text-to-speech?text=你好&voice=zh-CN-XiaoxiaoNeural&pitch=0&rate=0&volume=100&personality=friendly
Authorization: Bearer <token>  # 如果设置了 TOKEN 环境变量
```

#### 查询参数

| 参数 | 类型 | 必需 | 默认值 | 范围 | 描述 |
|------|------|------|--------|------|------|
| `text` | string | ✅ | - | 1-10000 字符 | 要转换的文本 |
| `voice` | string | ✅ | - | - | 语音名称（从 /api/voices 获取） |
| `pitch` | number | ❌ | 0 | -100 到 100 | 音调调整 |
| `rate` | number | ❌ | 0 | -100 到 100 | 语速调整 |
| `volume` | number | ❌ | 100 | 0 到 100 | 音量 |
| `personality` | string | ❌ | - | - | 语音个性（如果支持） |

#### 响应

返回 `audio/mpeg` 格式的音频文件。

#### 响应头

- `Content-Type`: audio/mpeg
- `Cache-Control`: 缓存控制（永久缓存）
- `X-RateLimit-Limit`: 速率限制的最大请求数
- `X-RateLimit-Remaining`: 当前窗口剩余请求数
- `X-RateLimit-Reset`: 速率限制重置时间

#### 速率限制

- **60 请求/分钟** 每个 IP 地址

---

## 认证

如果设置了 `MS_RA_FORWARDER_TOKEN` 或 `TOKEN` 环境变量，所有 API 请求都需要认证。

### 请求头

```
Authorization: Bearer <your-token>
```

### 错误响应

```json
{
  "error": "Missing Authorization header"
}
```

状态码: `401 Unauthorized`

---

## 速率限制

API 使用滑动窗口算法实现速率限制：

- `/api/voices`: 30 请求/分钟
- `/api/text-to-speech`: 60 请求/分钟

### 速率限制响应头

每个响应都包含以下头部：

- `X-RateLimit-Limit`: 时间窗口内允许的最大请求数
- `X-RateLimit-Remaining`: 当前窗口剩余的请求数
- `X-RateLimit-Reset`: 速率限制重置的时间（ISO 8601 格式）

### 超出限制

当超出速率限制时，API 返回：

```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

状态码: `429 Too Many Requests`

---

## 日志记录

API 提供详细的日志记录功能，可通过 `LOG_LEVEL` 环境变量配置。

### 日志级别

- `DEBUG`: 详细的调试信息
- `INFO`: 一般信息（默认）
- `WARN`: 警告信息
- `ERROR`: 错误信息

### 环境变量

```bash
LOG_LEVEL=DEBUG  # 设置日志级别
```

### 日志格式

```
[2024-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"abc-123","method":"GET","url":"/api/voices","ip":"127.0.0.1"}
```

### 记录的信息

- 请求 ID（用于追踪）
- HTTP 方法和 URL
- 客户端 IP 地址
- 用户代理
- 请求参数
- 响应状态和持续时间
- 错误堆栈跟踪

---

## 错误处理

### 错误响应格式

```json
{
  "error": "错误消息"
}
```

### 常见错误代码

| 状态码 | 描述 |
|--------|------|
| 400 | 错误的请求（参数无效） |
| 401 | 未授权（缺少或无效的令牌） |
| 429 | 超出速率限制 |
| 500 | 内部服务器错误 |

---

## 示例

### 获取语音列表

```bash
curl -X GET "https://your-domain.com/api/voices" \
  -H "Authorization: Bearer your-token-here"
```

### 文本转语音

```bash
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural&pitch=0&rate=0&volume=100" \
  -H "Authorization: Bearer your-token-here" \
  --output audio.mp3
```

### JavaScript 示例

```javascript
// 获取语音列表
const voices = await fetch('/api/voices', {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
}).then(res => res.json())

// 文本转语音
const params = new URLSearchParams({
  text: '你好世界',
  voice: 'zh-CN-XiaoxiaoNeural',
  pitch: '0',
  rate: '0',
  volume: '100'
})

const audioBlob = await fetch(`/api/text-to-speech?${params}`, {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
}).then(res => res.blob())

// 播放音频
const audio = new Audio(URL.createObjectURL(audioBlob))
audio.play()
```

---

## 配置

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `TOKEN` 或 `MS_RA_FORWARDER_TOKEN` | API 认证令牌 | 无（不需要认证） |
| `LOG_LEVEL` | 日志级别 | `INFO` |

---

## 性能优化

### 缓存

- `/api/voices`: 响应缓存 1 小时
- `/api/text-to-speech`: 音频文件永久缓存（基于参数）

### 建议

1. 缓存语音列表以减少 API 调用
2. 对相同的文本和参数重用音频文件
3. 监控速率限制头部以避免被限流
4. 使用适当的错误处理和重试逻辑
