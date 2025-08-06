#!/bin/bash

# Live2D API Docker 构建脚本
# 使用方法: ./scripts/docker-build.sh [tag]

set -e

# 默认标签
TAG=${1:-latest}
IMAGE_NAME="live2d-api"

echo "🚀 开始构建 Live2D API Docker 镜像..."
echo "📦 镜像名称: $IMAGE_NAME:$TAG"

# 检查 Dockerfile 是否存在
if [ ! -f "Dockerfile" ]; then
    echo "❌ 错误: 找不到 Dockerfile 文件"
    exit 1
fi

# 检查必要的文件
echo "🔍 检查必要文件..."
required_files=("package.json" "server_modular.js" "config/debug.js" "config/debug.json")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 错误: 找不到必要文件 $file"
        exit 1
    fi
done

# 创建日志目录
mkdir -p logs

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker build -t $IMAGE_NAME:$TAG .

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ Docker 镜像构建成功!"
    echo "📋 镜像信息:"
    docker images | grep $IMAGE_NAME
    echo ""
    echo "🚀 运行命令:"
    echo "  docker run -p 3000:3000 $IMAGE_NAME:$TAG"
    echo "  或者使用 docker-compose up"
else
    echo "❌ Docker 镜像构建失败!"
    exit 1
fi