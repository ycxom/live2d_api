#!/bin/bash

# Live2D API Docker 快速启动脚本

echo "🚀 Live2D API Docker 快速启动"
echo "================================"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p model

# 检查配置文件
if [ ! -f "config/debug.json" ]; then
    echo "❌ 错误: 找不到 config/debug.json 配置文件"
    exit 1
fi

echo "📋 选择启动方式:"
echo "1) 使用 Docker Compose (推荐)"
echo "2) 使用 Docker 命令"
echo "3) 构建并部署到开发环境"
echo "4) 构建并部署到生产环境"
echo

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo "🚀 使用 Docker Compose 启动..."
        docker-compose up -d
        if [ $? -eq 0 ]; then
            echo "✅ 服务启动成功!"
            echo "🌐 访问地址: http://localhost:3000"
            echo "📝 查看日志: docker-compose logs -f"
            echo "🛑 停止服务: docker-compose down"
        fi
        ;;
    2)
        echo "🔨 构建 Docker 镜像..."
        docker build -t live2d-api .
        if [ $? -eq 0 ]; then
            echo "🚀 启动容器..."
            docker run -d \
                --name live2d-api \
                -p 3000:3000 \
                -v $(pwd)/config/debug.json:/app/config/debug.json \
                -v $(pwd)/logs:/app/logs \
                -v $(pwd)/model:/app/model \
                live2d-api
            echo "✅ 容器启动成功!"
            echo "🌐 访问地址: http://localhost:3000"
        fi
        ;;
    3)
        echo "🔧 构建并部署到开发环境..."
        ./scripts/docker-build.sh
        ./scripts/docker-deploy.sh dev
        ;;
    4)
        echo "🏭 构建并部署到生产环境..."
        ./scripts/docker-build.sh
        ./scripts/docker-deploy.sh prod
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac