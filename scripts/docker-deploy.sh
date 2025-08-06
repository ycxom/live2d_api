#!/bin/bash

# Live2D API Docker 部署脚本
# 使用方法: ./scripts/docker-deploy.sh [环境]

set -e

# 环境参数
ENV=${1:-dev}
IMAGE_NAME="live2d-api"
CONTAINER_NAME="live2d-api-$ENV"

echo "🚀 开始部署 Live2D API..."
echo "🌍 部署环境: $ENV"
echo "📦 容器名称: $CONTAINER_NAME"

# 停止并删除现有容器
echo "🛑 停止现有容器..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 根据环境设置不同的配置
case $ENV in
    "prod"|"production")
        PORT=3000
        DEBUG_ENABLED=false
        RESTART_POLICY="always"
        echo "🏭 生产环境部署"
        ;;
    "staging")
        PORT=3001
        DEBUG_ENABLED=true
        RESTART_POLICY="unless-stopped"
        echo "🧪 预发布环境部署"
        ;;
    *)
        PORT=3002
        DEBUG_ENABLED=true
        RESTART_POLICY="no"
        echo "🔧 开发环境部署"
        ;;
esac

# 创建必要的目录
mkdir -p logs
mkdir -p model

# 运行新容器
echo "🚀 启动新容器..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart $RESTART_POLICY \
    -p $PORT:3000 \
    -e NODE_ENV=$ENV \
    -e DEBUG=$DEBUG_ENABLED \
    -v $(pwd)/config/debug.json:/app/config/debug.json \
    -v $(pwd)/logs:/app/logs \
    -v $(pwd)/model:/app/model \
    $IMAGE_NAME:latest

# 检查容器状态
sleep 5
if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ 容器启动成功!"
    echo "🌐 访问地址: http://localhost:$PORT"
    echo "📊 容器状态:"
    docker ps | grep $CONTAINER_NAME
    echo ""
    echo "📝 查看日志: docker logs -f $CONTAINER_NAME"
    echo "🛑 停止容器: docker stop $CONTAINER_NAME"
else
    echo "❌ 容器启动失败!"
    echo "📝 查看错误日志:"
    docker logs $CONTAINER_NAME
    exit 1
fi