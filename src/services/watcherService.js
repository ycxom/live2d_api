const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const { scanModels } = require('../../scripts/maintenance/scanModels');
const ModelService = require('./modelService');
const config = require('../config');
const debugConfig = require('../config/debug');
const debugLog = debugConfig.createDebugLogger('watcherService');

class WatcherService {
  static watcher = null;
  static isScanning = false;
  static debounceTimeout = null;
  static debounceDelay = 2000; // 2秒防抖延迟

  /**
   * 初始化文件监听服务
   */
  static init() {
    if (this.watcher) {
      this.stop();
    }

    const modelsDir = path.join(__dirname, '../../models');
    debugLog(`开始监听模型目录: ${modelsDir}`);

    // 确保模型目录存在
    fs.ensureDirSync(modelsDir);

    // 创建监听器
    this.watcher = chokidar.watch(modelsDir, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000, // 等待文件写入完成的时间
        pollInterval: 100
      }
    });

    // 监听文件变化事件
    this.watcher
      .on('add', path => this.handleChange('添加文件', path))
      .on('change', path => this.handleChange('修改文件', path))
      .on('unlink', path => this.handleChange('删除文件', path))
      .on('addDir', path => this.handleChange('添加目录', path))
      .on('unlinkDir', path => this.handleChange('删除目录', path))
      .on('error', error => console.error(`文件监听错误: ${error}`))
      .on('ready', () => console.log('模型目录监听已启动，等待文件变化...'));

    console.log('文件监听服务已初始化');
    return this.watcher;
  }

  /**
   * 处理文件变化事件
   * @param {string} event 事件类型
   * @param {string} filePath 文件路径
   */
  static handleChange(event, filePath) {
    debugLog(`检测到文件变化 [${event}]: ${filePath}`);
    
    // 使用防抖处理，避免短时间内多次触发扫描
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      if (this.isScanning) {
        debugLog('已有扫描任务在进行中，跳过本次扫描');
        return;
      }

      try {
        this.isScanning = true;
        debugLog('开始重新扫描模型目录...');
        
        await scanModels();
        
        // 清除模型列表缓存
        ModelService.clearCache();
        
        debugLog('模型目录扫描完成，模型列表已更新');
      } catch (error) {
        console.error('自动扫描模型目录失败:', error);
      } finally {
        this.isScanning = false;
      }
    }, this.debounceDelay);
  }

  /**
   * 停止文件监听
   */
  static stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('文件监听服务已停止');
    }
  }
}

module.exports = WatcherService;