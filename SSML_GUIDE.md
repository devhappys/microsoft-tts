# SSML 使用指南

本指南详细介绍如何在 Microsoft TTS API 中使用 SSML (Speech Synthesis Markup Language) 来实现高级语音控制。

## 📋 目录

- [什么是 SSML](#什么是-ssml)
- [基本结构](#基本结构)
- [支持的标签](#支持的标签)
- [使用方式](#使用方式)
- [实用示例](#实用示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 什么是 SSML

SSML (Speech Synthesis Markup Language) 是一种基于 XML 的标记语言，用于精确控制文本转语音的各个方面，包括：

- 🎭 **情感表达**：快乐、悲伤、愤怒等
- 🎵 **韵律控制**：语速、音调、音量
- ⏸️ **停顿控制**：精确控制停顿时间
- 🔊 **强调**：突出重要内容
- 📞 **特殊读法**：电话号码、日期、数字等
- 🗣️ **发音控制**：自定义单词发音
- 👥 **多语音**：在同一段音频中使用多个语音

---

## 基本结构

所有 SSML 文档都必须遵循以下基本结构：

```xml
<speak version="1.0" 
       xmlns="http://www.w3.org/2001/10/synthesis" 
       xmlns:mstts="http://www.w3.org/2001/mstts" 
       xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    这里是要转换的文本
  </voice>
</speak>
```

### 必需元素

- `<speak>`: 根元素，包含整个 SSML 文档
- `<voice>`: 指定使用的语音

### 命名空间

- `xmlns`: 标准 SSML 命名空间
- `xmlns:mstts`: Microsoft 特定的扩展命名空间（用于 express-as 等功能）

---

## 支持的标签

### 1. `<voice>` - 语音选择

指定要使用的语音。

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    你好，我是晓晓。
  </voice>
  <voice name="zh-CN-YunxiNeural">
    你好，我是云希。
  </voice>
</speak>
```

### 2. `<prosody>` - 韵律控制

控制语速、音调和音量。

**属性**:
- `rate`: 语速 (x-slow, slow, medium, fast, x-fast, 或百分比如 50%, 200%)
- `pitch`: 音调 (x-low, low, medium, high, x-high, 或相对值如 +10%, -20%)
- `volume`: 音量 (silent, x-soft, soft, medium, loud, x-loud, 或百分比如 80%)

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <prosody rate="slow" pitch="+10%" volume="loud">
      这句话说得慢、音调高、音量大。
    </prosody>
  </voice>
</speak>
```

### 3. `<mstts:express-as>` - 情感表达

添加情感和表达风格（Microsoft 特有功能）。

**属性**:
- `style`: 表达风格
- `styledegree`: 风格强度 (0.01-2.0，默认 1.0)
- `role`: 角色扮演

**常见风格**:
- `cheerful` - 欢快
- `sad` - 悲伤
- `angry` - 愤怒
- `fearful` - 恐惧
- `calm` - 平静
- `gentle` - 温柔
- `lyrical` - 抒情
- `newscast` - 新闻播报
- `customerservice` - 客服
- `chat` - 聊天
- `assistant` - 助手

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful" styledegree="2">
      今天天气真好！我太开心了！
    </mstts:express-as>
  </voice>
</speak>
```

### 4. `<break>` - 停顿

在文本中插入停顿。

**属性**:
- `time`: 停顿时长 (如 500ms, 2s)
- `strength`: 停顿强度 (none, x-weak, weak, medium, strong, x-strong)

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    第一句话。
    <break time="1s"/>
    停顿 1 秒后的第二句话。
    <break strength="strong"/>
    停顿强度为 strong 的第三句话。
  </voice>
</speak>
```

### 5. `<emphasis>` - 强调

强调特定文本。

**属性**:
- `level`: 强调级别 (reduced, none, moderate, strong)

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    这是<emphasis level="strong">非常重要</emphasis>的内容。
  </voice>
</speak>
```

### 6. `<say-as>` - 解释方式

指定如何读取特定内容。

**属性**:
- `interpret-as`: 解释类型
  - `number` - 数字
  - `ordinal` - 序数
  - `digits` - 逐位读数字
  - `date` - 日期
  - `time` - 时间
  - `telephone` - 电话号码
  - `currency` - 货币

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    电话号码：<say-as interpret-as="telephone">010-12345678</say-as>
    <break time="500ms"/>
    日期：<say-as interpret-as="date" format="ymd">2025-12-03</say-as>
    <break time="500ms"/>
    金额：<say-as interpret-as="currency">$123.45</say-as>
    <break time="500ms"/>
    数字：<say-as interpret-as="number">12345</say-as>
  </voice>
</speak>
```

### 7. `<phoneme>` - 发音

自定义单词或短语的发音。

**属性**:
- `alphabet`: 音标字母表 (ipa, sapi, ups)
- `ph`: 音标

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="en-US-JennyNeural">
    <phoneme alphabet="ipa" ph="təˈmeɪtoʊ">tomato</phoneme>
  </voice>
</speak>
```

### 8. `<sub>` - 替换

用别名替换文本进行朗读。

**属性**:
- `alias`: 替代读音

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <sub alias="世界卫生组织">WHO</sub>
    <break time="300ms"/>
    <sub alias="人工智能">AI</sub>
  </voice>
</speak>
```

---

## 使用方式

### 方式一：简单参数（推荐新手）

使用 `/api/text-to-speech` 端点的参数：

```bash
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好&voice=zh-CN-XiaoxiaoNeural&style=cheerful&styleDegree=1.5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 方式二：完整 SSML（推荐高级用户）

使用 `/api/ssml` 端点发送完整的 SSML：

```bash
curl -X POST "https://your-domain.com/api/ssml" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssml":"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"http://www.w3.org/2001/mstts\" xml:lang=\"zh-CN\"><voice name=\"zh-CN-XiaoxiaoNeural\"><mstts:express-as style=\"cheerful\">你好！</mstts:express-as></voice></speak>"}'
```

---

## 实用示例

### 示例 1：天气播报

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="newscast">
      早上好！
      <break time="500ms"/>
      今天是<say-as interpret-as="date" format="ymd">2025-12-03</say-as>，
      星期二。
      <break time="500ms"/>
      今天的天气：晴转多云，
      温度<say-as interpret-as="number">18</say-as>到<say-as interpret-as="number">25</say-as>度。
    </mstts:express-as>
  </voice>
</speak>
```

### 示例 2：客服对话

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="customerservice">
      您好，欢迎致电客服热线。
      <break time="500ms"/>
      您的订单号是<say-as interpret-as="digits">123456</say-as>。
      <break time="500ms"/>
      如需帮助，请拨打<say-as interpret-as="telephone">400-123-4567</say-as>。
    </mstts:express-as>
  </voice>
</speak>
```

### 示例 3：情感故事

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful" styledegree="2">
      从前有一个小女孩，她非常快乐。
    </mstts:express-as>
    <break time="1s"/>
    <mstts:express-as style="sad">
      但是有一天，她的小狗走失了。
    </mstts:express-as>
    <break time="1s"/>
    <mstts:express-as style="cheerful" styledegree="2">
      幸运的是，她最终找到了它！
    </mstts:express-as>
  </voice>
</speak>
```

### 示例 4：多语音对话

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="cheerful">
      大家好，我是晓晓。
    </mstts:express-as>
  </voice>
  <break time="500ms"/>
  <voice name="zh-CN-YunxiNeural">
    <mstts:express-as style="friendly">
      大家好，我是云希。
    </mstts:express-as>
  </voice>
  <break time="500ms"/>
  <voice name="zh-CN-XiaoxiaoNeural">
    今天我们一起来介绍一下语音合成技术。
  </voice>
</speak>
```

### 示例 5：教育内容

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="calm">
      今天我们学习数学。
      <break time="500ms"/>
      <emphasis level="strong">重点内容：</emphasis>
      <say-as interpret-as="number">2</say-as>加<say-as interpret-as="number">3</say-as>等于<say-as interpret-as="number">5</say-as>。
      <break time="1s"/>
      <prosody rate="slow">
        请大家仔细听好。
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

### 示例 6：导航语音

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="calm">
      <prosody rate="medium">
        前方<say-as interpret-as="number">500</say-as>米，
        <break time="300ms"/>
        <emphasis level="strong">左转</emphasis>进入人民路。
        <break time="500ms"/>
        然后<emphasis level="strong">右转</emphasis>，
        <break time="300ms"/>
        目的地在您的左手边。
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

---

## 最佳实践

### 1. 合理使用停顿

停顿能让语音更自然：

```xml
<!-- 好的示例 -->
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    第一段内容。
    <break time="500ms"/>
    第二段内容。
    <break time="500ms"/>
    第三段内容。
  </voice>
</speak>

<!-- 不好的示例：没有停顿 -->
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    第一段内容。第二段内容。第三段内容。
  </voice>
</speak>
```

### 2. 情感要符合内容

不要让情感和内容不匹配：

```xml
<!-- 好的示例 -->
<mstts:express-as style="sad">
  很遗憾，我们无法满足您的要求。
</mstts:express-as>

<!-- 不好的示例：情感不匹配 -->
<mstts:express-as style="cheerful">
  很遗憾，我们无法满足您的要求。
</mstts:express-as>
```

### 3. 控制 styleDegree

风格强度要适中：

```xml
<!-- 好的示例：适中的强度 -->
<mstts:express-as style="cheerful" styledegree="1.2">
  欢迎使用我们的服务！
</mstts:express-as>

<!-- 不好的示例：强度过大 -->
<mstts:express-as style="cheerful" styledegree="2">
  欢迎使用我们的服务！
</mstts:express-as>
```

### 4. 使用 say-as 读特殊内容

```xml
<!-- 好的示例 -->
<say-as interpret-as="telephone">010-12345678</say-as>
<say-as interpret-as="date">2025-12-03</say-as>

<!-- 不好的示例：直接读 -->
010-12345678
2025-12-03
```

### 5. 合理组合标签

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <mstts:express-as style="newscast">
      <prosody rate="medium" pitch="0%">
        今日新闻：
        <break time="500ms"/>
        <emphasis level="strong">重要消息</emphasis>
        <break time="300ms"/>
        股市今日收盘价为<say-as interpret-as="number">3500</say-as>点。
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

### 6. 测试不同语音

不同语音支持的风格不同，需要测试：

```bash
# 测试 晓晓 的 cheerful 风格
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好&voice=zh-CN-XiaoxiaoNeural&style=cheerful" \
  -H "Authorization: Bearer YOUR_TOKEN" --output xiaoxiao-cheerful.mp3

# 测试 云希 的 cheerful 风格
curl -X GET "https://your-domain.com/api/text-to-speech?text=你好&voice=zh-CN-YunxiNeural&style=cheerful" \
  -H "Authorization: Bearer YOUR_TOKEN" --output yunxi-cheerful.mp3
```

---

## 常见问题

### Q1: 所有语音都支持所有风格吗？

**A**: 不是。每个语音支持的风格不同。Neural 语音（名称中带 Neural）通常支持更多风格。通过 `/api/voices` 端点查看每个语音支持的风格列表。

### Q2: styleDegree 设置多少合适？

**A**: 
- 1.0 = 正常强度（推荐）
- 0.5-1.5 = 适合大多数场景
- < 0.5 = 风格很弱，接近普通语音
- > 1.5 = 风格很强，可能显得夸张

### Q3: 如何让语音说得更自然？

**A**: 
1. 合理使用 `<break>` 添加停顿
2. 使用 `<prosody>` 微调语速和音调
3. 选择合适的表达风格
4. 为数字、日期等使用 `<say-as>`

### Q4: SSML 文档有长度限制吗？

**A**: 是的，`/api/ssml` 端点限制为 50000 字符，`/api/text-to-speech` 的 text 参数限制为 10000 字符。

### Q5: 可以在一段语音中使用多个语音吗？

**A**: 可以！使用多个 `<voice>` 标签即可实现多语音对话。

### Q6: 如何调试 SSML？

**A**: 
1. 从简单的 SSML 开始测试
2. 逐步添加标签
3. 使用在线 XML 验证器检查语法
4. 查看 API 返回的错误信息

### Q7: prosody 的 rate 支持哪些值？

**A**: 
- 关键字：x-slow, slow, medium (default), fast, x-fast
- 百分比：50%, 100%, 200% 等
- 相对值：+10%, -20% 等

### Q8: 支持自定义音标吗？

**A**: 支持！使用 `<phoneme>` 标签，支持 IPA、SAPI、UPS 音标。

---

## 参考资源

- [W3C SSML 规范](https://www.w3.org/TR/speech-synthesis/)
- [Microsoft TTS API 文档](./API_DOCUMENTATION.md)
- [Azure 语音服务 SSML 文档](https://learn.microsoft.com/zh-cn/azure/cognitive-services/speech-service/speech-synthesis-markup)

---

**最后更新**: 2025-12-03 | **版本**: 1.0.0
