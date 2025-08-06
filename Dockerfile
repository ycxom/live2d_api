# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S live2d -u 1001

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 添加入口点脚本
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建必要的目录并设置权限
RUN mkdir -p logs && \
    mkdir -p models && \
    mkdir -p config && \
    chown -R live2d:nodejs /app && \
    chmod -R 755 /app && \
    chmod -R 777 /app/config && \
    chmod -R 777 /app/logs && \
    chmod -R 777 /app/models

# 切换到非root用户
USER live2d

# 暴露端口
EXPOSE 3000

# 设置入口点
ENTRYPOINT ["docker-entrypoint.sh"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/list', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# 启动应用
CMD ["npm", "start"]