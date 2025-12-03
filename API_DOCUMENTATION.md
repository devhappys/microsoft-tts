# Microsoft TTS API 后端文档

本文档详细介绍了 Microsoft TTS (Text-to-Speech) 服务的后端 API 接口。

## 目录

- [概述](#概述)
- [认证](#认证)
- [API 端点](#api-端点)
  - [1. 文本转语音](#1-文本转语音)
  - [2. 阅读(Legado)导入](#2-阅读legado导入)
- [错误处理](#错误处理)
- [示例代码](#示例代码)
- [最佳实践](#最佳实践)

---

## 概述

本服务提供基于 Microsoft Edge TTS 的文本转语音功能,支持多种语音、语速、音调和音量调节。

**基础 URL**: `https://your-domain.com/api`

**支持的音频格式**: `audio/mpeg` (MP3)

---

## 认证

### 认证方式

本 API 支持可选的 Token 认证。如果在环境变量中设置了 `TOKEN` 或 `MS_RA_FORWARDER_TOKEN`,则所有请求都需要进行认证。

#### 方式 1: Bearer Token (推荐)

在请求头中添加 `Authorization` 字段:
Authorization: Bearer YOUR_TOKEN_HERE


#### 方式 2: Query Parameter

在 URL 查询参数中添加 `token` 参数:
?token=YOUR_TOKEN_HERE


### 环境变量配置

在部署时设置以下环境变量:

- `TOKEN`: 访问令牌(推荐)
- `MS_RA_FORWARDER_TOKEN`: 访问令牌(备用)

**注意**: 如果未设置任何令牌,则 API 将允许所有请求(公开访问)。

---

## API 端点

### 1. 文本转语音

将文本转换为语音音频文件。

#### 端点
GET /api/text-to-speech


#### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 范围 | 说明 |
|--------|------|------|--------|------|------|
| `text` | string | ✅ | - | 1-10000 字符 | 要转换的文本内容 |
| `voice` | string | ✅ | - | - | 语音名称(如: `zh-CN-XiaoxiaoNeural`) |
| `rate` | number | ❌ | 0 | -100 ~ 100 | 语速调节(负数减慢,正数加快) |
| `pitch` | number | ❌ | 0 | -100 ~ 100 | 音调调节(负数降低,正数升高) |
| `volume` | number | ❌ | 100 | 0 ~ 100 | 音量大小 |
| `personality` | string | ❌ | - | - | 语音个性(可选) |

#### 请求示例

```bash
# 基础请求
curl "[https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural](https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural)" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 带参数的请求
curl "[https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural&rate=20&pitch=10&volume=80](https://your-domain.com/api/text-to-speech?text=你好世界&voice=zh-CN-XiaoxiaoNeural&rate=20&pitch=10&volume=80)" \
  -H "Authorization: Bearer YOUR_TOKEN"
响应
成功响应 (200 OK)

Content-Type: audio/mpeg
Body: 音频文件的二进制数据
Headers:
Cache-Control: public, max-age=31536000, immutable
错误响应

json
{
  "error": "错误信息"
}
常见语音列表
中文语音
语音名称	说明	性别
zh-CN-XiaoxiaoNeural	晓晓	女
zh-CN-YunxiNeural	云希	男
zh-CN-YunjianNeural	云健	男
zh-CN-XiaoyiNeural	晓伊	女
zh-CN-YunyangNeural	云扬	男
英文语音
语音名称	说明	性别
en-US-JennyNeural	Jenny	女
en-US-GuyNeural	Guy	男
en-US-AriaNeural	Aria	女
2. 阅读(Legado)导入
生成用于阅读(Legado) APP 导入的配置数据。

端点
GET /api/legado-import
请求参数
参数名	类型	必填	默认值	范围	说明
voice	string	✅	-	-	语音名称
pitch	number	❌	0	-100 ~ 100	音调调节
volume	number	❌	100	0 ~ 100	音量大小
personality	string	❌	-	-	语音个性
protocol	string	❌	http	http 或 https	协议类型
token	string	⚠️	-	-	访问令牌(如果服务端配置了 TOKEN)
请求示例
bash
# 无认证
curl "https://your-domain.com/api/legado-import?voice=zh-CN-XiaoxiaoNeural&volume=100&pitch=0"

# 有认证
curl "https://your-domain.com/api/legado-import?voice=zh-CN-XiaoxiaoNeural&volume=100&pitch=0&token=YOUR_TOKEN"
错误处理
HTTP 状态码
状态码	说明	常见原因
200	成功	请求成功处理
400	请求错误	参数缺失、参数格式错误、参数超出范围
401	未授权	Token 缺失或无效
500	服务器错误	服务内部错误、TTS 服务异常
示例代码
JavaScript/TypeScript
javascript
const API_BASE = 'https://your-domain.com/api'
const TOKEN = 'your-token-here'

async function textToSpeech(text, voice = 'zh-CN-XiaoxiaoNeural') {
  const params = new URLSearchParams({
    text,
    voice,
    rate: '0',
    pitch: '0',
    volume: '100'
  })

  const response = await fetch(`${API_BASE}/text-to-speech?${params}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.blob()
}

// 使用示例
textToSpeech('你好,世界!', 'zh-CN-XiaoxiaoNeural')
  .then(audioBlob => {
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    audio.play()
  })
  .catch(error => {
    console.error('TTS Error:', error.message)
  })
Python
python
import requests
from io import BytesIO

API_BASE = 'https://your-domain.com/api'
TOKEN = 'your-token-here'

def text_to_speech(text, voice='zh-CN-XiaoxiaoNeural', rate=0, pitch=0, volume=100):
    params = {
        'text': text,
        'voice': voice,
        'rate': rate,
        'pitch': pitch,
        'volume': volume
    }
    
    headers = {
        'Authorization': f'Bearer {TOKEN}'
    }
    
    response = requests.get(
        f'{API_BASE}/text-to-speech',
        params=params,
        headers=headers
    )
    
    if response.status_code != 200:
        error = response.json()
        raise Exception(error.get('error', 'Unknown error'))
    
    return BytesIO(response.content)

# 使用示例
try:
    audio_data = text_to_speech('你好,世界!', voice='zh-CN-XiaoxiaoNeural')
    
    # 保存为文件
    with open('output.mp3', 'wb') as f:
        f.write(audio_data.getvalue())
    
    print('语音生成成功!')
except Exception as e:
    print(f'错误: {e}')
最佳实践
1. 错误处理
始终检查 HTTP 状态码和错误响应:

javascript
if (!response.ok) {
  const error = await response.json()
  console.error('API Error:', error.error)
  // 处理错误
}
2. 参数验证
在客户端进行参数验证,减少不必要的请求:

javascript
function validateParams(text, rate, pitch, volume) {
  if (!text || text.length === 0) {
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
3. 长文本处理
对于超过 10000 字符的文本,需要分段处理:

javascript
function splitText(text, maxLength = 9000) {
  const chunks = []
  let start = 0
  
  while (start < text.length) {
    let end = start + maxLength
    
    // 尝试在句号、问号、感叹号处分割
    if (end < text.length) {
      const lastPunctuation = Math.max(
        text.lastIndexOf('。', end),
        text.lastIndexOf('!', end),
        text.lastIndexOf('?', end),
        text.lastIndexOf('.', end)
      )
      
      if (lastPunctuation > start) {
        end = lastPunctuation + 1
      }
    }
    
    chunks.push(text.slice(start, end))
    start = end
  }
  
  return chunks
}

async function longTextToSpeech(text, voice) {
  const chunks = splitText(text)
  const audioBlobs = []
  
  for (const chunk of chunks) {
    const blob = await textToSpeech(chunk, voice)
    audioBlobs.push(blob)
  }
  
  // 合并音频
  return new Blob(audioBlobs, { type: 'audio/mpeg' })
}
常见问题 (FAQ)
Q1: 如何获取完整的语音列表?
A: 可以访问前端页面查看可用的语音列表,或参考 Microsoft 官方文档。

Q2: 为什么我的请求返回 401 错误?
A: 这表示认证失败。请检查:

是否正确设置了 Authorization 头
Token 是否正确
Token 格式是否为 Bearer YOUR_TOKEN
Q3: 支持哪些音频格式?
A: 目前仅支持 MP3 格式 (audio/mpeg)。

Q4: 可以商用吗?
A: 本项目仅供学习和参考,请勿商用。如需商用,请使用 Microsoft Azure TTS 官方服务。

Q5: 如何处理长文本?
A: 建议将长文本分段处理,每段不超过 9000 字符,然后合并音频。参考最佳实践部分。

更新日志
2024-11-30
✨ 重构 API 路由,提升代码可维护性
✨ 改进错误处理和参数验证
✨ 添加统一的响应格式
✨ 优化认证逻辑
📝 创建详细的 API 文档
2023-08-20
🔧 使用 Next.js 重构项目
🐛 修复无法合成的问题