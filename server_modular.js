const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入配置
const config = require('./config/server');

// 导入中间件
const corsMiddleware = require('./middleware/cors');
const loggerMiddleware = require('./middleware/logger');
const pathFixMiddleware = require('./middleware/pathFix');

// 导入路由
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 自定义中间件
if (config.debug) {
    app.use(loggerMiddleware);
}
app.use(corsMiddleware);

// 路径修复中间件 - 处理 .model.json/ 被错误当作目录的情况
app.use('/model', pathFixMiddleware);

// 添加静态文件服务，暴露模型文件
app.use('/model', express.static(path.join(__dirname, 'model')));

// 路由
app.use('/', indexRoutes);
app.use('/', apiRoutes);

// 启动服务器
const HOST = '0.0.0.0'; // 确保可以从公网访问
app.listen(config.port, HOST, () => {
    console.log(`Live2D API 服务器运行在 http://${HOST}:${config.port}`);
    console.log(`本地访问地址: http://localhost:${config.port}`);
    console.log(`公网访问地址: http://你的公网IP:${config.port}`);
    console.log('');
    console.log('API端点:');
    console.log('  GET  /get?id=<模型ID>     - 获取指定模型');
    console.log('  GET  /rand?id=<当前ID>    - 随机获取模型');
    console.log('  GET  /list               - 获取模型列表');
    console.log('  GET  /model_list.json    - 获取模型列表（兼容）');
    console.log('  GET  /scale?id=<ID>&scale=<比例> - 获取缩放模型');
    console.log('  POST /scale              - 设置模型缩放');
    console.log('  GET  /scale-control      - 缩放控制面板');
    console.log('  GET  /scan               - 重新扫描模型目录');
    console.log('  POST /scan               - 重新扫描模型目录');
    console.log('');
    if (config.debug) {
        console.log('[DEBUG] 调试日志已启用');
    }
    console.log('[INFO] 服务器已配置为公网可访问 (0.0.0.0)');
});

module.exports = app;