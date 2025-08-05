# Live2D API (Node.js版本)

基于Node.js的Live2D模型API服务，支持智能目录扫描和自动配置生成。

## 功能特性

- 🚀 **Node.js架构**: 使用Express框架构建的高性能API服务
- 🔍 **智能扫描**: 自动扫描模型目录并生成配置文件
- 📦 **多格式支持**: 支持本地模型和网络模型（GitHub raw链接）
- 🎯 **缓存机制**: 内置模型列表缓存，提升响应速度
- 🔄 **热更新**: 支持运行时重新扫描模型目录
- 🌐 **CORS支持**: 支持跨域请求

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 扫描模型目录
```bash
npm run scan
```

### 3. 启动服务
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动

## API接口

### 获取模型信息
```
GET /get?id=<模型ID>[-<纹理ID>]
```

**参数:**
- `id`: 模型ID，从1开始
- 可选的纹理ID，用`-`分隔

**示例:**
```
GET /get?id=1      # 获取第1个模型
GET /get?id=1-2    # 获取第1个模型的第2个纹理
```

### 随机获取模型
```
GET /rand?id=<当前模型ID>
```

**参数:**
- `id`: 当前模型ID（可选），用于避免重复

**返回:**
```json
{
  "model": {
    "id": 2,
    "name": "模型名称",
    "message": "模型描述"
  }
}
```

### 获取模型列表
```
GET /list
```

**返回:**
```json
{
  "models": [...],
  "messages": [...]
}
```

### 重新扫描模型目录
```
POST /scan
```

## 目录结构

```
live2d_api/
├── model/                          # 模型文件目录
│   ├── Potion-Maker/              # 单个模型系列
│   │   ├── Pio/
│   │   └── Tia/
│   ├── HyperdimensionNeptunia/    # 多模型系列
│   │   ├── neptune_classic/
│   │   ├── noir_classic/
│   │   └── ...
│   └── live2d-model-assets-master/ # GitHub资源包
├── scripts/
│   └── scanModels.js              # 智能扫描脚本
├── server.js                      # 主服务器文件
├── package.json                   # 项目配置
├── model_list.json               # 自动生成的模型配置
└── README.md                     # 说明文档
```

## 智能扫描功能

智能扫描脚本会自动：

1. **扫描本地模型**: 检测包含`index.json`或`model.json`的目录
2. **处理模型系列**: 自动将同一目录下的多个模型归为一组
3. **解析网络资源**: 处理`live2d-model-assets-master`中的GitHub链接
4. **生成配置文件**: 自动创建`model_list.json`配置文件
5. **智能分组**: 根据目录结构智能分组模型

### 支持的目录结构

```
model/
├── 单个模型/
│   ├── index.json
│   └── ...
├── 模型系列/
│   ├── 子模型1/
│   │   ├── model.json
│   │   └── ...
│   └── 子模型2/
│       ├── model.json
│       └── ...
└── live2d-model-assets-master/
    └── assets/
        ├── model.index
        └── ...
```

## 配置文件格式

`model_list.json` 支持两种格式：

```json
{
  "models": [
    "单个模型名称",
    ["系列模型1", "系列模型2", "系列模型3"],
    "https://raw.githubusercontent.com/..."
  ],
  "messages": [
    "单个模型描述",
    "系列模型描述",
    "网络模型描述"
  ]
}
```

## 开发说明

- 模型列表会缓存5分钟，可通过`/scan`接口手动刷新
- 支持本地文件路径和完整URL两种模型格式
- 自动处理模型资源路径（纹理、动作、表情等）
- 内置错误处理和日志记录

## 从PHP版本迁移

如果你之前使用PHP版本，只需：

1. 安装Node.js依赖
2. 运行扫描脚本生成新的配置文件
3. 启动Node.js服务器

原有的模型文件无需修改。