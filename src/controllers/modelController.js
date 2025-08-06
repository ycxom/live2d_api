const path = require('path');
const fs = require('fs-extra');
const ModelService = require('../services/modelService');
const PathUtils = require('../utils/pathUtils');

class ModelController {
    // 获取模型信息
    static async getModel(req, res) {
        try {
            const id = req.query.id;
            console.log(`[DEBUG] /get - 请求ID: ${id}`);
            
            if (!id) {
                return res.status(400).json({ error: '缺少id参数' });
            }

            const modelData = await ModelService.getCachedModelList();
            const idParts = id.split('-');
            const modelId = parseInt(idParts[0]);
            const textureId = idParts[1] ? parseInt(idParts[1]) : 0;
            
            console.log(`[DEBUG] /get - 解析ID: modelId=${modelId}, textureId=${textureId}`);

            const modelName = ModelService.getModelNameById(modelData.models, modelId);
            console.log(`[DEBUG] /get - 获取到模型名称: ${modelName}`);
            
            if (!modelName) {
                return res.status(404).json({ error: '模型不存在' });
            }

            // 检查是否为网络模型
            if (PathUtils.isNetworkUrl(modelName)) {
                console.log(`[DEBUG] /get - 检测到网络模型: ${modelName}`);
                return res.json({
                    model: modelName,
                    textures: [],
                    message: '网络模型'
                });
            }

            // 检查是否为live2d-model-assets中的本地文件
            if (PathUtils.isLive2DModelPath(modelName)) {
                return await ModelController.handleLive2DModel(modelName, res);
            }

            // 标准本地模型处理
            return await ModelController.handleStandardModel(modelName, res);
            
        } catch (error) {
            console.error('[DEBUG] /get - 获取模型失败:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }

    // 处理Live2D模型
    static async handleLive2DModel(modelName, res) {
        console.log(`[DEBUG] /get - 检测到live2d-model-assets模型: ${modelName}`);
        // 直接拼接models目录，因为modelName现在不包含前导斜杠
        const modelPath = path.join(__dirname, '../../models', modelName);
        console.log(`[DEBUG] /get - 模型文件路径: ${modelPath}`);
        
        if (await fs.pathExists(modelPath)) {
            try {
                const modelConfig = await fs.readJson(modelPath);
                console.log(`[DEBUG] /get - 成功读取模型配置，包含字段:`, Object.keys(modelConfig));
                
                // 处理相对路径，基于模型文件所在目录
                const modelDir = path.dirname(modelPath);
                const relativeModelDir = path.relative(path.join(__dirname, '..'), modelDir).replace(/\\/g, '/');
                console.log(`[DEBUG] /get - 模型目录: ${modelDir}`);
                console.log(`[DEBUG] /get - 相对目录: ${relativeModelDir}`);
                
                // 使用 ModelService 的路径处理方法，传入正确的基础路径和模型名称以支持智能模式
                const basePath = `./${relativeModelDir}`;
                const processedConfig = await ModelService.processModelPaths(modelConfig, basePath, modelName);
                
                console.log(`[DEBUG] /get - 返回处理后的模型配置`);
                return res.json(processedConfig);
                
            } catch (error) {
                console.error('[DEBUG] /get - 读取本地模型配置失败:', error);
                return res.status(500).json({ error: '模型配置文件格式错误' });
            }
        } else {
            console.log(`[DEBUG] /get - 模型文件不存在: ${modelPath}`);
            return res.status(404).json({ error: '模型文件不存在' });
        }
    }

    // 处理标准模型 - 改进版支持嵌套路径
    static async handleStandardModel(modelName, res) {
        console.log(`[DEBUG] /get - 处理标准本地模型: ${modelName}`);
        
        let modelPath, indexPath, basePath;
        
        if (modelName.includes('/')) {
            // 处理嵌套路径，如 "KantaiCollection/murakumo"
            // 处理嵌套路径，如 "KantaiCollection/murakumo"
            const parts = modelName.split('/');
            const folderName = parts[0];
            const subPath = parts.slice(1).join('/');
            
            // 优先尝试子目录的配置文件
            modelPath = path.join(__dirname, '../../models', folderName, subPath);
            indexPath = path.join(modelPath, 'index.json');
            basePath = `./models/${folderName}/${subPath}`;
            
            console.log(`[DEBUG] /get - 尝试子目录配置: ${indexPath}`);
            
            // 如果子目录配置文件不存在，尝试 model.json
            if (!(await fs.pathExists(indexPath))) {
                const altIndexPath = path.join(modelPath, 'model.json');
                console.log(`[DEBUG] /get - 尝试子目录 model.json: ${altIndexPath}`);
                
                if (await fs.pathExists(altIndexPath)) {
                    indexPath = altIndexPath;
                } else {
                    // 最后尝试父目录的配置文件
                    // 最后尝试父目录的配置文件
                    const parentPath = path.join(__dirname, '../../models', folderName);
                    const parentIndexPath = path.join(parentPath, 'index.json');
                    console.log(`[DEBUG] /get - 尝试父目录配置: ${parentIndexPath}`);
                    
                    if (await fs.pathExists(parentIndexPath)) {
                        modelPath = parentPath;
                        indexPath = parentIndexPath;
                        basePath = `./models/${folderName}`;
                        console.log(`[DEBUG] /get - 使用父目录配置文件`);
                    } else {
                        // 尝试父目录的 model.json
                        const parentModelPath = path.join(parentPath, 'model.json');
                        console.log(`[DEBUG] /get - 尝试父目录 model.json: ${parentModelPath}`);
                        
                        if (await fs.pathExists(parentModelPath)) {
                            modelPath = parentPath;
                            indexPath = parentModelPath;
                            basePath = `./models/${folderName}`;
                            console.log(`[DEBUG] /get - 使用父目录 model.json 文件`);
                        }
                    }
                }
            }
        } else {
            // 单层路径处理
            modelPath = path.join(__dirname, '../../models', modelName);
            indexPath = path.join(modelPath, 'index.json');
            basePath = `./models/${modelName}`;
            
            // 如果 index.json 不存在，尝试 model.json
            if (!(await fs.pathExists(indexPath))) {
                const altIndexPath = path.join(modelPath, 'model.json');
                if (await fs.pathExists(altIndexPath)) {
                    indexPath = altIndexPath;
                } else {
                    // 如果直接配置文件都不存在，尝试搜索子目录
                    console.log(`[DEBUG] /get - 直接配置文件不存在，搜索子目录: ${modelPath}`);
                    
                    try {
                        const entries = await fs.readdir(modelPath, { withFileTypes: true });
                        const subDirs = entries.filter(entry => entry.isDirectory());
                        
                        for (const subDir of subDirs) {
                            const subDirPath = path.join(modelPath, subDir.name);
                            const subIndexPath = path.join(subDirPath, 'index.json');
                            const subModelPath = path.join(subDirPath, 'model.json');
                            
                            console.log(`[DEBUG] /get - 检查子目录: ${subDir.name}`);
                            
                            if (await fs.pathExists(subIndexPath)) {
                                console.log(`[DEBUG] /get - 找到子目录配置: ${subIndexPath}`);
                                modelPath = subDirPath;
                                indexPath = subIndexPath;
                            basePath = `./models/${modelName}/${subDir.name}`;
                                break;
                            } else if (await fs.pathExists(subModelPath)) {
                                console.log(`[DEBUG] /get - 找到子目录model.json: ${subModelPath}`);
                                modelPath = subDirPath;
                                indexPath = subModelPath;
                                basePath = `./models/${modelName}/${subDir.name}`;
                                break;
                            }
                        }
                    } catch (error) {
                        console.log(`[DEBUG] /get - 搜索子目录失败: ${error.message}`);
                    }
                }
            }
        }
        
        console.log(`[DEBUG] /get - 最终使用配置文件路径: ${indexPath}`);

        if (!(await fs.pathExists(indexPath))) {
            console.log(`[DEBUG] /get - 所有配置文件都不存在`);
            return res.status(404).json({ error: '模型配置文件不存在' });
        }

        const modelConfig = await fs.readJson(indexPath);
        console.log(`[DEBUG] /get - 成功读取标准模型配置，包含字段:`, Object.keys(modelConfig));
        
        const processedConfig = await ModelService.processModelPaths(modelConfig, basePath, modelName);
        
        console.log(`[DEBUG] /get - 返回标准模型配置`);
        res.json(processedConfig);
    }

    // 随机获取模型
    static async getRandomModel(req, res) {
        try {
            const currentId = parseInt(req.query.id) || 0;
            console.log(`[DEBUG] /rand - 当前ID: ${currentId}`);
            
            const modelData = await ModelService.getCachedModelList();
            const flatModels = ModelService.flattenModels(modelData.models);
            
            if (flatModels.length === 0) {
                console.log(`[DEBUG] /rand - 没有可用的模型`);
                return res.status(404).json({ error: '没有可用的模型' });
            }

            let randomId;
            do {
                randomId = Math.floor(Math.random() * flatModels.length) + 1;
            } while (randomId === currentId && flatModels.length > 1);

            console.log(`[DEBUG] /rand - 生成随机ID: ${randomId}`);
            const modelName = ModelService.getModelNameById(modelData.models, randomId - 1);
            const messageIndex = Math.min(randomId - 1, modelData.messages.length - 1);

            res.json({
                model: {
                    id: randomId,
                    name: modelName,
                    message: modelData.messages[messageIndex] || '随机模型'
                }
            });
        } catch (error) {
            console.error('[DEBUG] /rand - 随机获取模型失败:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }

    // 获取模型列表 - 兼容 live2d-widget 和原有逻辑
    static async getModelList(req, res) {
        try {
            console.log(`[DEBUG] /list - 获取模型列表`);
            const modelData = await ModelService.getCachedModelList();
            
            // 检查请求来源，判断是否为 live2d-widget
            const userAgent = req.get('User-Agent') || '';
            const isWidgetRequest = req.path.includes('model_list.json') || 
                                  req.query.widget === 'true' ||
                                  userAgent.includes('live2d-widget');
            
            if (isWidgetRequest) {
                // live2d-widget 格式：保持原有嵌套结构但适配格式
                const widgetFormat = {
                    messages: modelData.messages || [],
                    models: modelData.models || []
                };
                
                console.log(`[DEBUG] /list - 返回 live2d-widget 格式，包含 ${widgetFormat.models.length} 个模型组`);
                res.json(widgetFormat);
            } else {
                // 原有格式：完整返回
                console.log(`[DEBUG] /list - 返回原有格式，包含 ${modelData.models ? modelData.models.length : 0} 个模型`);
                res.json(modelData);
            }
        } catch (error) {
            console.error('[DEBUG] /list - 获取模型列表失败:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }

    // 扫描模型目录
    static async scanModels(req, res) {
        try {
            console.log(`[DEBUG] /scan - 开始扫描模型目录`);
            const { scanModels } = require('../../scripts/maintenance/scanModels');
            await scanModels();
            
            // 清除缓存
            ModelService.clearCache();
            console.log(`[DEBUG] /scan - 扫描完成，清除缓存`);
            
            res.json({ message: '模型目录扫描完成' });
        } catch (error) {
            console.error('[DEBUG] /scan - 扫描模型目录失败:', error);
            res.status(500).json({ error: '扫描失败' });
        }
    }

    // 获取带缩放的模型
    static async getModelWithScale(req, res) {
        try {
            const { id, scale = 1.0, width, height } = req.query;
            console.log(`[DEBUG] /scale - 请求参数: id=${id}, scale=${scale}, width=${width}, height=${height}`);
            
            if (!id) {
                return res.status(400).json({ error: '缺少模型ID参数' });
            }

            // 首先获取原始模型配置
            const modelData = await ModelService.getCachedModelList();
            const idParts = id.split('-');
            const modelId = parseInt(idParts[0]);
            const textureId = idParts[1] ? parseInt(idParts[1]) : 0;
            
            const modelName = ModelService.getModelNameById(modelData.models, modelId);
            if (!modelName) {
                return res.status(404).json({ error: '模型不存在' });
            }

            let modelConfig;

            // 根据模型类型获取配置
            if (PathUtils.isNetworkUrl(modelName)) {
                modelConfig = {
                    model: modelName,
                    textures: [],
                    message: '网络模型'
                };
            } else if (PathUtils.isLive2DModelPath(modelName)) {
                const modelPath = path.join(__dirname, '..', modelName);
                if (await fs.pathExists(modelPath)) {
                    modelConfig = await fs.readJson(modelPath);
                    const modelDir = path.dirname(modelPath);
                    const relativeModelDir = path.relative(path.join(__dirname, '..'), modelDir).replace(/\\/g, '/');
                    modelConfig = await ModelService.processModelPaths(modelConfig, `./${relativeModelDir}`, modelName);
                } else {
                    return res.status(404).json({ error: '模型文件不存在' });
                }
            } else {
                const indexPath = path.join(__dirname, '../../models', modelName, 'index.json');
                if (await fs.pathExists(indexPath)) {
                    modelConfig = await fs.readJson(indexPath);
                    modelConfig = await ModelService.processModelPaths(modelConfig, `./models/${modelName}`, modelName);
                } else {
                    return res.status(404).json({ error: '模型配置文件不存在' });
                }
            }

            // 添加缩放配置
            const scaleValue = parseFloat(scale);
            if (scaleValue > 0 && scaleValue !== 1.0) {
                modelConfig.layout = {
                    ...modelConfig.layout,
                    scale: scaleValue
                };
                console.log(`[DEBUG] /scale - 应用缩放: ${scaleValue}`);
            }

            // 添加尺寸限制
            if (width || height) {
                modelConfig.layout = {
                    ...modelConfig.layout,
                    width: width ? parseInt(width) : undefined,
                    height: height ? parseInt(height) : undefined
                };
                console.log(`[DEBUG] /scale - 应用尺寸限制: ${width}x${height}`);
            }

            res.json(modelConfig);
        } catch (error) {
            console.error('[DEBUG] /scale - 获取缩放模型失败:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }

    // 设置模型缩放
    static async setModelScale(req, res) {
        try {
            const { id, scale, width, height, persistent = false } = req.body;
            console.log(`[DEBUG] /scale POST - 设置缩放: id=${id}, scale=${scale}, persistent=${persistent}`);
            
            if (!id) {
                return res.status(400).json({ error: '缺少模型ID参数' });
            }

            const scaleConfig = {
                id,
                scale: parseFloat(scale) || 1.0,
                width: width ? parseInt(width) : undefined,
                height: height ? parseInt(height) : undefined,
                timestamp: new Date().toISOString()
            };

            // 如果需要持久化，保存到配置文件
            if (persistent) {
                const scaleConfigPath = path.join(__dirname, '..', 'model_scale_config.json');
                let scaleConfigs = {};
                
                if (await fs.pathExists(scaleConfigPath)) {
                    scaleConfigs = await fs.readJson(scaleConfigPath);
                }
                
                scaleConfigs[id] = scaleConfig;
                await fs.writeJson(scaleConfigPath, scaleConfigs, { spaces: 2 });
                console.log(`[DEBUG] /scale POST - 缩放配置已保存到文件`);
            }

            res.json({
                message: '模型缩放设置成功',
                config: scaleConfig
            });
        } catch (error) {
            console.error('[DEBUG] /scale POST - 设置模型缩放失败:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }

    // 获取纹理缓存 - live2d-widget 兼容性
    static async getTexturesCache(req, res) {
        try {
            const { modelName } = req.params;
            console.log(`[DEBUG] /textures.cache - 请求模型: ${modelName}`);
            
            // 检查模型目录
            const modelPath = path.join(__dirname, '../../models', modelName);
            const indexPath = path.join(modelPath, 'index.json');
            
            if (!(await fs.pathExists(indexPath))) {
                console.log(`[DEBUG] /textures.cache - 模型配置文件不存在: ${indexPath}`);
                return res.status(404).json([]);
            }

            const modelConfig = await fs.readJson(indexPath);
            
            // 检查是否为 Cubism 2 模型
            const version = modelConfig.Version || 2;
            if (version !== 2) {
                console.log(`[DEBUG] /textures.cache - 非 Cubism 2 模型，版本: ${version}`);
                return res.json([]);
            }

            // 返回纹理列表，每个纹理作为数组中的一个元素
            const textures = modelConfig.textures || [];
            const textureCache = textures.map(texture => [texture]);
            
            console.log(`[DEBUG] /textures.cache - 返回纹理缓存，包含 ${textureCache.length} 个纹理组`);
            res.json(textureCache);
            
        } catch (error) {
            console.error('[DEBUG] /textures.cache - 获取纹理缓存失败:', error);
            res.status(500).json([]);
        }
    }

    // 获取模型配置 - live2d-widget 兼容性
    static async getModelConfig(req, res) {
        try {
            let fullModelName = req.params[0] || req.params.modelName;
            console.log(`[DEBUG] /model/${fullModelName}/index.json - 请求模型配置`);
            
            // 处理路径修复：移除 /undefined、/index.json 等后缀
            if (fullModelName.endsWith('/undefined') || fullModelName.endsWith('/index.json')) {
                console.log(`[DEBUG] 检测到需要修复的路径后缀: ${fullModelName}`);
                
                // 查找 .model.json 或 .model3.json 文件位置
                const modelMatch = fullModelName.match(/^(.+\.(model3?\.json))/);
                if (modelMatch) {
                    const actualModelPath = modelMatch[1];
                    console.log(`[DEBUG] 路径修复: ${fullModelName} -> ${actualModelPath}`);
                    
                    // 重定向到正确的模型文件
                    const redirectUrl = `/model/${actualModelPath}`;
                    console.log(`[DEBUG] 重定向到: ${redirectUrl}`);
                    return res.redirect(302, redirectUrl);
                } else {
                    // 对于非.model.json文件，直接移除后缀
                    if (fullModelName.endsWith('/undefined')) {
                        fullModelName = fullModelName.replace('/undefined', '');
                    } else if (fullModelName.endsWith('/index.json')) {
                        fullModelName = fullModelName.replace('/index.json', '');
                    }
                    console.log(`[DEBUG] 路径后缀清理: ${req.params[0] || req.params.modelName} -> ${fullModelName}`);
                }
            }
            
            // 检查是否为网络模型
            if (PathUtils.isNetworkUrl(fullModelName)) {
                console.log(`[DEBUG] /model/${fullModelName}/index.json - 网络模型不支持此端点`);
                return res.status(404).json({ error: '网络模型不支持此端点' });
            }

            // 检查是否为 live2d-model-assets 中的模型
            if (PathUtils.isLive2DModelPath(fullModelName)) {
                const modelPath = path.join(__dirname, '..', fullModelName);
                if (await fs.pathExists(modelPath)) {
                    const modelConfig = await fs.readJson(modelPath);
                    const modelDir = path.dirname(modelPath);
                    const relativeModelDir = path.relative(path.join(__dirname, '..'), modelDir).replace(/\\/g, '/');
                    const processedConfig = await ModelService.processModelPaths(modelConfig, `./${relativeModelDir}`, fullModelName);
                    console.log(`[DEBUG] /model/${fullModelName}/index.json - 返回 live2d-model-assets 模型配置`);
                    return res.json(processedConfig);
                } else {
                    console.log(`[DEBUG] /model/${fullModelName}/index.json - live2d-model-assets 模型文件不存在`);
                    return res.status(404).json({ error: '模型文件不存在' });
                }
            }

            // 标准本地模型处理 - 改进版支持嵌套路径
            let modelPath, indexPath, basePath;
            
            if (fullModelName.includes('/')) {
                // 处理嵌套路径，如 "ShizukuTalk/shizuku-48"
                const parts = fullModelName.split('/');
                const folderName = parts[0];
                const subPath = parts.slice(1).join('/');
                
                // 优先尝试子目录的配置文件 - 修复路径拼接
                modelPath = path.join(__dirname, '../../models', folderName, subPath);
                indexPath = path.join(modelPath, 'index.json');
                basePath = `./models/${fullModelName}`;
                
                console.log(`[DEBUG] /model/${fullModelName}/index.json - 尝试子目录配置: ${indexPath}`);
                
                // 如果子目录配置文件不存在，尝试 model.json
                if (!(await fs.pathExists(indexPath))) {
                    const altIndexPath = path.join(modelPath, 'model.json');
                    console.log(`[DEBUG] /model/${fullModelName}/index.json - 尝试子目录 model.json: ${altIndexPath}`);
                    
                    if (await fs.pathExists(altIndexPath)) {
                        indexPath = altIndexPath;
                    } else {
                        // 最后尝试父目录的配置文件 - 修复路径
                        const parentPath = path.join(__dirname, '../../models', folderName);
                        const parentIndexPath = path.join(parentPath, 'index.json');
                        console.log(`[DEBUG] /model/${fullModelName}/index.json - 尝试父目录配置: ${parentIndexPath}`);
                        
                        if (await fs.pathExists(parentIndexPath)) {
                            modelPath = parentPath;
                            indexPath = parentIndexPath;
                            basePath = `./models/${folderName}`;
                            console.log(`[DEBUG] /model/${fullModelName}/index.json - 使用父目录配置文件`);
                        } else {
                            // 尝试父目录的 model.json
                            const parentModelPath = path.join(parentPath, 'model.json');
                            console.log(`[DEBUG] /model/${fullModelName}/index.json - 尝试父目录 model.json: ${parentModelPath}`);
                            
                            if (await fs.pathExists(parentModelPath)) {
                                modelPath = parentPath;
                                indexPath = parentModelPath;
                                basePath = `./models/${folderName}`;
                                console.log(`[DEBUG] /model/${fullModelName}/index.json - 使用父目录 model.json 文件`);
                            }
                        }
                    }
                }
            } else {
                // 单层路径处理 - 修复路径
                modelPath = path.join(__dirname, '../../models', fullModelName);
                indexPath = path.join(modelPath, 'index.json');
                basePath = `./models/${fullModelName}`;
                
                // 如果 index.json 不存在，尝试 model.json
                if (!(await fs.pathExists(indexPath))) {
                    const altIndexPath = path.join(modelPath, 'model.json');
                    if (await fs.pathExists(altIndexPath)) {
                        indexPath = altIndexPath;
                    } else {
                        // 如果直接配置文件都不存在，尝试搜索子目录
                        console.log(`[DEBUG] /model/${fullModelName}/index.json - 直接配置文件不存在，搜索子目录: ${modelPath}`);
                        
                        try {
                            const entries = await fs.readdir(modelPath, { withFileTypes: true });
                            const subDirs = entries.filter(entry => entry.isDirectory());
                            
                            for (const subDir of subDirs) {
                                const subDirPath = path.join(modelPath, subDir.name);
                                const subIndexPath = path.join(subDirPath, 'index.json');
                                const subModelPath = path.join(subDirPath, 'model.json');
                                
                                console.log(`[DEBUG] /model/${fullModelName}/index.json - 检查子目录: ${subDir.name}`);
                                
                                if (await fs.pathExists(subIndexPath)) {
                                    console.log(`[DEBUG] /model/${fullModelName}/index.json - 找到子目录配置: ${subIndexPath}`);
                                    modelPath = subDirPath;
                                    indexPath = subIndexPath;
                                    // 修复：basePath应该指向实际的子目录，这样前端请求的资源路径才能正确映射
                                    basePath = `./models/${fullModelName}/${subDir.name}`;
                                    break;
                                } else if (await fs.pathExists(subModelPath)) {
                                    console.log(`[DEBUG] /model/${fullModelName}/index.json - 找到子目录model.json: ${subModelPath}`);
                                    modelPath = subDirPath;
                                    indexPath = subModelPath;
                                    // 修复：basePath应该指向实际的子目录，这样前端请求的资源路径才能正确映射
                                    basePath = `./models/${fullModelName}/${subDir.name}`;
                                    break;
                                }
                            }
                        } catch (error) {
                            console.log(`[DEBUG] /model/${fullModelName}/index.json - 搜索子目录失败: ${error.message}`);
                        }
                    }
                }
            }
            
            if (!(await fs.pathExists(indexPath))) {
                console.log(`[DEBUG] /model/${fullModelName}/index.json - 所有配置文件都不存在`);
                return res.status(404).json({ error: '模型配置文件不存在' });
            }

            const modelConfig = await fs.readJson(indexPath);
            console.log(`[DEBUG] /model/${fullModelName}/index.json - 调用 processModelPaths，basePath: ${basePath}, modelName: ${fullModelName}`);
            console.log(`[CRITICAL DEBUG] 控制器代码已更新 - 时间戳: ${new Date().toISOString()}`);
            const processedConfig = await ModelService.processModelPaths(modelConfig, basePath, fullModelName);
            console.log(`[CRITICAL DEBUG] processModelPaths 返回结果:`, JSON.stringify(processedConfig, null, 2));
            
            console.log(`[DEBUG] /model/${fullModelName}/index.json - 返回处理后的模型配置`);
            res.json(processedConfig);
            
        } catch (error) {
            console.error(`[DEBUG] /model/${req.params.modelName}/index.json - 获取模型配置失败:`, error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
}

module.exports = ModelController;