// 服务器配置
const config = {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    
    // 缓存配置
    cache: {
        duration: 5 * 60 * 1000, // 5分钟缓存
    },
    
    // 静态文件配置
    static: {
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    },
    
    // 调试配置
    debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',
};

module.exports = config;