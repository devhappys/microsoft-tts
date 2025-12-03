# Microsoft TTS API 完整文档

> **版本**: 2.0.0 | **更新日期**: 2025-12-03

本文档详细介绍了 Microsoft TTS (Text-to-Speech) 服务的完整后端 API 接口，包括所有端点、认证方式、速率限制、日志记录等功能。

---

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [认证](#认证)
- [速率限制](#速率限制)
- [API 端点](#api-端点)
  - [1. 获取语音列表](#1-获取语音列表-get-apivoices)
  - [2. 文本转语音](#2-文本转语音-get-apitext-to-speech)
  - [3. SSML 转语音](#3-ssml-转语音-post-apissml)
  - [4. Legado 阅读导入](#4-legado-阅读导入-get-apilegado-import)
- [响应格式](#响应格式)
- [错误处理](#错误处理)
- [日志记录](#日志记录)
- [示例代码](#示例代码)
- [最佳实践](#最佳实践)
- [性能优化](#性能优化)
- [常见问题](#常见问题)
- [更新日志](#更新日志)

---

## 🎯 概述

本服务提供基于 Microsoft Edge TTS 的文本转语音功能，支持：

- ✅ **200+ 种语音**：支持多种语言和方言
- ✅ **参数调节**：语速、音调、音量、个性化
- ✅ **速率限制**：防止滥用，保证服务稳定
- ✅ **详细日志**：完整的请求追踪和监控
- ✅ **高质量音频**：24kHz 96kbps MP3 格式
- ✅ **缓存优化**：提升响应速度，减少服务器负载
- ✅ **Legado 集成**：支持阅读 APP 直接导入

**基础 URL**: `https://your-domain.com/api`

**支持的音频格式**: `audio/mpeg` (MP3, 24kHz 96kbps)

---

## 🚀 快速开始

### 1. 获取语音列表

```bash
curl -X GET "https://your-domain.com/api/voices" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 文本转语音

```bash
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output audio.mp3
```

### 3. JavaScript 示例

```javascript
const response = await fetch('/api/text-to-speech?text=你好&voice=zh-CN-XiaoxiaoNeural', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
const audioBlob = await response.blob()
const audio = new Audio(URL.createObjectURL(audioBlob))
audio.play()
```

---

## 🔐 认证

### 认证方式

本 API 支持可选的 Token 认证。如果在环境变量中设置了 `TOKEN` 或 `MS_RA_FORWARDER_TOKEN`，则所有请求都需要进行认证。

#### 方式 1: Bearer Token（推荐）

适用于 `/api/voices` 和 `/api/text-to-speech` 端点。

```http
Authorization: Bearer YOUR_TOKEN_HERE
```

**示例**:
```bash
curl -X GET "https://your-domain.com/api/voices" \
  -H "Authorization: Bearer abc123xyz"
```

#### 方式 2: Query Parameter

适用于 `/api/legado-import` 端点（兼容 Legado APP）。

```
?token=YOUR_TOKEN_HERE
```

**示例**:
```bash
curl "https://your-domain.com/api/legado-import?voice=zh-CN-XiaoxiaoNeural&token=abc123xyz"
```

### 环境变量配置

在部署时设置以下环境变量：

| 变量 | 说明 | 优先级 |
|------|------|--------|
| `MS_RA_FORWARDER_TOKEN` | API 访问令牌 | 高 |
| `TOKEN` | API 访问令牌（备用） | 中 |
| `LOG_LEVEL` | 日志级别（DEBUG/INFO/WARN/ERROR） | - |

**注意**: 
- 如果未设置任何令牌，则 API 将允许所有请求（公开访问）
- `MS_RA_FORWARDER_TOKEN` 优先于 `TOKEN`

---

## ⚡ 速率限制

为了防止滥用和保证服务稳定性，API 实现了基于滑动窗口算法的速率限制。

### 限制规则

| 端点 | 限制 | 时间窗口 |
|------|------|----------|
| `/api/voices` | 30 请求 | 60 秒 |
| `/api/text-to-speech` | 60 请求 | 60 秒 |
| `/api/legado-import` | 无限制 | - |

### 识别方式

速率限制基于客户端 IP 地址，检测优先级：

1. `cf-connecting-ip` (Cloudflare)
2. `x-real-ip`
3. `x-forwarded-for`
4. 默认: "unknown"

### 响应头

每个受限制的端点都会返回以下响应头：

| 响应头 | 说明 | 示例 |
|--------|------|------|
| `X-RateLimit-Limit` | 时间窗口内允许的最大请求数 | `60` |
| `X-RateLimit-Remaining` | 当前窗口剩余的请求数 | `45` |
| `X-RateLimit-Reset` | 速率限制重置的时间（ISO 8601） | `2025-12-03T15:25:30.123Z` |

### 超出限制

当超出速率限制时，API 返回：

**状态码**: `429 Too Many Requests`

**响应体**:
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**响应头**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-12-03T15:25:30.123Z
```

### 最佳实践

```javascript
async function makeRequestWithRateLimit(url, options) {
  const response = await fetch(url, options)
  
  // 检查速率限制
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const reset = response.headers.get('X-RateLimit-Reset')
  
  if (remaining === '0') {
    const resetTime = new Date(reset)
    console.warn(`Rate limit reached. Resets at: ${resetTime}`)
  }
  
  if (response.status === 429) {
    const retryAfter = new Date(reset) - new Date()
    console.log(`Waiting ${retryAfter}ms before retry...`)
    await new Promise(resolve => setTimeout(resolve, retryAfter))
    return makeRequestWithRateLimit(url, options) // 重试
  }
  
  return response
}
```

---

## 📡 API 端点

### 1. 获取语音列表 `GET /api/voices`

获取所有可用的 Edge TTS 语音列表，包括语音的详细信息。

#### 请求

```http
GET /api/voices HTTP/1.1
Host: your-domain.com
Authorization: Bearer YOUR_TOKEN
```

#### 请求参数

无需参数。

#### 响应

**成功响应** (200 OK):

```json
{
  "success": true,
  "count": 421,
  "voices": [
    {
      "value": "zh-CN-XiaoxiaoNeural",
      "label": "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)",
      "locale": "zh-CN",
      "gender": "Female",
      "format": "audio-24khz-48kbitrate-mono-mp3",
      "personalities": ["friendly", "cheerful", "sad", "angry", "fearful"]
    },
    {
      "value": "zh-CN-YunxiNeural",
      "label": "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)",
      "locale": "zh-CN",
      "gender": "Male",
      "format": "audio-24khz-48kbitrate-mono-mp3",
      "personalities": ["cheerful", "sad", "angry", "fearful"]
    }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 请求是否成功 |
| `count` | number | 语音总数 |
| `voices` | array | 语音列表 |
| `voices[].value` | string | 语音标识符（用于 TTS 请求） |
| `voices[].label` | string | 语音显示名称 |
| `voices[].locale` | string | 语言区域代码（如 zh-CN, en-US） |
| `voices[].gender` | string | 性别（Male/Female） |
| `voices[].format` | string | 建议的音频格式 |
| `voices[].personalities` | array | 支持的个性列表（可选） |

#### 响应头

```http
Content-Type: application/json
Cache-Control: public, max-age=3600
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 2025-12-03T15:25:30.123Z
```

#### 速率限制

- **30 请求/分钟** 每个 IP 地址

#### 缓存

响应缓存 **1 小时**，建议客户端也进行缓存以减少请求。

#### 示例

**cURL**:
```bash
curl -X GET "https://your-domain.com/api/voices" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.voices[] | select(.locale == "zh-CN")'
```

**JavaScript**:
```javascript
const response = await fetch('/api/voices', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
const data = await response.json()
console.log(`共有 ${data.count} 个语音`)

// 筛选中文语音
const chineseVoices = data.voices.filter(v => v.locale.startsWith('zh-'))
```

**Python**:
```python
import requests

response = requests.get(
    'https://your-domain.com/api/voices',
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)
data = response.json()

# 筛选女性语音
female_voices = [v for v in data['voices'] if v['gender'] == 'Female']
```

---

### 2. 文本转语音 `GET /api/text-to-speech`

将文本转换为语音音频文件。

#### 请求

```http
GET /api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural&rate=0&pitch=0&volume=100 HTTP/1.1
Host: your-domain.com
Authorization: Bearer YOUR_TOKEN
```

#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 范围 | 说明 |
|--------|------|------|--------|------|------|
| `text` | string | ✅ | - | 1-10000 字符 | 要转换的文本内容 |
| `voice` | string | ✅ | - | - | 语音名称（从 `/api/voices` 获取） |
| `rate` | number | ❌ | 0 | -100 ~ 100 | 语速调节（-100=最慢，0=正常，100=最快） |
| `pitch` | number | ❌ | 0 | -100 ~ 100 | 音调调节（-100=最低，0=正常，100=最高） |
| `volume` | number | ❌ | 100 | 0 ~ 100 | 音量大小（0=静音，100=最大） |
| `personality` | string | ❌ | - | - | 语音个性（已废弃，请使用 style） |
| `style` | string | ❌ | - | - | SSML 表达风格（如 cheerful, sad, angry 等） |
| `styleDegree` | number | ❌ | - | 0.01 ~ 2.0 | 风格强度（1.0=正常强度） |
| `role` | string | ❌ | - | - | 角色扮演（如 Girl, Boy, YoungAdultFemale 等） |

#### 参数说明

**text**:
- 支持中文、英文及其他语言
- 最大长度 10000 字符
- 支持标点符号，会影响语音的停顿和语调

**voice**:
- 必须是有效的语音标识符
- 可通过 `/api/voices` 端点获取完整列表
- 示例: `zh-CN-XiaoxiaoNeural`, `en-US-JennyNeural`

**rate**:
- 负值：减慢语速（-100 = 最慢）
- 0：正常语速
- 正值：加快语速（100 = 最快）

**pitch**:
- 负值：降低音调（-100 = 最低）
- 0：正常音调
- 正值：升高音调（100 = 最高）

**volume**:
- 0：静音
- 100：最大音量

**personality**:
- 已废弃，请使用 `style` 参数
- 仅为向后兼容保留

**style** (推荐):
- SSML 表达风格，支持情感化语音
- 仅部分语音支持（主要是 Neural 语音）
- 常见值：`cheerful` (欢快), `sad` (悲伤), `angry` (愤怒), `fearful` (恐惧), `calm` (平静), `gentle` (温柔), `lyrical` (抒情), `newscast` (新闻播报), `customerservice` (客服) 等
- 不同语音支持的风格不同，请参考语音列表

**styleDegree**:
- 风格强度，范围 0.01 ~ 2.0
- 1.0 = 正常强度
- < 1.0 = 减弱风格
- > 1.0 = 增强风格
- 需要配合 `style` 参数使用

**role**:
- 角色扮演，改变语音的说话方式
- 仅部分语音支持
- 常见值：`Girl` (女孩), `Boy` (男孩), `YoungAdultFemale` (年轻女性), `YoungAdultMale` (年轻男性), `OlderAdultFemale` (年长女性), `OlderAdultMale` (年长男性), `SeniorFemale` (老年女性), `SeniorMale` (老年男性) 等

#### 响应

**成功响应** (200 OK):

```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 123456
Cache-Control: public, max-age=31536000, immutable
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-12-03T15:25:30.123Z

[音频文件的二进制数据]
```

#### 响应头

| 响应头 | 值 | 说明 |
|--------|-----|------|
| `Content-Type` | `audio/mpeg` | 音频格式 |
| `Cache-Control` | `public, max-age=31536000, immutable` | 永久缓存（基于参数） |
| `X-RateLimit-Limit` | `60` | 速率限制 |
| `X-RateLimit-Remaining` | `59` | 剩余请求数 |
| `X-RateLimit-Reset` | ISO 8601 时间 | 重置时间 |

#### 速率限制

- **60 请求/分钟** 每个 IP 地址

#### 缓存

响应设置为**永久缓存**（1 年），因为相同的参数总是生成相同的音频。

#### 示例

**cURL**:
```bash
# 基础请求
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output audio.mp3

# 带参数的请求
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural&rate=20&pitch=10&volume=80&personality=cheerful" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output audio.mp3
```

**JavaScript**:
```javascript
async function textToSpeech(text, voice, options = {}) {
  const params = new URLSearchParams({
    text,
    voice,
    rate: options.rate || '0',
    pitch: options.pitch || '0',
    volume: options.volume || '100',
    ...(options.personality && { personality: options.personality })
  })

  const response = await fetch(`/api/text-to-speech?${params}`, {
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.blob()
}

// 使用示例
const audioBlob = await textToSpeech('你好，世界！', 'zh-CN-XiaoxiaoNeural', {
  rate: 10,
  pitch: 5,
  volume: 90,
  personality: 'cheerful'
})

const audio = new Audio(URL.createObjectURL(audioBlob))
audio.play()
```

**Python**:
```python
import requests

def text_to_speech(text, voice, rate=0, pitch=0, volume=100, personality=None):
    params = {
        'text': text,
        'voice': voice,
        'rate': rate,
        'pitch': pitch,
        'volume': volume
    }
    if personality:
        params['personality'] = personality
    
    response = requests.get(
        'https://your-domain.com/api/text-to-speech',
        params=params,
        headers={'Authorization': 'Bearer YOUR_TOKEN'}
    )
    
    if response.status_code != 200:
        error = response.json()
        raise Exception(error.get('error', 'Unknown error'))
    
    return response.content

# 使用示例
audio_data = text_to_speech(
    '你好，世界！',
    'zh-CN-XiaoxiaoNeural',
    rate=10,
    pitch=5,
    volume=90,
    personality='cheerful'
)

with open('output.mp3', 'wb') as f:
    f.write(audio_data)
```

---

### 3. SSML 转语音 `POST /api/ssml`

使用完整的 SSML (Speech Synthesis Markup Language) 转换为语音。支持所有 SSML 标签和高级语音控制。

#### 请求

```http
POST /api/ssml HTTP/1.1
Host: your-domain.com
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "ssml": "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='zh-CN'><voice name='zh-CN-XiaoxiaoNeural'><mstts:express-as style='cheerful'>你好，世界！</mstts:express-as></voice></speak>"
}
```

或使用 XML 格式：

```http
POST /api/ssml HTTP/1.1
Host: your-domain.com
Authorization: Bearer YOUR_TOKEN
Content-Type: text/xml

<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful">
      你好，世界！
    </mstts:express-as>
  </voice>
</speak>
```

#### 请求体

支持三种格式：

**1. JSON 格式** (推荐):
```json
{
  "ssml": "<speak>...</speak>"
}
```

**2. XML 格式**:
```xml
<speak version="1.0" ...>
  ...
</speak>
```

**3. 纯文本格式**:
```
<speak version="1.0" ...>...</speak>
```

#### SSML 要求

- 必须以 `<speak>` 开始，以 `</speak>` 结束
- 最大长度 50000 字符
- 必须包含有效的 XML 结构

#### 支持的 SSML 标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `<voice>` | 指定语音 | `<voice name="zh-CN-XiaoxiaoNeural">文本</voice>` |
| `<prosody>` | 调整韵律 | `<prosody rate="slow" pitch="+10%">文本</prosody>` |
| `<mstts:express-as>` | 表达风格 | `<mstts:express-as style="cheerful">文本</mstts:express-as>` |
| `<break>` | 暂停 | `<break time="500ms"/>` |
| `<emphasis>` | 强调 | `<emphasis level="strong">重要</emphasis>` |
| `<say-as>` | 解释方式 | `<say-as interpret-as="number">123</say-as>` |
| `<phoneme>` | 发音 | `<phoneme alphabet="ipa" ph="təˈmeɪtoʊ">tomato</phoneme>` |
| `<sub>` | 替换 | `<sub alias="World Wide Web">WWW</sub>` |

#### 响应

**成功响应** (200 OK):

```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 123456
Cache-Control: public, max-age=31536000, immutable
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-12-03T15:25:30.123Z

[音频文件的二进制数据]
```

#### 速率限制

- **60 请求/分钟** 每个 IP 地址

#### 示例

**cURL - JSON 格式**:
```bash
curl -X POST "https://your-domain.com/api/ssml" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssml":"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"http://www.w3.org/2001/mstts\" xml:lang=\"zh-CN\"><voice name=\"zh-CN-XiaoxiaoNeural\"><mstts:express-as style=\"cheerful\">你好，世界！</mstts:express-as></voice></speak>"}' \
  --output audio.mp3
```

**cURL - XML 格式**:
```bash
curl -X POST "https://your-domain.com/api/ssml" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/xml" \
  -d '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful">
      你好，世界！
    </mstts:express-as>
  </voice>
</speak>' \
  --output audio.mp3
```

**JavaScript**:
```javascript
async function ssmlToSpeech(ssml) {
  const response = await fetch('/api/ssml', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ssml })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.blob()
}

// 使用示例 - 带情感
const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful" styledegree="2">
      今天天气真好！
    </mstts:express-as>
    <break time="500ms"/>
    <mstts:express-as style="sad">
      但是我要工作。
    </mstts:express-as>
  </voice>
</speak>
`

const audioBlob = await ssmlToSpeech(ssml)
const audio = new Audio(URL.createObjectURL(audioBlob))
audio.play()
```

**Python**:
```python
import requests

def ssml_to_speech(ssml):
    response = requests.post(
        'https://your-domain.com/api/ssml',
        headers={
            'Authorization': 'Bearer YOUR_TOKEN',
            'Content-Type': 'application/json'
        },
        json={'ssml': ssml}
    )
    
    if response.status_code != 200:
        error = response.json()
        raise Exception(error.get('error', 'Unknown error'))
    
    return response.content

# 使用示例 - 复杂 SSML
ssml = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <prosody rate="slow" pitch="+5%">
      <mstts:express-as style="gentle">
        欢迎使用语音合成服务。
      </mstts:express-as>
    </prosody>
    <break time="1s"/>
    <emphasis level="strong">重要提示：</emphasis>
    请保持<break time="300ms"/>网络连接。
  </voice>
</speak>
"""

audio_data = ssml_to_speech(ssml)

with open('output.mp3', 'wb') as f:
    f.write(audio_data)
```

#### SSML 高级示例

**情感组合**:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful" styledegree="1.5">
      早上好！
    </mstts:express-as>
    <break time="500ms"/>
    <mstts:express-as style="calm">
      今天的天气预报：晴转多云。
    </mstts:express-as>
  </voice>
</speak>
```

**多语音混合**:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    大家好，我是晓晓。
  </voice>
  <break time="500ms"/>
  <voice name="zh-CN-YunxiNeural">
    大家好，我是云希。
  </voice>
</speak>
```

**韵律控制**:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <prosody rate="slow" pitch="-10%" volume="loud">
      这是慢速、低音调、大音量的语音。
    </prosody>
    <break time="1s"/>
    <prosody rate="fast" pitch="+20%" volume="soft">
      这是快速、高音调、小音量的语音。
    </prosody>
  </voice>
</speak>
```

**数字和日期**:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    电话号码：<say-as interpret-as="telephone">010-12345678</say-as>
    <break time="500ms"/>
    日期：<say-as interpret-as="date" format="ymd">2025-12-03</say-as>
    <break time="500ms"/>
    数字：<say-as interpret-as="number">12345</say-as>
  </voice>
</speak>
```

---

### 4. Legado 阅读导入 `GET /api/legado-import`

生成用于 [Legado 阅读](https://github.com/gedoor/legado) APP 导入的配置数据。

#### 请求

```http
GET /api/legado-import?voice=zh-CN-XiaoxiaoNeural&pitch=0&volume=100&protocol=https&token=YOUR_TOKEN HTTP/1.1
Host: your-domain.com
```

#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 范围 | 说明 |
|--------|------|------|--------|------|------|
| `voice` | string | ✅ | - | - | 语音名称 |
| `pitch` | number | ❌ | 0 | -100 ~ 100 | 音调调节 |
| `volume` | number | ❌ | 100 | 0 ~ 100 | 音量大小 |
| `personality` | string | ❌ | - | - | 语音个性 |
| `protocol` | string | ❌ | `http` | `http` 或 `https` | 协议类型 |
| `token` | string | ⚠️ | - | - | 访问令牌（如果服务端配置了 TOKEN） |

**注意**: 
- 此端点使用 Query Parameter 方式认证（`?token=xxx`）
- `rate` 参数会自动映射为 Legado 的 `speakSpeed` 变量

#### 响应

**成功响应** (200 OK):

```json
{
  "name": "zh-CN-XiaoxiaoNeural",
  "contentType": "audio/mpeg",
  "id": 1733234567890,
  "loginCheckJs": "",
  "loginUi": "",
  "loginUrl": "",
  "url": "https://your-domain.com/api/text-to-speech?voice=zh-CN-XiaoxiaoNeural&volume=100&pitch=0&rate={{(speakSpeed - 10) * 2}}&text={{java.encodeURI(speakText)}}",
  "header": "{\"Authorization\":\"Bearer YOUR_TOKEN\"}"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 配置名称（语音名称） |
| `contentType` | string | 音频格式 |
| `id` | number | 唯一标识符（时间戳） |
| `url` | string | TTS API URL（包含 Legado 变量） |
| `header` | string | 请求头（JSON 字符串） |
| `loginCheckJs` | string | 登录检查脚本（未使用） |
| `loginUi` | string | 登录界面（未使用） |
| `loginUrl` | string | 登录 URL（未使用） |

#### Legado 变量说明

生成的 URL 包含 Legado 特定的变量：

- `{{speakText}}`: 要朗读的文本
- `{{speakSpeed}}`: 朗读速度（10 = 正常）
- `{{(speakSpeed - 10) * 2}}`: 自动转换为 API 的 rate 参数

#### 使用方法

1. 访问此端点获取配置 JSON
2. 复制整个 JSON 响应
3. 在 Legado APP 中：
   - 打开 **我的** → **朗读引擎**
   - 点击右上角 **+** 号
   - 选择 **网络导入**
   - 粘贴 JSON 数据
   - 保存

#### 示例

**cURL**:
```bash
# 无认证
curl "https://your-domain.com/api/legado-import?voice=zh-CN-XiaoxiaoNeural&volume=100&pitch=0&protocol=https"

# 有认证
curl "https://your-domain.com/api/legado-import?voice=zh-CN-XiaoxiaoNeural&volume=100&pitch=0&protocol=https&token=YOUR_TOKEN"
```

**JavaScript**:
```javascript
async function getLegadoConfig(voice, options = {}) {
  const params = new URLSearchParams({
    voice,
    pitch: options.pitch || '0',
    volume: options.volume || '100',
    protocol: options.protocol || 'https',
    ...(options.token && { token: options.token })
  })

  const response = await fetch(`/api/legado-import?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}

// 使用示例
const config = await getLegadoConfig('zh-CN-XiaoxiaoNeural', {
  volume: 90,
  pitch: 5,
  protocol: 'https',
  token: 'YOUR_TOKEN'
})

console.log('Legado 配置:', JSON.stringify(config, null, 2))
```

---

## 📦 响应格式

### 成功响应

#### JSON 响应

```json
{
  "success": true,
  "count": 421,
  "data": { ... }
}
```

#### 音频响应

```http
Content-Type: audio/mpeg
[二进制音频数据]
```

### 错误响应

所有错误响应都使用统一的 JSON 格式：

```json
{
  "error": "错误消息"
}
```

---

## ❌ 错误处理

### HTTP 状态码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| `200` | 成功 | 请求成功处理 |
| `400` | 请求错误 | 参数缺失、参数格式错误、参数超出范围、文本过长 |
| `401` | 未授权 | Token 缺失、Token 无效、Authorization 格式错误 |
| `429` | 速率限制 | 超出速率限制，需要等待 |
| `500` | 服务器错误 | 服务内部错误、TTS 服务异常、网络错误 |

### 错误示例

#### 400 Bad Request

**缺少必需参数**:
```json
{
  "error": "Missing required parameter: text"
}
```

**参数超出范围**:
```json
{
  "error": "Invalid rate: must be between -100 and 100"
}
```

**文本过长**:
```json
{
  "error": "Text too long (max 10000 characters)"
}
```

#### 401 Unauthorized

**缺少 Authorization 头**:
```json
{
  "error": "Missing Authorization header"
}
```

**无效的 Authorization 格式**:
```json
{
  "error": "Invalid Authorization format. Expected: Bearer <token>"
}
```

**无效的 Token**:
```json
{
  "error": "Invalid token"
}
```

#### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**响应头**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-12-03T15:25:30.123Z
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

或具体错误消息：
```json
{
  "error": "Failed to connect to TTS service"
}
```

### 错误处理最佳实践

```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options)
    
    // 检查速率限制
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset')
      const waitTime = new Date(resetTime) - new Date()
      console.log(`Rate limited. Waiting ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return makeRequest(url, options) // 重试
    }
    
    // 处理其他错误
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error (${response.status}): ${error.error}`)
    }
    
    return response
  } catch (error) {
    console.error('Request failed:', error.message)
    throw error
  }
}
```

---

## 📊 日志记录

API 提供详细的日志记录功能，用于监控、调试和审计。

### 日志级别

通过 `LOG_LEVEL` 环境变量配置：

| 级别 | 说明 | 包含内容 |
|------|------|----------|
| `DEBUG` | 调试信息 | 所有日志，包括请求参数、中间状态 |
| `INFO` | 一般信息 | 请求开始/完成、成功操作 |
| `WARN` | 警告信息 | 认证失败、速率限制、参数错误 |
| `ERROR` | 错误信息 | 异常、失败、错误堆栈 |

**默认**: `INFO`

### 日志格式

```
[时间戳] [级别] 消息 | {JSON上下文}
```

**示例**:
```
[2025-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"abc-123","method":"GET","url":"/api/voices","ip":"127.0.0.1","userAgent":"curl/7.68.0"}
[2025-12-03T15:24:30.456Z] [INFO] Successfully fetched voices | {"requestId":"abc-123","voiceCount":421,"duration":"333ms"}
[2025-12-03T15:24:30.789Z] [INFO] Request completed | {"requestId":"abc-123","status":200,"duration":"666ms"}
```

### 记录的信息

#### 请求日志

- **Request ID**: 唯一标识符（UUID）
- **HTTP 方法**: GET, POST 等
- **URL**: 请求路径和查询参数
- **客户端 IP**: 真实 IP 地址
- **User-Agent**: 客户端信息
- **端点**: API 端点名称

#### 响应日志

- **Request ID**: 关联请求
- **状态码**: HTTP 状态码
- **持续时间**: 请求处理时间（毫秒）
- **数据大小**: 响应数据大小（字节）

#### 错误日志

- **Request ID**: 关联请求
- **错误消息**: 错误描述
- **错误堆栈**: 完整的堆栈跟踪
- **上下文**: 请求参数、状态等

### 日志示例

#### 成功请求

```
[2025-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"abc-123","method":"GET","url":"/api/text-to-speech","ip":"192.168.1.100","userAgent":"Mozilla/5.0"}
[2025-12-03T15:24:30.234Z] [DEBUG] TTS request parameters | {"requestId":"abc-123","textLength":10,"voice":"zh-CN-XiaoxiaoNeural","pitch":0,"rate":0,"volume":100}
[2025-12-03T15:24:30.345Z] [INFO] Starting TTS conversion | {"requestId":"abc-123","voice":"zh-CN-XiaoxiaoNeural"}
[2025-12-03T15:24:31.456Z] [INFO] TTS conversion successful | {"requestId":"abc-123","audioSize":12345,"duration":"1111ms"}
[2025-12-03T15:24:31.567Z] [INFO] Request completed | {"requestId":"abc-123","status":200,"duration":"1444ms"}
```

#### 速率限制

```
[2025-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"def-456","method":"GET","url":"/api/voices","ip":"192.168.1.100"}
[2025-12-03T15:24:30.234Z] [WARN] Rate limit exceeded | {"requestId":"def-456","endpoint":"/api/voices"}
[2025-12-03T15:24:30.345Z] [WARN] Request failed with client error | {"requestId":"def-456","status":429,"duration":"222ms"}
```

#### 认证失败

```
[2025-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"ghi-789","method":"GET","url":"/api/text-to-speech","ip":"192.168.1.100"}
[2025-12-03T15:24:30.234Z] [WARN] Unauthorized access attempt | {"requestId":"ghi-789","endpoint":"/api/text-to-speech","error":"Invalid token"}
[2025-12-03T15:24:30.345Z] [WARN] Request failed with client error | {"requestId":"ghi-789","status":401,"duration":"222ms"}
```

#### 错误

```
[2025-12-03T15:24:30.123Z] [INFO] Incoming request | {"requestId":"jkl-012","method":"GET","url":"/api/text-to-speech","ip":"192.168.1.100"}
[2025-12-03T15:24:30.234Z] [DEBUG] TTS request parameters | {"requestId":"jkl-012","textLength":100,"voice":"zh-CN-XiaoxiaoNeural"}
[2025-12-03T15:24:30.345Z] [INFO] Starting TTS conversion | {"requestId":"jkl-012","voice":"zh-CN-XiaoxiaoNeural"}
[2025-12-03T15:24:30.456Z] [ERROR] Text-to-speech error | {"requestId":"jkl-012","endpoint":"/api/text-to-speech","duration":"333ms","error":{"message":"Failed to connect to TTS service","stack":"Error: Failed to connect...\n    at ..."}}
[2025-12-03T15:24:30.567Z] [ERROR] Request failed with server error | {"requestId":"jkl-012","status":500,"duration":"444ms"}
```

### 配置示例

**开发环境**:
```bash
LOG_LEVEL=DEBUG
```

**生产环境**:
```bash
LOG_LEVEL=INFO
# 或
LOG_LEVEL=WARN
```

---

## 💻 示例代码

### JavaScript/TypeScript

#### 完整示例

```javascript
const API_BASE = 'https://your-domain.com/api'
const TOKEN = 'your-token-here'

class TTSClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async getVoices() {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    return await response.json()
  }

  async textToSpeech(text, voice, options = {}) {
    const params = new URLSearchParams({
      text,
      voice,
      rate: options.rate || '0',
      pitch: options.pitch || '0',
      volume: options.volume || '100',
      ...(options.personality && { personality: options.personality })
    })

    const response = await fetch(`${this.baseUrl}/text-to-speech?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })

    // 检查速率限制
    const remaining = response.headers.get('X-RateLimit-Remaining')
    if (remaining && parseInt(remaining) < 10) {
      console.warn(`Warning: Only ${remaining} requests remaining`)
    }

    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset')
      throw new Error(`Rate limited. Reset at: ${resetTime}`)
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    return await response.blob()
  }

  async getLegadoConfig(voice, options = {}) {
    const params = new URLSearchParams({
      voice,
      pitch: options.pitch || '0',
      volume: options.volume || '100',
      protocol: options.protocol || 'https',
      ...(this.token && { token: this.token })
    })

    const response = await fetch(`${this.baseUrl}/legado-import?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    return await response.json()
  }
}

// 使用示例
const client = new TTSClient(API_BASE, TOKEN)

// 获取语音列表
const { voices } = await client.getVoices()
console.log(`共有 ${voices.length} 个语音`)

// 文本转语音
const audioBlob = await client.textToSpeech('你好，世界！', 'zh-CN-XiaoxiaoNeural', {
  rate: 10,
  pitch: 5,
  volume: 90,
  personality: 'cheerful'
})

// 播放音频
const audio = new Audio(URL.createObjectURL(audioBlob))
audio.play()

// 获取 Legado 配置
const legadoConfig = await client.getLegadoConfig('zh-CN-XiaoxiaoNeural', {
  volume: 90,
  protocol: 'https'
})
console.log(JSON.stringify(legadoConfig, null, 2))
```

### Python

#### 完整示例

```python
import requests
from io import BytesIO
from typing import Optional, Dict, List

class TTSClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({'Authorization': f'Bearer {token}'})

    def get_voices(self) -> Dict:
        """获取语音列表"""
        response = self.session.get(f'{self.base_url}/voices')
        response.raise_for_status()
        return response.json()

    def text_to_speech(
        self,
        text: str,
        voice: str,
        rate: int = 0,
        pitch: int = 0,
        volume: int = 100,
        personality: Optional[str] = None
    ) -> bytes:
        """文本转语音"""
        params = {
            'text': text,
            'voice': voice,
            'rate': rate,
            'pitch': pitch,
            'volume': volume
        }
        if personality:
            params['personality'] = personality

        response = self.session.get(
            f'{self.base_url}/text-to-speech',
            params=params
        )

        # 检查速率限制
        remaining = response.headers.get('X-RateLimit-Remaining')
        if remaining and int(remaining) < 10:
            print(f'Warning: Only {remaining} requests remaining')

        if response.status_code == 429:
            reset_time = response.headers.get('X-RateLimit-Reset')
            raise Exception(f'Rate limited. Reset at: {reset_time}')

        response.raise_for_status()
        return response.content

    def get_legado_config(
        self,
        voice: str,
        pitch: int = 0,
        volume: int = 100,
        protocol: str = 'https'
    ) -> Dict:
        """获取 Legado 配置"""
        params = {
            'voice': voice,
            'pitch': pitch,
            'volume': volume,
            'protocol': protocol,
            'token': self.token
        }

        response = requests.get(
            f'{self.base_url}/legado-import',
            params=params
        )
        response.raise_for_status()
        return response.json()

# 使用示例
client = TTSClient('https://your-domain.com/api', 'your-token-here')

# 获取语音列表
voices_data = client.get_voices()
print(f"共有 {voices_data['count']} 个语音")

# 筛选中文女性语音
chinese_female_voices = [
    v for v in voices_data['voices']
    if v['locale'].startswith('zh-') and v['gender'] == 'Female'
]
print(f"中文女性语音: {len(chinese_female_voices)} 个")

# 文本转语音
audio_data = client.text_to_speech(
    '你好，世界！',
    'zh-CN-XiaoxiaoNeural',
    rate=10,
    pitch=5,
    volume=90,
    personality='cheerful'
)

# 保存为文件
with open('output.mp3', 'wb') as f:
    f.write(audio_data)
print('音频已保存到 output.mp3')

# 获取 Legado 配置
legado_config = client.get_legado_config(
    'zh-CN-XiaoxiaoNeural',
    volume=90,
    protocol='https'
)
print('Legado 配置:')
print(json.dumps(legado_config, indent=2, ensure_ascii=False))
```

### cURL

```bash
#!/bin/bash

API_BASE="https://your-domain.com/api"
TOKEN="your-token-here"

# 获取语音列表
echo "=== 获取语音列表 ==="
curl -X GET "${API_BASE}/voices" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq '.voices[] | select(.locale == "zh-CN") | {value, label, gender}'

# 文本转语音
echo -e "\n=== 文本转语音 ==="
curl -X GET "${API_BASE}/text-to-speech" \
  -H "Authorization: Bearer ${TOKEN}" \
  -G \
  --data-urlencode "text=你好，世界！" \
  --data-urlencode "voice=zh-CN-XiaoxiaoNeural" \
  --data-urlencode "rate=10" \
  --data-urlencode "pitch=5" \
  --data-urlencode "volume=90" \
  --data-urlencode "personality=cheerful" \
  --output "output.mp3"

echo "音频已保存到 output.mp3"

# 获取 Legado 配置
echo -e "\n=== Legado 配置 ==="
curl -X GET "${API_BASE}/legado-import" \
  -G \
  --data-urlencode "voice=zh-CN-XiaoxiaoNeural" \
  --data-urlencode "volume=90" \
  --data-urlencode "protocol=https" \
  --data-urlencode "token=${TOKEN}" \
  | jq '.'
```

---

## 🎯 最佳实践

### 1. 错误处理

始终检查 HTTP 状态码和错误响应：

```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const error = await response.json()
      console.error(`API Error (${response.status}):`, error.error)
      
      // 根据状态码处理
      switch (response.status) {
        case 400:
          // 参数错误，检查输入
          break
        case 401:
          // 认证失败，检查 token
          break
        case 429:
          // 速率限制，等待重试
          break
        case 500:
          // 服务器错误，稍后重试
          break
      }
      
      throw new Error(error.error)
    }
    
    return response
  } catch (error) {
    console.error('Request failed:', error.message)
    throw error
  }
}
```

### 2. 参数验证

在客户端进行参数验证，减少不必要的请求：

```javascript
function validateTTSParams(text, rate, pitch, volume) {
  if (!text || text.trim().length === 0) {
    throw new Error('文本不能为空')
  }
  if (text.length > 10000) {
    throw new Error('文本长度不能超过 10000 字符')
  }
  if (rate < -100 || rate > 100) {
    throw new Error('语速必须在 -100 到 100 之间')
  }
  if (pitch < -100 || pitch > 100) {
    throw new Error('音调必须在 -100 到 100 之间')
  }
  if (volume < 0 || volume > 100) {
    throw new Error('音量必须在 0 到 100 之间')
  }
}
```

### 3. 速率限制处理

监控速率限制并实现自动重试：

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      
      // 检查速率限制
      const remaining = response.headers.get('X-RateLimit-Remaining')
      if (remaining && parseInt(remaining) < 5) {
        console.warn(`Warning: Only ${remaining} requests remaining`)
      }
      
      // 处理速率限制
      if (response.status === 429) {
        const resetTime = new Date(response.headers.get('X-RateLimit-Reset'))
        const waitTime = resetTime - new Date()
        
        if (i < maxRetries - 1) {
          console.log(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      }
      
      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      console.log(`Request failed. Retrying ${i + 1}/${maxRetries}...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### 4. 缓存语音列表

缓存语音列表以减少 API 调用：

```javascript
class TTSClientWithCache {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl
    this.token = token
    this.voicesCache = null
    this.voicesCacheTime = null
    this.cacheExpiry = 3600000 // 1 小时
  }

  async getVoices(forceRefresh = false) {
    const now = Date.now()
    
    // 检查缓存
    if (!forceRefresh && this.voicesCache && 
        (now - this.voicesCacheTime) < this.cacheExpiry) {
      console.log('Using cached voices')
      return this.voicesCache
    }
    
    // 获取新数据
    console.log('Fetching voices from API')
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch voices')
    }
    
    this.voicesCache = await response.json()
    this.voicesCacheTime = now
    
    return this.voicesCache
  }
}
```

### 5. 长文本处理

对于超过 10000 字符的文本，需要分段处理：

```javascript
function splitText(text, maxLength = 9000) {
  const chunks = []
  let start = 0
  
  while (start < text.length) {
    let end = start + maxLength
    
    // 尝试在句号、问号、感叹号处分割
    if (end < text.length) {
      const punctuations = ['。', '！', '？', '.', '!', '?', '\n']
      let bestSplit = -1
      
      for (const punct of punctuations) {
        const pos = text.lastIndexOf(punct, end)
        if (pos > start && pos > bestSplit) {
          bestSplit = pos
        }
      }
      
      if (bestSplit > start) {
        end = bestSplit + 1
      }
    }
    
    chunks.push(text.slice(start, end).trim())
    start = end
  }
  
  return chunks
}

async function longTextToSpeech(text, voice, options = {}) {
  const chunks = splitText(text)
  console.log(`Split text into ${chunks.length} chunks`)
  
  const audioBlobs = []
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`)
    const blob = await textToSpeech(chunks[i], voice, options)
    audioBlobs.push(blob)
    
    // 避免速率限制
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // 合并音频
  return new Blob(audioBlobs, { type: 'audio/mpeg' })
}
```

### 6. 进度追踪

为长时间操作提供进度反馈：

```javascript
async function textToSpeechWithProgress(text, voice, options = {}, onProgress) {
  const chunks = splitText(text)
  const audioBlobs = []
  
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100)
      })
    }
    
    const blob = await textToSpeech(chunks[i], voice, options)
    audioBlobs.push(blob)
  }
  
  return new Blob(audioBlobs, { type: 'audio/mpeg' })
}

// 使用示例
await textToSpeechWithProgress(
  longText,
  'zh-CN-XiaoxiaoNeural',
  {},
  (progress) => {
    console.log(`Progress: ${progress.percentage}% (${progress.current}/${progress.total})`)
  }
)
```

---

## ⚡ 性能优化

### 1. 客户端缓存

利用浏览器缓存减少重复请求：

```javascript
// 音频会被永久缓存（基于 URL 参数）
const audioUrl = `/api/text-to-speech?text=${encodeURIComponent(text)}&voice=${voice}`

// 浏览器会自动缓存相同 URL 的响应
const audio = new Audio(audioUrl)
audio.play()
```

### 2. 并发请求

使用 `Promise.all` 并发处理多个请求：

```javascript
async function batchTextToSpeech(texts, voice, options = {}) {
  const promises = texts.map(text => 
    textToSpeech(text, voice, options)
  )
  
  return await Promise.all(promises)
}

// 使用示例
const texts = ['你好', '世界', '欢迎']
const audioBlobs = await batchTextToSpeech(texts, 'zh-CN-XiaoxiaoNeural')
```

### 3. 预加载语音列表

在应用启动时预加载语音列表：

```javascript
class App {
  constructor() {
    this.ttsClient = new TTSClient(API_BASE, TOKEN)
    this.voices = null
  }

  async init() {
    // 预加载语音列表
    console.log('Loading voices...')
    this.voices = await this.ttsClient.getVoices()
    console.log(`Loaded ${this.voices.voices.length} voices`)
  }

  getVoicesByLocale(locale) {
    return this.voices.voices.filter(v => v.locale === locale)
  }
}

// 使用示例
const app = new App()
await app.init()

const chineseVoices = app.getVoicesByLocale('zh-CN')
```

### 4. 音频预加载

预加载常用音频：

```javascript
class AudioCache {
  constructor() {
    this.cache = new Map()
  }

  async preload(text, voice, options = {}) {
    const key = this.getCacheKey(text, voice, options)
    
    if (!this.cache.has(key)) {
      const blob = await textToSpeech(text, voice, options)
      const url = URL.createObjectURL(blob)
      this.cache.set(key, url)
    }
    
    return this.cache.get(key)
  }

  getCacheKey(text, voice, options) {
    return `${text}|${voice}|${JSON.stringify(options)}`
  }

  play(text, voice, options = {}) {
    const key = this.getCacheKey(text, voice, options)
    const url = this.cache.get(key)
    
    if (url) {
      const audio = new Audio(url)
      audio.play()
      return true
    }
    
    return false
  }
}

// 使用示例
const audioCache = new AudioCache()

// 预加载
await audioCache.preload('你好', 'zh-CN-XiaoxiaoNeural')
await audioCache.preload('世界', 'zh-CN-XiaoxiaoNeural')

// 立即播放（无需等待）
audioCache.play('你好', 'zh-CN-XiaoxiaoNeural')
```

---

## ❓ 常见问题

### Q1: 如何获取完整的语音列表？

**A**: 调用 `/api/voices` 端点获取所有可用语音：

```bash
curl -X GET "https://your-domain.com/api/voices" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q2: 为什么我的请求返回 401 错误？

**A**: 这表示认证失败。请检查：

1. 是否正确设置了 `Authorization` 头
2. Token 是否正确
3. Token 格式是否为 `Bearer YOUR_TOKEN`
4. 服务端是否配置了 `TOKEN` 环境变量

### Q3: 支持哪些音频格式？

**A**: 目前仅支持 **MP3 格式** (`audio/mpeg`)，采样率 24kHz，比特率 96kbps。

### Q4: 可以商用吗？

**A**: 本项目仅供学习和参考，请勿商用。如需商用，请使用 [Microsoft Azure TTS](https://azure.microsoft.com/zh-cn/services/cognitive-services/text-to-speech/) 官方服务。

### Q5: 如何处理长文本（超过 10000 字符）？

**A**: 建议将长文本分段处理，每段不超过 9000 字符，然后合并音频。参考[最佳实践 - 长文本处理](#5-长文本处理)部分。

### Q6: 速率限制是如何计算的？

**A**: 使用滑动窗口算法，基于客户端 IP 地址。每个 IP 在 60 秒内最多可以：
- `/api/voices`: 30 次请求
- `/api/text-to-speech`: 60 次请求

### Q7: 如何查看详细的日志？

**A**: 设置环境变量 `LOG_LEVEL=DEBUG` 可以查看详细的调试日志。

### Q8: 支持哪些语言？

**A**: 支持 Microsoft Edge TTS 的所有语言，包括但不限于：
- 中文（简体、繁体、粤语等）
- 英语（美国、英国、澳大利亚等）
- 日语、韩语、法语、德语、西班牙语等

完整列表请调用 `/api/voices` 端点查看。

### Q9: 如何在 Legado 阅读中使用？

**A**: 
1. 访问 `/api/legado-import` 端点获取配置
2. 复制返回的 JSON
3. 在 Legado APP 中导入：**我的** → **朗读引擎** → **+** → **网络导入**

### Q10: 音频质量如何调整？

**A**: 音频质量固定为 24kHz 96kbps MP3。如需更高质量，需要修改服务端代码中的 `format` 参数。

### Q11: 如何处理速率限制？

**A**: 
1. 监控 `X-RateLimit-Remaining` 响应头
2. 当收到 429 状态码时，等待 `X-RateLimit-Reset` 时间后重试
3. 实现指数退避重试策略
4. 缓存常用请求结果

### Q12: 支持 SSML 吗？

**A**: **完全支持！** 提供两种方式使用 SSML：

1. **简单方式**：使用 `/api/text-to-speech` 端点的 `style`, `styleDegree`, `role` 参数
2. **完整方式**：使用 `/api/ssml` 端点发送完整的 SSML XML

支持的 SSML 功能包括：
- `<mstts:express-as>` - 情感表达（cheerful, sad, angry, calm 等）
- `<prosody>` - 韵律控制（语速、音调、音量）
- `<break>` - 暂停控制
- `<emphasis>` - 强调
- `<say-as>` - 数字、日期等的读法
- `<phoneme>` - 自定义发音
- 多语音混合
- 角色扮演

详见 [SSML 转语音](#3-ssml-转语音-post-apissml) 部分。

---

## 📝 更新日志

### 2025-12-03 (v2.0.0)

#### 新增功能
- ✨ **完整 SSML 支持**：新增 `/api/ssml` 端点，支持所有 SSML 标签和高级语音控制
- ✨ **新增 `/api/voices` 端点**：获取所有可用语音列表
- ✨ **情感表达**：支持 `style`, `styleDegree`, `role` 参数，实现情感化语音
- ✨ **速率限制系统**：基于滑动窗口算法，防止滥用
- ✨ **详细日志记录**：支持多级别日志，完整的请求追踪
- ✨ **请求追踪**：每个请求分配唯一 Request ID
- ✨ **性能监控**：记录请求处理时间

#### 改进
- 🔧 重构 API 路由，提升代码可维护性
- 🔧 改进错误处理和参数验证
- 🔧 添加统一的响应格式
- 🔧 优化认证逻辑
- 🔧 增强缓存策略

#### 文档
- 📝 创建完整的 API 文档
- 📝 添加详细的示例代码
- 📝 补充最佳实践指南
- 📝 完善错误处理说明

#### 响应头
- 🆕 `X-RateLimit-Limit`: 速率限制
- 🆕 `X-RateLimit-Remaining`: 剩余请求数
- 🆕 `X-RateLimit-Reset`: 重置时间

### 2024-11-30 (v1.0.0)

- ✨ 重构 API 路由
- ✨ 改进错误处理
- ✨ 添加统一的响应格式
- ✨ 优化认证逻辑
- 📝 创建基础 API 文档

### 2023-08-20

- 🔧 使用 Next.js 重构项目
- 🐛 修复无法合成的问题

---

## 📞 支持与反馈

如有问题或建议，请通过以下方式联系：

- **GitHub Issues**: [提交问题](https://github.com/your-repo/issues)
- **讨论区**: [参与讨论](https://github.com/your-repo/discussions)

---

## 📄 许可证

本项目仅供学习和参考使用。

---

**最后更新**: 2025-12-03 | **文档版本**: 2.0.0
