# Live2D API Docker 部署指南

## 📋 概述

本项目已配置支持 Docker 容器化部署，包含以下特性：

- ✅ 配置文件热重载支持
- ✅ 多环境部署支持
- ✅ 健康检查机制
- ✅ 日志持久化
- ✅ 非root用户运行
- ✅ 资源优化

## 🚀 快速开始

### 方法一：使用 Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方法二：使用 Docker 命令

```bash
# 构建镜像
docker build -t live2d-api .

# 运行容器
docker run -d \
  --name live2d-api \
  -p 3000:3000 \
  -v $(pwd)/config/debug.json:/app/config/debug.json \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/model:/app/model \
  live2d-api
```

### 方法三：使用构建脚本

```bash
# 给脚本执行权限
chmod +x scripts/*.sh

# 构建镜像
./scripts/docker-build.sh

# 部署到不同环境
./scripts/docker-deploy.sh dev      # 开发环境 (端口3002)
./scripts/docker-deploy.sh staging  # 预发布环境 (端口3001)
./scripts/docker-deploy.sh prod     # 生产环境 (端口3000)
```

## 🔧 配置文件热重载

### Debug 配置热重载

项目支持 `config/debug.json` 配置文件的热重载功能：

1. **修改配置文件**：直接编辑 `config/debug.json`
2. **自动重载**：系统会自动检测文件变化并重新加载配置
3. **实时生效**：无需重启容器，配置立即生效

### 配置项说明

```json
{
  "enabled": true,              // 是否启用调试
  "level": "info",             // 日志级别: debug, info, warn, error
  "logToFile": false,          // 是否记录到文件
  "showTimestamp": true,       // 显示时间戳
  "showLevel": true,           // 显示日志级别
  "modules": {                 // 模块开关
    "server": true,
    "model": true,
    "api": true,
    "middleware": true,
    "webgl": true,
    "performance": true
  },
  "performance": {             // 性能监控
    "trackRequests": true,
    "trackMemory": true,
    "slowRequestThreshold": 1000
  },
  "api": {                     // API日志
    "logRequests": true,
    "logResponses": false,
    "logErrors": true
  }
}
```

## 🌍 多环境部署

### 环境配置

| 环境 | 端口 | 调试模式 | 重启策略 | 用途 |
|------|------|----------|----------|------|
| dev | 3002 | 启用 | no | 开发测试 |
| staging | 3001 | 启用 | unless-stopped | 预发布验证 |
| prod | 3000 | 禁用 | always | 生产环境 |

### 部署命令

```bash
# 开发环境
./scripts/docker-deploy.sh dev

# 预发布环境
./scripts/docker-deploy.sh staging

# 生产环境
./scripts/docker-deploy.sh prod
```

## 📊 监控和维护

### 健康检查

容器内置健康检查机制，每30秒检查一次服务状态：

```bash
# 查看健康状态
docker ps

# 查看健康检查日志
docker inspect live2d-api | grep -A 10 Health
```

### 日志管理

```bash
# 查看实时日志
docker logs -f live2d-api

# 查看最近100行日志
docker logs --tail 100 live2d-api

# 查看应用日志文件
tail -f logs/debug.log
```

### 性能监控

```bash
# 查看容器资源使用情况
docker stats live2d-api

# 查看容器详细信息
docker inspect live2d-api
```

## 🔧 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看错误日志
   docker logs live2d-api
   
   # 检查端口占用
   netstat -tulpn | grep :3000
   ```

2. **配置文件不生效**
   ```bash
   # 检查文件挂载
   docker exec live2d-api ls -la /app/config/
   
   # 重启容器
   docker restart live2d-api
   ```

3. **模型文件访问问题**
   ```bash
   # 检查模型目录权限
   docker exec live2d-api ls -la /app/model/
   
   # 修复权限
   sudo chown -R 1001:1001 model/
   ```

### 调试模式

启用详细调试信息：

```bash
# 修改 config/debug.json
{
  "enabled": true,
  "level": "debug",
  "modules": {
    "server": true,
    "model": true,
    "api": true,
    "middleware": true,
    "webgl": true,
    "performance": true
  }
}
```

## 📁 目录结构

```
live2d_api/
├── Dockerfile              # Docker镜像构建文件
├── docker-compose.yml      # Docker Compose配置
├── .dockerignore           # Docker忽略文件
├── config/
│   ├── debug.js           # 调试配置模块
│   └── debug.json         # 调试配置文件（支持热重载）
├── scripts/
│   ├── docker-build.sh    # 构建脚本
│   └── docker-deploy.sh   # 部署脚本
├── logs/                  # 日志目录（挂载）
├── model/                 # 模型文件目录（挂载）
└── README-Docker.md       # 本文档
```

## 🚀 生产环境建议

1. **资源限制**：在 docker-compose.yml 中添加资源限制
2. **日志轮转**：配置日志轮转避免磁盘空间不足
3. **监控告警**：集成监控系统（如 Prometheus + Grafana）
4. **备份策略**：定期备份配置文件和模型数据
5. **安全加固**：使用非root用户，限制网络访问

## 📞 技术支持

如遇到问题，请检查：
1. Docker 版本是否兼容（推荐 20.10+）
2. 端口是否被占用
3. 文件权限是否正确
4. 配置文件格式是否正确

更多信息请参考项目主 README 文件。