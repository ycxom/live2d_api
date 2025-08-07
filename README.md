# Live2D API (Node.js版本)

基于Node.js的Live2D模型API服务，采用模块化架构设计，支持智能目录扫描、文件监听和自动配置生成。

## 功能特性

- 🚀 **模块化架构**: 使用Express框架构建，采用MVC模式的高性能API服务
- 🔍 **智能扫描**: 自动扫描模型目录并生成配置文件
- 📦 **多格式支持**: 支持本地模型和网络模型（GitHub raw链接）
- 🎯 **缓存机制**: 内置模型列表缓存，提升响应速度
- 🔄 **文件监听**: 自动监听模型目录变化，实时更新配置
- 🌐 **CORS支持**: 支持跨域请求
- 🐳 **Docker支持**: 提供完整的Docker部署方案
- 🔧 **兼容性**: 兼容live2d-widget和原PHP版本API
- 📊 **模型缩放**: 支持动态模型缩放控制

## 安装和运行

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量（可选）
```bash
cp .env.example .env
# 编辑 .env 文件设置端口、主机等配置
```

### 3. 扫描模型目录
```bash
npm run scan
```

### 4. 启动服务
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:5674` 启动（默认端口）

### Docker 部署
```bash
# 构建镜像
npm run docker:build

# 启动服务
npm run docker:run
```

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
GET /model_list.json  # 兼容原PHP版本
```

**返回:**
```json
{
  "models": [...],
  "messages": [...]
}
```

### 模型缩放控制
```
GET /scale?id=<模型ID>&scale=<缩放比例>
POST /scale
```

### live2d-widget 兼容接口
```
GET /model/:modelName/index.json     # 获取模型配置
GET /model/:modelName/textures.cache # 获取纹理缓存
```

### 静态资源访问
```
GET /model/*          # 模型文件访问
GET /static/*         # 静态资源访问
```

**注意:** `/scan` 接口已禁用，系统会自动监听文件变化并更新配置

## 目录结构

```
live2d_api/
├── models/                         # 模型文件目录
│   ├── Potion-Maker/              # 单个模型系列
│   │   ├── Pio/
│   │   └── Tia/
│   ├── HyperdimensionNeptunia/    # 多模型系列
│   │   ├── neptune_classic/
│   │   ├── noir_classic/
│   │   └── ...
│   └── live2d-model-assets-master/ # GitHub资源包
├── src/                           # 源代码目录
│   ├── app.js                     # Express应用配置
│   ├── config/                    # 配置文件
│   │   └── index.js
│   ├── controllers/               # 控制器
│   │   └── modelController.js
│   ├── routes/                    # 路由
│   │   └── api.js
│   ├── services/                  # 服务层
│   │   ├── modelService.js
│   │   └── watcherService.js
│   └── middleware/                # 中间件
│       ├── cors.js
│       ├── logger.js
│       ├── pathFix.js
│       └── resourcePathResolver.js
├── scripts/                       # 脚本目录
│   ├── maintenance/
│   │   └── scanModels.js         # 智能扫描脚本
│   ├── docker-entrypoint.sh
│   └── setup-permissions.sh
├── config/                        # 配置目录
├── docs/                          # 文档目录
├── logs/                          # 日志目录
├── docker/                        # Docker配置
├── server.js                      # 主服务器文件
├── package.json                   # 项目配置
├── model_list.json               # 自动生成的模型配置
├── Dockerfile                     # Docker镜像配置
├── docker-compose.yml            # Docker编排配置
└── README.md                     # 说明文档
```

## 智能扫描功能

智能扫描脚本会自动：

1. **扫描本地模型**: 检测包含`index.json`或`model.json`的目录
2. **处理模型系列**: 自动将同一目录下的多个模型归为一组
3. **解析网络资源**: 处理`live2d-model-assets-master`中的GitHub链接
4. **生成配置文件**: 自动创建`model_list.json`配置文件
5. **智能分组**: 根据目录结构智能分组模型
6. **文件监听**: 自动监听模型目录变化，实时更新配置

### 支持的目录结构

```
models/
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

### 文件监听服务

系统会自动监听以下变化：
- 模型文件的添加、删除、修改
- 配置文件的变更
- 目录结构的调整

无需手动重启服务，配置会自动更新。

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

### 架构特点
- **模块化设计**: 采用MVC架构
- **缓存机制**: 模型列表缓存5分钟
- **文件监听**: 自动监听文件变化
- **错误处理**: 完善的错误处理和日志记录系统
- **兼容性**: 兼容live2d-widget和原PHP版本API

### 配置说明
- 默认端口: 5674
- 默认主机: 0.0.0.0
- 模型目录: `./models`
- 日志目录: `./logs`

### 环境变量
```bash
PORT=5674                    # 服务端口
HOST=0.0.0.0                # 服务主机
NODE_ENV=production         # 运行环境
CORS_ORIGIN=*               # CORS源
LOG_LEVEL=info              # 日志级别
```

### 特殊处理
- **KantaiCollection模型**: 提供专门的路由处理
- **资源路径解析**: 智能处理模型资源路径
- **纹理缓存**: 支持live2d-widget的纹理缓存机制

## 从PHP版本迁移

如果你之前使用PHP版本，只需：

1. 安装Node.js依赖: `npm install`
2. 运行扫描脚本生成新的配置文件: `npm run scan`
3. 启动Node.js服务器: `npm start`

原有的模型文件无需修改，API接口保持兼容。

## Docker部署

### 快速启动
```bash
docker-compose up -d
```

### 自定义构建
```bash
docker build -t live2d-api .
docker run -p 5674:5674 -v ./models:/app/models live2d-api
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
