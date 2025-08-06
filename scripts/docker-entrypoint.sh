#!/bin/sh

# 确保容器内目录权限正确
mkdir -p /app/config
mkdir -p /app/logs
mkdir -p /app/models

# 设置权限
chmod -R 777 /app/config
chmod -R 777 /app/logs
chmod -R 777 /app/models

# 创建初始的model_list.json文件（如果不存在）
if [ ! -f /app/config/model_list.json ]; then
  echo '{"models":[],"messages":[]}' > /app/config/model_list.json
  chmod 666 /app/config/model_list.json
fi

# 执行原始的命令
exec "$@"