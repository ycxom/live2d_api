/**
 * 智能模式配置 - 基于文件结构分析的智能检测系统
 * 不依赖文件夹名称，而是分析文件夹内部结构来确定处理方案
 */

const fs = require('fs-extra');
const path = require('path');
const debugConfig = require('./debug');
const debugLog = debugConfig.createDebugLogger('smartMode');

/**
 * 智能模式配置
 */
const smartModeConfig = {
    // 是否启用智能模式
    enabled: process.env.SMART_MODE_ENABLED !== 'false', // 默认启用
    
    // 结构检测器配置
    structureDetectors: [
        {
            name: 'live2d-model-assets',
            handler: 'live2d-model-assets-handler',
            priority: 1 // 优先级，数字越小优先级越高
        },
        {
            name: 'github-assets-collection',
            handler: 'github-assets-handler',
            priority: 2
        },
        {
            name: 'nested-model-collection',
            handler: 'nested-collection-handler',
            priority: 3
        },
        {
            name: 'standard-live2d',
            handler: 'standard-handler',
            priority: 4
        }
    ]
};

/**
 * 基于文件结构分析检测文件夹类型
 * @param {string} folderPath - 文件夹完整路径
 * @returns {Promise<Object|null>} 检测结果，包含类型和处理器信息
 */
async function analyzeStructure(folderPath) {
    if (!smartModeConfig.enabled) {
        return null;
    }
    
    try {
        debugLog(`开始分析文件夹结构: ${folderPath}`);
        
        // 按优先级顺序检测
        const detectors = smartModeConfig.structureDetectors.sort((a, b) => a.priority - b.priority);
        
        for (const detector of detectors) {
            const result = await detectStructureType(folderPath, detector.name);
            if (result.detected) {
                debugLog(`检测到结构类型: ${detector.name} (置信度: ${result.confidence})`);
                return {
                    type: detector.name,
                    handler: detector.handler,
                    confidence: result.confidence,
                    metadata: result.metadata
                };
            }
        }
        
        debugLog(`未检测到特殊结构类型，使用标准处理`);
        return {
            type: 'standard-live2d',
            handler: 'standard-handler',
            confidence: 0.5,
            metadata: {}
        };
        
    } catch (error) {
        debugLog(`结构分析出错: ${error.message}`);
        return null;
    }
}

/**
 * 检测特定结构类型
 * @param {string} folderPath - 文件夹路径
 * @param {string} structureType - 结构类型
 * @returns {Promise<Object>} 检测结果
 */
async function detectStructureType(folderPath, structureType) {
    switch (structureType) {
        case 'live2d-model-assets':
            return await detectLive2dModelAssets(folderPath);
        case 'github-assets-collection':
            return await detectGithubAssetsCollection(folderPath);
        case 'nested-model-collection':
            return await detectNestedModelCollection(folderPath);
        case 'standard-live2d':
            return await detectStandardLive2d(folderPath);
        default:
            return { detected: false, confidence: 0, metadata: {} };
    }
}

/**
 * 检测 live2d-model-assets 类型结构
 * 特征：包含 assets/model.index 文件
 */
async function detectLive2dModelAssets(folderPath) {
    try {
        const indexPath = path.join(folderPath, 'assets', 'model.index');
        const assetsPath = path.join(folderPath, 'assets');
        
        if (await fs.pathExists(indexPath)) {
            // 读取index文件内容进行进一步验证
            const indexContent = await fs.readFile(indexPath, 'utf-8');
            const lines = indexContent.split('\n').filter(line => line.trim());
            const httpLines = lines.filter(line => line.startsWith('http'));
            
            return {
                detected: true,
                confidence: 0.95,
                metadata: {
                    indexFile: indexPath,
                    modelCount: httpLines.length,
                    hasAssetsDir: await fs.pathExists(assetsPath)
                }
            };
        }
        
        return { detected: false, confidence: 0, metadata: {} };
    } catch (error) {
        return { detected: false, confidence: 0, metadata: {} };
    }
}

/**
 * 检测 GitHub 资源集合类型结构
 * 特征：包含多个子目录，每个子目录都是独立的模型
 */
async function detectGithubAssetsCollection(folderPath) {
    try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        const directories = entries.filter(entry => entry.isDirectory());
        
        if (directories.length < 2) {
            return { detected: false, confidence: 0, metadata: {} };
        }
        
        let modelDirCount = 0;
        const modelDirs = [];
        
        // 检查每个子目录是否包含模型文件
        for (const dir of directories) {
            const subPath = path.join(folderPath, dir.name);
            const hasIndex = await fs.pathExists(path.join(subPath, 'index.json'));
            const hasModel = await fs.pathExists(path.join(subPath, 'model.json'));
            
            if (hasIndex || hasModel) {
                modelDirCount++;
                modelDirs.push(dir.name);
            }
        }
        
        // 如果超过一半的子目录包含模型，认为是资源集合
        const confidence = modelDirCount / directories.length;
        if (confidence >= 0.5) {
            return {
                detected: true,
                confidence: Math.min(confidence, 0.9),
                metadata: {
                    totalDirs: directories.length,
                    modelDirs: modelDirs,
                    modelDirCount: modelDirCount
                }
            };
        }
        
        return { detected: false, confidence: 0, metadata: {} };
    } catch (error) {
        return { detected: false, confidence: 0, metadata: {} };
    }
}

