const path = require('path');

// 环境配置
const env = process.env.NODE_ENV || 'development';

// 基础配置
const baseConfig = {
  port: process.env.PORT || 5674,
  host: process.env.HOST || '0.0.0.0',
  
  // 路径配置
  paths: {
    models: path.join(__dirname, '../../models'),
    public: path.join(__dirname, '../../public'),
    logs: path.join(__dirname, '../../logs'),
    temp: path.join(__dirname, '../../temp')
  },
  
  // 缓存配置
  cache: {
    modelListTTL: 5 * 60 * 1000, // 5分钟
    enabled: true
  },
  
  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log'
  }
};

// 环境特定配置
const envConfigs = {
  development: {
    ...baseConfig,
    debug: true,
    logging: {
      ...baseConfig.logging,
      level: 'debug'
    }
  },
  
  production: {
    ...baseConfig,
    debug: false,
    logging: {
      ...baseConfig.logging,
      level: 'warn'
    }
  },
  
  test: {
    ...baseConfig,
    port: 3001,
    cache: {
      ...baseConfig.cache,
      enabled: false
    }
  }
};

module.exports = envConfigs[env] || baseConfig;