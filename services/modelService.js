const path = require('path');
const fs = require('fs-extra');
const config = require('../config/server');

// 模型列表缓存
let modelList = null;
let lastScanTime = 0;

class ModelService {
    // 加载模型列表
    static async loadModelList() {
        try {
            const modelListPath = path.join(__dirname, '../model_list.json');
            if (await fs.pathExists(modelListPath)) {
                const data = await fs.readJson(modelListPath);
                console.log(`[DEBUG] 加载模型列表成功，包含 ${data.models ? data.models.length : 0} 个模型`);
                return data;
            }
            console.log(`[DEBUG] 模型列表文件不存在: ${modelListPath}`);
            return { models: [], messages: [] };
        } catch (error) {
            console.error('[DEBUG] 加载模型列表失败:', error);
            return { models: [], messages: [] };
        }
    }

    // 获取缓存的模型列表
    static async getCachedModelList() {
        const now = Date.now();
        if (!modelList || (now - lastScanTime) > config.cache.duration) {
            console.log(`[DEBUG] 重新加载模型列表缓存`);
            modelList = await this.loadModelList();
            lastScanTime = now;
        }
        return modelList;
    }

    // 扁平化模型数组
    static flattenModels(models) {
        const result = [];
        for (const model of models) {
            if (Array.isArray(model)) {
                result.push(...model);
            } else {
                result.push(model);
            }
        }
        console.log(`[DEBUG] 扁平化模型数组: ${models.length} -> ${result.length}`);
        return result;
    }

    // 根据ID获取模型名称
    static getModelNameById(models, id) {
        console.log(`[DEBUG] 根据ID获取模型名称: id=${id}, 总模型数=${models.length}`);
        let currentIndex = 0;
        for (const model of models) {
            if (Array.isArray(model)) {
                if (id >= currentIndex && id < currentIndex + model.length) {
                    const modelName = model[id - currentIndex];
                    console.log(`[DEBUG] 找到模型: ${modelName} (数组索引: ${id - currentIndex})`);
                    return modelName;
                }
                currentIndex += model.length;
            } else {
                if (id === currentIndex) {
                    console.log(`[DEBUG] 找到模型: ${model} (索引: ${currentIndex})`);
                    return model;
                }
                currentIndex++;
            }
        }
        console.log(`[DEBUG] 未找到ID为 ${id} 的模型`);
        return null;
    }

    // 处理模型配置路径
    static processModelPaths(modelConfig, basePath) {
        // 清理空的motion键
        if (modelConfig.motions) {
            const cleanedMotions = {};
            Object.keys(modelConfig.motions).forEach(motionType => {
                if (motionType.trim() !== '' && modelConfig.motions[motionType]) {
                    cleanedMotions[motionType] = modelConfig.motions[motionType];
                } else if (motionType.trim() === '' && modelConfig.motions[motionType]) {
                    // 将空键的动作移动到 'tap' 或 'touch' 类型
                    cleanedMotions['tap'] = modelConfig.motions[motionType];
                }
            });
            modelConfig.motions = cleanedMotions;
        }

        // 处理纹理路径
        if (modelConfig.textures) {
            modelConfig.textures = modelConfig.textures.map(texture => 
                `${basePath}/${texture}`
            );
        }

        // 处理模型文件路径
        if (modelConfig.model) {
            modelConfig.model = `${basePath}/${modelConfig.model}`;
        }

        // 处理其他资源路径
        ['pose', 'physics'].forEach(key => {
            if (modelConfig[key]) {
                modelConfig[key] = `${basePath}/${modelConfig[key]}`;
            }
        });

        // 处理动作文件路径
        if (modelConfig.motions) {
            Object.keys(modelConfig.motions).forEach(motionType => {
                modelConfig.motions[motionType].forEach(motion => {
                    if (motion.file) {
                        motion.file = `${basePath}/${motion.file}`;
                    }
                    if (motion.sound) {
                        motion.sound = `${basePath}/${motion.sound}`;
                    }
                });
            });
        }

        // 处理表情文件路径
        if (modelConfig.expressions) {
            modelConfig.expressions.forEach(expression => {
                if (expression.file) {
                    expression.file = `${basePath}/${expression.file}`;
                }
            });
        }

        return modelConfig;
    }

    // 清除缓存
    static clearCache() {
        modelList = null;
        lastScanTime = 0;
        console.log(`[DEBUG] 模型列表缓存已清除`);
    }
}

module.exports = ModelService;