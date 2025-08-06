const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const debugConfig = require('../config/debug');
const smartMode = require('../config/smartMode');
const ResourcePathResolver = require('../middleware/resourcePathResolver');
const debugLog = debugConfig.createDebugLogger('modelService');

// 模型列表缓存
let modelList = null;
let lastScanTime = 0;

class ModelService {
    // 加载模型列表
    static async loadModelList() {
        try {
            const modelListPath = path.join(__dirname, '../../config/model_list.json');
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

    // 处理模型配置路径（支持智能模式）
    static async processModelPaths(modelConfig, basePath, modelName = null) {
        debugLog(`处理模型路径: basePath=${basePath}, modelName=${modelName}`);
        
        // 智能模式：基于结构分析应用处理方案
        let processedConfig = modelConfig;
        if (modelName && smartMode.smartModeConfig.enabled) {
            // 从模型名称中提取文件夹名称和路径
            const folderName = modelName.split('/')[0];
            const modelDir = path.join(__dirname, '../../models', folderName);
            
            // 分析文件夹结构
            const structureAnalysis = await smartMode.analyzeStructure(modelDir);
            
            if (structureAnalysis) {
                debugLog(`应用智能模式处理: ${folderName} (类型: ${structureAnalysis.type})`);
                const handler = smartMode.getHandler(structureAnalysis.handler);
                
                if (handler && handler.processModelConfig) {
                    processedConfig = handler.processModelConfig(
                        modelConfig, 
                        folderName, 
                        structureAnalysis.metadata
                    );
                }
            } else {
                // 回退到兼容模式
                const handler = smartMode.getHandler(smartMode.getHandlerForFolder(folderName));
                if (handler && handler.processModelConfig) {
                    debugLog(`使用兼容模式处理: ${folderName}`);
                    processedConfig = handler.processModelConfig(modelConfig, folderName);
                }
            }
        }
        
        // 清理空的motion键
        if (processedConfig.motions) {
            const cleanedMotions = {};
            Object.keys(processedConfig.motions).forEach(motionType => {
                if (motionType.trim() !== '' && processedConfig.motions[motionType]) {
                    cleanedMotions[motionType] = processedConfig.motions[motionType];
                } else if (motionType.trim() === '' && processedConfig.motions[motionType]) {
                    // 将空键的动作移动到 'tap' 或 'touch' 类型
                    cleanedMotions['tap'] = processedConfig.motions[motionType];
                }
            });
            processedConfig.motions = cleanedMotions;
        }

        // ResourcePathResolver现在是中间件函数，不再提供resolveModelPaths方法
        // 复杂路径解析现在由中间件在请求时处理
        debugLog(`跳过ResourcePathResolver调用，由中间件处理复杂路径`);

        // 只有在ResourcePathResolver没有处理过的情况下才进行标准路径处理
        const hasComplexPaths = this.hasComplexRelativePaths(processedConfig);
        
        if (!hasComplexPaths) {
            // 标准化basePath，移除前导的 ./ 并确保不重复 model/ 前缀
            let normalizedBasePath = basePath;
            if (normalizedBasePath.startsWith('./')) {
                normalizedBasePath = normalizedBasePath.substring(2);
            }
            
            debugLog(`标准路径处理: basePath=${basePath} -> normalizedBasePath=${normalizedBasePath}`);
            
            // 处理纹理路径 - 保持原始相对路径，让前端live2d-widget自动添加模型路径前缀
            if (processedConfig.textures) {
                processedConfig.textures = processedConfig.textures.map(texture => {
                    if (texture.startsWith('model/') || texture.startsWith('/model/')) {
                        return texture; // 已经是绝对路径
                    }
                    debugLog(`纹理路径处理: ${texture} -> ${texture} (保持原始路径)`);
                    return texture; // 保持原始路径，前端会自动添加 /model/Potion-Maker/Tia/ 前缀
                });
            }

            // 处理模型文件路径 - 保持原始相对路径
            if (processedConfig.model) {
                if (!processedConfig.model.startsWith('model/') && !processedConfig.model.startsWith('/model/')) {
                    debugLog(`模型文件路径处理: ${processedConfig.model} -> ${processedConfig.model} (保持原始路径)`);
                    // 保持原始路径，前端会自动添加前缀
                }
            }

            // 处理其他资源路径 - 保持原始相对路径
            ['pose', 'physics'].forEach(key => {
                if (processedConfig[key]) {
                    if (!processedConfig[key].startsWith('model/') && !processedConfig[key].startsWith('/model/')) {
                        debugLog(`${key}路径处理: ${processedConfig[key]} -> ${processedConfig[key]} (保持原始路径)`);
                        // 保持原始路径，前端会自动添加前缀
                    }
                }
            });

            // 处理动作文件路径 - 保持原始相对路径
            if (processedConfig.motions) {
                Object.keys(processedConfig.motions).forEach(motionType => {
                    if (processedConfig.motions[motionType] && Array.isArray(processedConfig.motions[motionType])) {
                        processedConfig.motions[motionType].forEach(motion => {
                            if (motion.file && !motion.file.startsWith('model/') && !motion.file.startsWith('/model/')) {
                                debugLog(`动作文件路径处理: ${motion.file} -> ${motion.file} (保持原始路径)`);
                                // 保持原始路径，前端会自动添加前缀
                            }
                            if (motion.sound && !motion.sound.startsWith('model/') && !motion.sound.startsWith('/model/')) {
                                debugLog(`动作声音路径处理: ${motion.sound} -> ${motion.sound} (保持原始路径)`);
                                // 保持原始路径，前端会自动添加前缀
                            }
                        });
                    }
                });
            }

            // 处理表情文件路径 - 保持原始相对路径
            if (processedConfig.expressions && Array.isArray(processedConfig.expressions)) {
                processedConfig.expressions.forEach(expression => {
                    if (expression.file && !expression.file.startsWith('model/') && !expression.file.startsWith('/model/')) {
                        debugLog(`表情文件路径处理: ${expression.file} -> ${expression.file} (保持原始路径)`);
                        // 保持原始路径，前端会自动添加前缀
                    }
                });
            }
        } else {
            debugLog(`检测到复杂路径，跳过标准路径处理`);
        }

        debugLog(`路径处理完成`);
        return processedConfig;
    }

    // 检测是否包含复杂相对路径
    static hasComplexRelativePaths(config) {
        const checkPath = (path) => {
            return path && (path.includes('../') || path.includes('../../'));
        };

        // 检查表情路径
        if (config.expressions && Array.isArray(config.expressions)) {
            for (const expression of config.expressions) {
                if (checkPath(expression.file)) {
                    return true;
                }
            }
        }

        // 检查动作路径
        if (config.motions) {
            for (const motionType in config.motions) {
                const motions = config.motions[motionType];
                if (Array.isArray(motions)) {
                    for (const motion of motions) {
                        if (checkPath(motion.file) || checkPath(motion.sound)) {
                            return true;
                        }
                    }
                }
            }
        }

        // 检查其他路径
        if (checkPath(config.model) || checkPath(config.pose) || checkPath(config.physics)) {
            return true;
        }

        return false;
    }

    // 清除缓存
    static clearCache() {
        modelList = null;
        lastScanTime = 0;
        console.log(`[DEBUG] 模型列表缓存已清除`);
    }
}

module.exports = ModelService;