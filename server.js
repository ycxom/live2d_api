const app = require('./src/app');
const config = require('./src/config');

const PORT = config.port;
const HOST = config.host;

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`🚀 Live2D API 服务器已启动`);
  console.log(`📍 地址: http://${HOST}:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 模型目录: ${config.paths.models}`);
  console.log('='.repeat(50));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});