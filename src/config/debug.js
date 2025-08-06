const fs = require('fs');
const path = require('path');

class DebugConfig {
  constructor() {
    this.configPath = path.join(__dirname, 'debug.json');
    this.config = {};
    this.watchers = [];
    this.loadConfig();
    this.setupHotReload();
  }

  // 加载配置文件
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        console.log('✅ Debug配置已加载:', this.configPath);
      } else {
        // 创建默认配置文件
        this.config = this.getDefaultConfig();
        this.saveConfig();
        console.log('📝 已创建默认debug配置文件:', this.configPath);
      }
    } catch (error) {
      console.error('❌ 加载debug配置失败:', error.message);
      this.config = this.getDefaultConfig();
    }
  }

  // 获取默认配置
  getDefaultConfig() {
    return {
      enabled: true,
      level: 'info', // debug, info, warn, error
      logToFile: false,
      logFilePath: './logs/debug.log',
      showTimestamp: true,
      showLevel: true,
      colorOutput: true,
      modules: {
        server: true,
        model: true,
        api: true,
        middleware: true,
        webgl: true,
        performance: true
      },
      performance: {
        trackRequests: true,
        trackMemory: true,
        trackCPU: false,
        slowRequestThreshold: 1000 // ms
      },
      api: {
        logRequests: true,
        logResponses: false,
        logErrors: true,
        maxBodyLength: 1000
      }
    };
  }

  // 保存配置到文件
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ 保存debug配置失败:', error.message);
    }
  }

  // 设置热重载
  setupHotReload() {
    if (fs.existsSync(this.configPath)) {
      const watcher = fs.watchFile(this.configPath, (curr, prev) => {
        console.log('🔄 检测到debug配置文件变化，正在重新加载...');
        this.loadConfig();
        this.notifyWatchers();
      });
      this.watchers.push(watcher);
    }
  }

  // 通知监听器配置已更新
  notifyWatchers() {
    this.watchers.forEach(callback => {
      if (typeof callback === 'function') {
        callback(this.config);
      }
    });
  }

  // 添加配置变化监听器
  onConfigChange(callback) {
    this.watchers.push(callback);
  }

  // 获取配置值
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  // 设置配置值
  set(key, value) {
    const keys = key.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
    this.saveConfig();
  }

  // 检查是否启用调试
  isEnabled(module = null) {
    if (!this.config.enabled) return false;
    if (module && this.config.modules) {
      return this.config.modules[module] !== false;
    }
    return true;
  }

  // 获取日志级别
  getLevel() {
    return this.config.level || 'info';
  }

  // 检查是否应该记录特定级别的日志
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.getLevel());
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }

  // 格式化日志消息
  formatMessage(level, module, message, data = null) {
    if (!this.isEnabled(module) || !this.shouldLog(level)) {
      return null;
    }

    let formatted = '';
    
    if (this.config.showTimestamp) {
      formatted += `[${new Date().toISOString()}] `;
    }
    
    if (this.config.showLevel) {
      formatted += `[${level.toUpperCase()}] `;
    }
    
    if (module) {
      formatted += `[${module}] `;
    }
    
    formatted += message;
    
    if (data) {
      formatted += ' ' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    }
    
    return formatted;
  }

  // 日志方法
  debug(module, message, data) {
    const formatted = this.formatMessage('debug', module, message, data);
    if (formatted) console.log(formatted);
  }

  info(module, message, data) {
    const formatted = this.formatMessage('info', module, message, data);
    if (formatted) console.info(formatted);
  }

  warn(module, message, data) {
    const formatted = this.formatMessage('warn', module, message, data);
    if (formatted) console.warn(formatted);
  }

  error(module, message, data) {
    const formatted = this.formatMessage('error', module, message, data);
    if (formatted) console.error(formatted);
  }

  // 性能监控
  trackRequest(req, res, next) {
    if (!this.isEnabled('performance') || !this.config.performance?.trackRequests) {
      return next();
    }

    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const duration = Date.now() - startTime;
      const isSlowRequest = duration > (debugConfig.config.performance?.slowRequestThreshold || 1000);
      
      if (isSlowRequest) {
        debugConfig.warn('performance', `慢请求检测: ${req.method} ${req.path} - ${duration}ms`);
      } else if (debugConfig.config.api?.logRequests) {
        debugConfig.info('api', `${req.method} ${req.path} - ${duration}ms`);
      }
      
      originalSend.call(this, data);
    };

    next();
  }

  // 内存监控
  trackMemory() {
    if (!this.isEnabled('performance') || !this.config.performance?.trackMemory) {
      return;
    }

    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    
    this.info('performance', '内存使用情况', {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external)
    });
  }

  // 创建模块专用的调试日志器
  createDebugLogger(module) {
    return (message, data) => {
      this.debug(module, message, data);
    };
  }

  // 清理资源
  cleanup() {
    this.watchers.forEach(watcher => {
      if (typeof watcher === 'function') {
        fs.unwatchFile(this.configPath, watcher);
      }
    });
    this.watchers = [];
  }
}

// 创建全局实例
const debugConfig = new DebugConfig();

// 导出实例和类
module.exports = debugConfig;
module.exports.DebugConfig = DebugConfig;

// 优雅关闭处理
process.on('SIGINT', () => {
  debugConfig.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  debugConfig.cleanup();
  process.exit(0);
});