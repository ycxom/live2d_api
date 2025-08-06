const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入配置
const config = require('./src/config/server');
const debugConfig = require('./src/config/debug');

// 导入中间件
const corsMiddleware = require('./src/middleware/cors');
const loggerMiddleware = require('./src/middleware/logger');
const pathFixMiddleware = require('./src/middleware/pathFix');
const ResourcePathResolver = require('./src/middleware/resourcePathResolver');

// 导入路由
const indexRoutes = require('./src/routes/index');
const apiRoutes = require('./src/routes/api');

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 自定义中间件
if (config.debug || debugConfig.isEnabled('server')) {
    app.use(loggerMiddleware);
}

// 添加性能监控中间件
if (debugConfig.isEnabled('performance')) {
    app.use(debugConfig.trackRequest.bind(debugConfig));
}

app.use(corsMiddleware);

// 资源路径解析中间件 - 处理复杂相对路径
app.use(ResourcePathResolver);

// 路径修复中间件 - 处理 .model.json/ 被错误当作目录的情况
app.use(pathFixMiddleware);

// 路由 - 必须在静态文件服务之前，以便API路由能够被正确匹配
app.use('/', indexRoutes);
app.use('/', apiRoutes);

// 添加静态文件服务，暴露模型文件 - 放在API路由之后作为fallback
app.use('/model', express.static(path.join(__dirname, 'models')));

// 特殊处理：KantaiCollection模型的子目录映射
app.use('/model/KantaiCollection', express.static(path.join(__dirname, 'models', 'KantaiCollection', 'murakumo')));

// 启动服务器
const HOST = config.host || '0.0.0.0'; // 使用配置文件中的HOST设置
app.listen(config.port, HOST, () => {
    debugConfig.info('server', `Live2D API 服务器运行在 http://${HOST}:${config.port}`);
    debugConfig.info('server', `本地访问地址: http://localhost:${config.port}`);
    debugConfig.info('server', `公网访问地址: http://你的公网IP:${config.port}`);
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
    
    // 显示调试配置状态
    if (debugConfig.isEnabled()) {
        debugConfig.info('server', '调试模式已启用', {
            level: debugConfig.getLevel(),
            modules: Object.keys(debugConfig.config.modules).filter(m => debugConfig.config.modules[m])
        });
    }
    
    // 启动性能监控
    if (debugConfig.isEnabled('performance')) {
        setInterval(() => {
            debugConfig.trackMemory();
        }, 30000); // 每30秒监控一次内存
    }
    
    debugConfig.info('server', '服务器已配置为公网可访问 (0.0.0.0)');
    debugConfig.info('server', '配置文件热重载已启用，修改 config/debug.json 将自动生效');
});

module.exports = app;