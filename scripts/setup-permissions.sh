#!/bin/bash

# 确保目录存在
mkdir -p config
mkdir -p logs
mkdir -p models

# 设置适当的权限
chmod -R 777 config
chmod -R 777 logs
chmod -R 777 models

# 创建初始的model_list.json文件（如果不存在）
if [ ! -f config/model_list.json ]; then
  echo '{"models":[],"messages":[]}' > config/model_list.json
  chmod 666 config/model_list.json
fi

echo "权限设置完成！"