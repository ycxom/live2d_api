const path = require('path');
const fs = require('fs-extra');

class ScaleService {
    static scaleConfigPath = path.join(__dirname, '..', 'model_scale_config.json');
    static scaleCache = new Map();

    // 加载缩放配置
    static async loadScaleConfig() {
        try {
            if (await fs.pathExists(this.scaleConfigPath)) {
                const configs = await fs.readJson(this.scaleConfigPath);
                console.log(`[DEBUG] 加载缩放配置成功，包含 ${Object.keys(configs).length} 个模型配置`);
                return configs;
            }
            return {};
        } catch (error) {
            console.error('[DEBUG] 加载缩放配置失败:', error);
            return {};
        }
    }

    // 获取模型缩放配置
    static async getModelScale(modelId) {
        try {
            // 先检查缓存
            if (this.scaleCache.has(modelId)) {
                return this.scaleCache.get(modelId);
            }

            // 从文件加载
            const configs = await this.loadScaleConfig();
            const scaleConfig = configs[modelId];
            
            if (scaleConfig) {
                this.scaleCache.set(modelId, scaleConfig);
                console.log(`[DEBUG] 获取模型 ${modelId} 缩放配置: scale=${scaleConfig.scale}`);
                return scaleConfig;
            }
            
            return null;
        } catch (error) {
            console.error(`[DEBUG] 获取模型 ${modelId} 缩放配置失败:`, error);
            return null;
        }
    }

    // 保存模型缩放配置
    static async saveModelScale(modelId, scaleConfig) {
        try {
            const configs = await this.loadScaleConfig();
            configs[modelId] = {
                ...scaleConfig,
                timestamp: new Date().toISOString()
            };
            
            await fs.writeJson(this.scaleConfigPath, configs, { spaces: 2 });
            
            // 更新缓存
            this.scaleCache.set(modelId, configs[modelId]);
            
            console.log(`[DEBUG] 保存模型 ${modelId} 缩放配置成功: scale=${scaleConfig.scale}`);
            return true;
        } catch (error) {
            console.error(`[DEBUG] 保存模型 ${modelId} 缩放配置失败:`, error);
            return false;
        }
    }

    // 删除模型缩放配置
    static async removeModelScale(modelId) {
        try {
            const configs = await this.loadScaleConfig();
            delete configs[modelId];
            
            await fs.writeJson(this.scaleConfigPath, configs, { spaces: 2 });
            
            // 清除缓存
            this.scaleCache.delete(modelId);
            
            console.log(`[DEBUG] 删除模型 ${modelId} 缩放配置成功`);
            return true;
        } catch (error) {
            console.error(`[DEBUG] 删除模型 ${modelId} 缩放配置失败:`, error);
            return false;
        }
    }

    // 应用缩放到模型配置
    static applyScaleToModel(modelConfig, scaleConfig) {
        if (!scaleConfig) return modelConfig;

        const { scale, width, height } = scaleConfig;
        
        // 创建或更新 layout 配置
        modelConfig.layout = {
            ...modelConfig.layout,
        };

        // 应用缩放
        if (scale && scale !== 1.0) {
            modelConfig.layout.scale = scale;
        }

        // 应用尺寸限制
        if (width) {
            modelConfig.layout.width = width;
        }
        if (height) {
            modelConfig.layout.height = height;
        }

        console.log(`[DEBUG] 应用缩放配置: scale=${scale}, width=${width}, height=${height}`);
        return modelConfig;
    }

    // 获取所有缩放配置
    static async getAllScaleConfigs() {
        try {
            const configs = await this.loadScaleConfig();
            console.log(`[DEBUG] 获取所有缩放配置，共 ${Object.keys(configs).length} 个`);
            return configs;
        } catch (error) {
            console.error('[DEBUG] 获取所有缩放配置失败:', error);
            return {};
        }
    }

    // 清除缓存
    static clearCache() {
        this.scaleCache.clear();
        console.log('[DEBUG] 缩放配置缓存已清除');
    }

    // 预设缩放配置
    static getPresetScales() {
        return {
            'tiny': { scale: 0.3, name: '迷你' },
            'small': { scale: 0.5, name: '小' },
            'normal': { scale: 1.0, name: '正常' },
            'large': { scale: 1.5, name: '大' },
            'huge': { scale: 2.0, name: '巨大' }
        };
    }
}

module.exports = ScaleService;