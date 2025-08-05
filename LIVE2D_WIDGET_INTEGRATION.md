# Live2D Widget 集成说明

本 API 已成功适配 live2d-widget，支持直接与 live2d-widget 集成使用，无需修改 widget 代码。

## API 端点

### 1. 模型列表端点
```
GET /model_list.json
```

返回格式：
```json
{
  "messages": ["模型1描述", "模型2描述", ...],
  "models": ["模型1名称", "模型2名称", ...]
}
```

### 2. 模型配置端点
```
GET /model/{modelName}/index.json
```

返回指定模型的完整配置文件，包含模型文件路径、纹理、动作、表情等信息。

### 3. 纹理缓存端点（Cubism 2 模型）
```
GET /model/{modelName}/textures.cache
```

返回 Cubism 2 模型的纹理缓存信息，用于支持多纹理切换。

## 使用方法

### 1. 在 live2d-widget 中配置

```javascript
// 使用 cdnPath 配置
initWidget({
  waifuPath: '/path/to/waifu-tips.json',
  cdnPath: 'http://your-api-server:1551/',  // 你的 API 服务器地址
  // 其他配置...
});
```

### 2. 测试集成

访问 `http://localhost:1551/live2d-widget-test.html` 进行集成测试。

## 兼容性说明

- ✅ 支持 Cubism 2 和 Cubism 3+ 模型
- ✅ 支持多纹理模型
- ✅ 支持动作和表情文件
- ✅ 支持模型缩放控制
- ✅ 完全兼容 live2d-widget 的 API 期望

## 模型路径处理

API 会自动处理以下类型的模型：

1. **标准本地模型**：位于 `model/` 目录下的模型
2. **Live2D Model Assets**：使用相对路径的模型文件
3. **网络模型**：通过 URL 引用的远程模型

所有路径都会被正确处理，确保 live2d-widget 能够正确加载资源文件。

## 注意事项

1. 确保服务器配置了正确的 CORS 头，允许跨域访问
2. 模型文件路径使用 URL 编码，特殊字符会被正确处理
3. 纹理缓存端点对于没有多纹理的模型会返回空数组，这是正常行为
4. API 保持向后兼容，原有的端点仍然可用

## 测试

运行服务器后，访问以下 URL 进行测试：

- 模型列表：`http://localhost:1551/model_list.json`
- 模型配置：`http://localhost:1551/model/bilibili-live%2F22/index.json`
- 纹理缓存：`http://localhost:1551/model/bilibili-live%2F22/textures.cache`
- 集成测试页面：`http://localhost:1551/live2d-widget-test.html`