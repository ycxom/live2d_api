# Debug调试指南

## 概述

Live2D API服务提供了灵活的调试开关系统，允许开发者在需要时启用详细的调试输出，在生产环境中关闭调试信息以提高性能。

## 调试开关配置

### 环境变量方式

通过设置环境变量来控制调试输出：

```bash
# 启用路径修复中间件调试
$env:PATH_FIX_DEBUG = "true"

# 启用模型服务调试
$env:MODEL_SERVICE_DEBUG = "true"

# 启用控制器调试
$env:CONTROLLER_DEBUG = "true"

# 启用全局调试（所有模块）
$env:DEBUG = "true"

# 启动服务器
node server_modular.js
```

### 配置文件方式

编辑 `config/debug.js` 文件：

```javascript
module.exports = {
    // 路径修复中间件调试开关
    pathFixDebug: true,  // 改为true启用
    
    // 模型服务调试开关
    modelServiceDebug: true,  // 改为true启用
    
    // 控制器调试开关
    controllerDebug: true,  // 改为true启用
    
    // 全局调试开关
    globalDebug: false,  // 改为true启用所有调试
};
```

## 可用的调试模块

### 1. 路径修复中间件 (pathFix)

**环境变量**: `PATH_FIX_DEBUG=true`

**调试信息包括**:
- 原始请求路径
- 检测到的需要修复的路径
- index.json映射过程
- 路径修复匹配结果
- textures.cache文件检查

**示例输出**:
```
[PATHFIX_DEBUG] 原始请求路径: /live2d-model-assets-master/assets/moc/girls-frontline/G11/destroy/model.json/model.moc
[PATHFIX_DEBUG] 检测到需要修复的路径: /live2d-model-assets-master/assets/moc/girls-frontline/G11/destroy/model.json/model.moc
[PATHFIX_DEBUG] 使用备用修复规则: /live2d-model-assets-master/assets/moc/girls-frontline/G11/destroy/model.json/model.moc -> /live2d-model-assets-master/assets/moc/girls-frontline/G11/destroy/model.moc
```

### 2. 模型服务 (modelService)

**环境变量**: `MODEL_SERVICE_DEBUG=true`

**调试信息包括**:
- 模型缓存操作
- 模型文件读取
- JSON配置处理
- 错误处理过程

### 3. 控制器 (controller)

**环境变量**: `CONTROLLER_DEBUG=true`

**调试信息包括**:
- API请求处理
- 参数验证
- 响应生成过程

## 使用场景

### 开发调试

启用所有调试信息：
```bash
$env:DEBUG = "true"
node server_modular.js
```

### 路径问题排查

只启用路径修复调试：
```bash
$env:PATH_FIX_DEBUG = "true"
node server_modular.js
```

### 生产环境

关闭所有调试（默认状态）：
```bash
# 不设置任何DEBUG环境变量
node server_modular.js
```

## 性能影响

- **调试关闭时**: 几乎无性能影响，只有简单的布尔值检查
- **调试开启时**: 会增加控制台输出，建议仅在开发和排错时使用
- **生产环境**: 建议关闭所有调试开关以获得最佳性能

## 注意事项

1. 调试信息可能包含敏感的路径信息，生产环境请务必关闭
2. 大量的调试输出可能影响性能，仅在需要时启用
3. 环境变量优先级高于配置文件设置
4. 全局调试开关(`DEBUG=true`)会覆盖所有单独的调试开关