/**
 * 检测嵌套模型集合类型结构
 * 特征：包含多层嵌套的模型目录
 */
async function detectNestedModelCollection(folderPath) {
    try {
        const result = await scanNestedStructure(folderPath, 0, 3); // 最大扫描3层
        
        if (result.modelCount >= 2 && result.maxDepth >= 2) {
            return {
                detected: true,
                confidence: 0.8,
                metadata: {
                    modelCount: result.modelCount,
                    maxDepth: result.maxDepth,
                    structure: result.structure
                }
            };
        }
        
        return { detected: false, confidence: 0, metadata: {} };
    } catch (error) {
        return { detected: false, confidence: 0, metadata: {} };
    }
}

/**
 * 检测标准 Live2D 模型结构
 * 特征：包含 index.json 或 model.json 文件
 */
async function detectStandardLive2d(folderPath) {
    try {
        const hasIndex = await fs.pathExists(path.join(folderPath, 'index.json'));
        const hasModel = await fs.pathExists(path.join(folderPath, 'model.json'));
        
        if (hasIndex || hasModel) {
            return {
                detected: true,
                confidence: 0.7,
                metadata: {
                    hasIndex: hasIndex,
                    hasModel: hasModel,
                    configFile: hasIndex ? 'index.json' : 'model.json'
                }
            };
        }
        
        return { detected: false, confidence: 0, metadata: {} };
    } catch (error) {
        return { detected: false, confidence: 0, metadata: {} };
    }
}

/**
 * 递归扫描嵌套结构
 */
async function scanNestedStructure(dirPath, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) {
        return { modelCount: 0, maxDepth: currentDepth, structure: {} };
    }
    
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        let modelCount = 0;
        let maxFoundDepth = currentDepth;
        const structure = {};
        
        // 检查当前目录是否包含模型
        const hasIndex = await fs.pathExists(path.join(dirPath, 'index.json'));
        const hasModel = await fs.pathExists(path.join(dirPath, 'model.json'));
        
        if (hasIndex || hasModel) {
            modelCount++;
        }
        
        // 递归检查子目录
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subPath = path.join(dirPath, entry.name);
                const subResult = await scanNestedStructure(subPath, currentDepth + 1, maxDepth);
                
                modelCount += subResult.modelCount;
                maxFoundDepth = Math.max(maxFoundDepth, subResult.maxDepth);
                structure[entry.name] = subResult.structure;
            }
        }
        
        return { modelCount, maxDepth: maxFoundDepth, structure };
    } catch (error) {
        return { modelCount: 0, maxDepth: currentDepth, structure: {} };
    }
}

/**
 * 获取特殊文件夹的处理方案（兼容旧接口）
 * @param {string} folderName - 文件夹名称
 * @returns {string|null} 处理方案标识
 */
function getHandlerForFolder(folderName) {
    // 这个函数现在主要用于向后兼容
    // 实际的检测应该使用 analyzeStructure 函数
    debugLog(`使用兼容模式检测文件夹: ${folderName}`);
    
    // 基于名称的简单检测（向后兼容）
    if (/live2d-model-assets/i.test(folderName)) {
        return 'live2d-model-assets-handler';
    }
    if (/-(master|main|dev|develop)$/i.test(folderName)) {
        return 'github-assets-handler';
    }
    
    return null;
}

/**
 * live2d-model-assets 处理器
 * 用于处理包含 assets/model.index 文件的资源包
 */
const live2dModelAssetsHandler = {
    needsSpecialPathHandling: () => true,
    getSearchDepth: () => 3,
    
    processModelPath: (modelPath, folderName, metadata = {}) => {
        debugLog(`使用 live2d-model-assets 处理器处理路径: ${modelPath}`);
        
        // 基于结构分析的智能路径处理
        if (metadata.hasAssetsDir) {
            // 如果路径不是以文件夹名开头，添加文件夹前缀
            if (!modelPath.startsWith(folderName)) {
                const processedPath = `${folderName}/${modelPath}`;
                debugLog(`添加文件夹前缀: ${modelPath} -> ${processedPath}`);
                return processedPath;
            }
        }
        
        return modelPath;
    },
    
    processModelConfig: (modelConfig, folderName, metadata = {}) => {
        debugLog(`使用 live2d-model-assets 处理器处理配置`);
        
        const processedConfig = JSON.parse(JSON.stringify(modelConfig));
        
        // 处理纹理路径
        if (processedConfig.textures && Array.isArray(processedConfig.textures)) {
            processedConfig.textures = processedConfig.textures.map(texture => {
                if (typeof texture === 'string') {
                    return live2dModelAssetsHandler.processModelPath(texture, folderName, metadata);
                }
                return texture;
            });
        }
        
        // 处理动作路径
        if (processedConfig.motions) {
            Object.keys(processedConfig.motions).forEach(motionKey => {
                if (Array.isArray(processedConfig.motions[motionKey])) {
                    processedConfig.motions[motionKey] = processedConfig.motions[motionKey].map(motion => {
                        if (motion.file) {
                            motion.file = live2dModelAssetsHandler.processModelPath(motion.file, folderName, metadata);
                        }
                        if (motion.sound) {
                            motion.sound = live2dModelAssetsHandler.processModelPath(motion.sound, folderName, metadata);
                        }
                        return motion;
                    });
                }
            });
        }
        
        return processedConfig;
    }
};

/**
 * GitHub 资源集合处理器
 * 用于处理包含多个独立模型子目录的资源包
 */
const githubAssetsHandler = {
    needsSpecialPathHandling: () => true,
    getSearchDepth: () => 2,
    
    processModelPath: (modelPath, folderName, metadata = {}) => {
        debugLog(`使用 GitHub 资源集合处理器处理路径: ${modelPath}`);
        
        // 移除可能的版本后缀
        const cleanFolderName = folderName.replace(/-(master|main|dev|develop)$/i, '');
        
        if (modelPath.includes(folderName) && folderName !== cleanFolderName) {
            const processedPath = modelPath.replace(folderName, cleanFolderName);
            debugLog(`清理版本后缀: ${modelPath} -> ${processedPath}`);
            return processedPath;
        }
        
        return modelPath;
    },
    
    processModelConfig: (modelConfig, folderName, metadata = {}) => {
        return live2dModelAssetsHandler.processModelConfig(modelConfig, folderName, metadata);
    }
};

/**
 * 嵌套模型集合处理器
 * 用于处理多层嵌套的模型目录结构
 */
const nestedCollectionHandler = {
    needsSpecialPathHandling: () => true,
    getSearchDepth: (metadata = {}) => metadata.maxDepth || 3,
    
    processModelPath: (modelPath, folderName, metadata = {}) => {
        debugLog(`使用嵌套集合处理器处理路径: ${modelPath}`);
        
        // 对于嵌套结构，保持原有路径结构
        return modelPath;
    },
    
    processModelConfig: (modelConfig, folderName, metadata = {}) => {
        debugLog(`使用嵌套集合处理器处理配置`);
        
        // 对于嵌套结构，使用标准处理方式
        return standardHandler.processModelConfig(modelConfig, folderName, metadata);
    }
};

/**
 * 标准 Live2D 模型处理器
 * 用于处理标准的 Live2D 模型结构
 */
const standardHandler = {
    needsSpecialPathHandling: () => false,
    getSearchDepth: () => 1,
    
    processModelPath: (modelPath, folderName, metadata = {}) => {
        debugLog(`使用标准处理器处理路径: ${modelPath}`);
        return modelPath;
    },
    
    processModelConfig: (modelConfig, folderName, metadata = {}) => {
        debugLog(`使用标准处理器处理配置`);
        
        const processedConfig = JSON.parse(JSON.stringify(modelConfig));
        
        // 清理空的motion键
        if (processedConfig.motions) {
            const cleanedMotions = {};
            Object.keys(processedConfig.motions).forEach(motionType => {
                if (motionType.trim() !== '' && processedConfig.motions[motionType]) {
                    cleanedMotions[motionType] = processedConfig.motions[motionType];
                } else if (motionType.trim() === '' && processedConfig.motions[motionType]) {
                    cleanedMotions['tap'] = processedConfig.motions[motionType];
                }
            });
            processedConfig.motions = cleanedMotions;
        }
        
        return processedConfig;
    }
};

/**
 * 获取处理器实例
 * @param {string} handlerName - 处理器名称
 * @returns {Object|null} 处理器实例
 */
function getHandler(handlerName) {
    switch (handlerName) {
        case 'live2d-model-assets-handler':
            return live2dModelAssetsHandler;
        case 'github-assets-handler':
            return githubAssetsHandler;
        case 'nested-collection-handler':
            return nestedCollectionHandler;
        case 'standard-handler':
            return standardHandler;
        default:
            debugLog(`未知的处理器: ${handlerName}`);
            return standardHandler; // 默认使用标准处理器
    }
}

module.exports = {
    smartModeConfig,
    analyzeStructure,
    getHandlerForFolder,
    getHandler,
    live2dModelAssetsHandler,
    githubAssetsHandler,
    nestedCollectionHandler,
    standardHandler
};
