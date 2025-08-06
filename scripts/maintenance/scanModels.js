const fs = require('fs-extra');
const path = require('path');
const debugConfig = require('../../src/config/debug');
const smartMode = require('../../src/config/smartMode');
const debugLog = debugConfig.createDebugLogger('scanModels');

// 智能扫描模型目录并生成model_list.json
async function scanModels() {
    const modelDir = path.join(__dirname, '../../models');
    const outputPath = path.join(__dirname, '../../config/model_list.json');
    
    console.log('开始扫描模型目录...');
    
    try {
        const models = [];
        const messages = [];
        
        // 检查模型目录是否存在
        if (!(await fs.pathExists(modelDir))) {
            console.log('模型目录不存在，创建空的配置文件');
            await fs.writeJson(outputPath, { models: [], messages: [] }, { spaces: 2 });
            return;
        }
        
        const entries = await fs.readdir(modelDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const dirName = entry.name;
            const dirPath = path.join(modelDir, dirName);
            
            console.log(`扫描目录: ${dirName}`);
            
            // 智能模式：基于结构分析检测文件夹类型
            const structureAnalysis = await smartMode.analyzeStructure(dirPath);
            if (structureAnalysis) {
                debugLog(`检测到结构类型: ${structureAnalysis.type} (置信度: ${structureAnalysis.confidence})`);
                const handler = smartMode.getHandler(structureAnalysis.handler);
                
                if (handler) {
                    await processWithSmartMode(dirPath, models, messages, dirName, handler, structureAnalysis);
                    continue;
                }
            }
            
            // 兼容性：保持对原有live2d-model-assets-master的支持
            if (dirName === 'live2d-model-assets-master') {
                await processLive2dAssets(dirPath, models, messages);
                continue;
            }
            
            // 检查是否为标准Live2D模型目录
            const indexPath = path.join(dirPath, 'index.json');
            const modelJsonPath = path.join(dirPath, 'model.json');
            
            if (await fs.pathExists(indexPath) || await fs.pathExists(modelJsonPath)) {
                // 单个模型
                models.push(dirName);
                messages.push(`来自 ${dirName} 的模型`);
                console.log(`  发现模型: ${dirName}`);
            } else {
                // 检查子目录是否包含多个模型
                const subModels = await scanSubModels(dirPath, dirName);
                if (subModels.length > 0) {
                    if (subModels.length === 1) {
                        models.push(subModels[0]);
                        messages.push(`来自 ${dirName} 的 ${subModels[0].split('/')[1]} 模型`);
                    } else {
                        models.push(subModels);
                        messages.push(`${dirName} 系列模型`);
                    }
                    console.log(`  发现 ${subModels.length} 个子模型`);
                }
            }
        }
        
        // 生成配置文件
        const config = {
            models,
            messages
        };
        
        await fs.writeJson(outputPath, config, { spaces: 2 });
        console.log(`扫描完成！共发现 ${models.length} 个模型组`);
        console.log(`配置文件已保存到: ${outputPath}`);
        
    } catch (error) {
        console.error('扫描模型目录时出错:', error);
        throw error;
    }
}

// 扫描子目录中的模型
async function scanSubModels(parentDir, parentName) {
    const subModels = [];
    
    try {
        const entries = await fs.readdir(parentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const subDirPath = path.join(parentDir, entry.name);
            const indexPath = path.join(subDirPath, 'index.json');
            const modelJsonPath = path.join(subDirPath, 'model.json');
            
            if (await fs.pathExists(indexPath) || await fs.pathExists(modelJsonPath)) {
                subModels.push(`${parentName}/${entry.name}`);
            }
        }
    } catch (error) {
        console.error(`扫描子目录 ${parentDir} 时出错:`, error);
    }
    
    return subModels;
}

// 智能模式统一处理函数
async function processWithSmartMode(dirPath, models, messages, dirName, handler, structureAnalysis) {
    try {
        debugLog(`使用智能模式处理目录: ${dirName} (类型: ${structureAnalysis.type})`);
        
        switch (structureAnalysis.type) {
            case 'live2d-model-assets':
                await processLive2dModelAssets(dirPath, models, messages, dirName, handler, structureAnalysis.metadata);
                break;
            case 'github-assets-collection':
                await processGithubAssetsCollection(dirPath, models, messages, dirName, handler, structureAnalysis.metadata);
                break;
            case 'nested-model-collection':
                await processNestedModelCollection(dirPath, models, messages, dirName, handler, structureAnalysis.metadata);
                break;
            case 'standard-live2d':
            default:
                await processStandardLive2d(dirPath, models, messages, dirName, handler, structureAnalysis.metadata);
                break;
        }
        
    } catch (error) {
        console.error(`智能模式处理${dirName}时出错:`, error);
        // 回退到标准扫描
        await fallbackToStandardScan(dirPath, models, messages, dirName);
    }
}

// 处理 live2d-model-assets 类型结构
async function processLive2dModelAssets(dirPath, models, messages, dirName, handler, metadata) {
    debugLog(`处理 live2d-model-assets 类型: ${dirName}`);
    
    const indexPath = metadata.indexFile;
    
    if (!(await fs.pathExists(indexPath))) {
        console.log('  model.index 文件不存在，回退到标准扫描');
        await fallbackToStandardScan(dirPath, models, messages, dirName);
        return;
    }
    
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const lines = indexContent.split('\n').filter(line => line.trim());
    
    // 按系列分组模型
    const seriesMap = new Map();
    const baseUrl = 'https://raw.githubusercontent.com/zenghongtu/live2d-model-assets/master/';
    
    for (const line of lines) {
        if (line.startsWith('https://')) {
            const urlParts = line.split('/');
            const seriesName = decodeURIComponent(urlParts[urlParts.length - 3]);
            
            // 检查本地文件是否存在
            const localPath = await checkLocalFileWithSmartMode(line, dirPath, baseUrl, dirName, handler);
            const finalPath = localPath || line;
            
            if (!seriesMap.has(seriesName)) {
                seriesMap.set(seriesName, []);
            }
            seriesMap.get(seriesName).push(finalPath);
        }
    }
    
    // 添加到模型列表
    for (const [seriesName, paths] of seriesMap) {
        if (paths.length === 1) {
            models.push(paths[0]);
            messages.push(`来自 ${seriesName} 的模型`);
        } else {
            models.push(paths);
            messages.push(`${seriesName} 系列模型`);
        }
        
        // 统计本地和网络文件数量
        const localCount = paths.filter(p => !p.startsWith('http')).length;
        const networkCount = paths.length - localCount;
        console.log(`  发现系列: ${seriesName} (${paths.length} 个模型, ${localCount} 个本地, ${networkCount} 个网络)`);
    }
}

// 处理 GitHub 资源集合类型结构
async function processGithubAssetsCollection(dirPath, models, messages, dirName, handler, metadata) {
    debugLog(`处理 GitHub 资源集合类型: ${dirName}`);
    
    const modelDirs = metadata.modelDirs || [];
    
    if (modelDirs.length === 0) {
        console.log('  未找到模型目录，回退到标准扫描');
        await fallbackToStandardScan(dirPath, models, messages, dirName);
        return;
    }
    
    const modelPaths = modelDirs.map(dir => `${dirName}/${dir}`);
    
    if (modelPaths.length === 1) {
        models.push(modelPaths[0]);
        messages.push(`来自 ${dirName} 的模型`);
    } else {
        models.push(modelPaths);
        messages.push(`${dirName} 系列模型`);
    }
    
    console.log(`  发现 ${modelPaths.length} 个模型目录: ${modelDirs.join(', ')}`);
}

// 处理嵌套模型集合类型结构
async function processNestedModelCollection(dirPath, models, messages, dirName, handler, metadata) {
    debugLog(`处理嵌套模型集合类型: ${dirName}`);
    
    // 递归扫描所有嵌套的模型
    const nestedModels = await scanNestedModels(dirPath, dirName, metadata.maxDepth || 3);
    
    if (nestedModels.length === 0) {
        console.log('  未找到嵌套模型，回退到标准扫描');
        await fallbackToStandardScan(dirPath, models, messages, dirName);
        return;
    }
    
    if (nestedModels.length === 1) {
        models.push(nestedModels[0]);
        messages.push(`来自 ${dirName} 的模型`);
    } else {
        models.push(nestedModels);
        messages.push(`${dirName} 系列模型`);
    }
    
    console.log(`  发现 ${nestedModels.length} 个嵌套模型`);
}

// 处理标准 Live2D 模型结构
async function processStandardLive2d(dirPath, models, messages, dirName, handler, metadata) {
    debugLog(`处理标准 Live2D 模型: ${dirName}`);
    
    // 单个模型
    models.push(dirName);
    messages.push(`来自 ${dirName} 的模型`);
    console.log(`  发现标准模型: ${dirName} (配置文件: ${metadata.configFile || 'unknown'})`);
}

// 扫描嵌套模型
async function scanNestedModels(parentDir, parentName, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
        return [];
    }
    
    const nestedModels = [];
    
    try {
        const entries = await fs.readdir(parentDir, { withFileTypes: true });
        
        // 检查当前目录是否包含模型
        const indexPath = path.join(parentDir, 'index.json');
        const modelJsonPath = path.join(parentDir, 'model.json');
        
        if (await fs.pathExists(indexPath) || await fs.pathExists(modelJsonPath)) {
            const relativePath = currentDepth === 0 ? parentName : 
                path.relative(path.join(parentDir, '../'.repeat(currentDepth)), parentDir).replace(/\\/g, '/');
            nestedModels.push(relativePath);
        }
        
        // 递归检查子目录
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subPath = path.join(parentDir, entry.name);
                const subName = currentDepth === 0 ? `${parentName}/${entry.name}` : 
                    `${parentName}/${path.relative(path.join(parentDir, '../'.repeat(currentDepth)), subPath).replace(/\\/g, '/')}`;
                
                const subModels = await scanNestedModels(subPath, subName, maxDepth, currentDepth + 1);
                nestedModels.push(...subModels);
            }
        }
    } catch (error) {
        console.error(`扫描嵌套目录 ${parentDir} 时出错:`, error);
    }
    
    return nestedModels;
}

// 回退到标准扫描
async function fallbackToStandardScan(dirPath, models, messages, dirName) {
    debugLog(`回退到标准扫描: ${dirName}`);
    
    // 检查是否为标准Live2D模型目录
    const indexPath = path.join(dirPath, 'index.json');
    const modelJsonPath = path.join(dirPath, 'model.json');
    
    if (await fs.pathExists(indexPath) || await fs.pathExists(modelJsonPath)) {
        // 单个模型
        models.push(dirName);
        messages.push(`来自 ${dirName} 的模型`);
        console.log(`  发现模型: ${dirName}`);
    } else {
        // 检查子目录是否包含多个模型
        const subModels = await scanSubModels(dirPath, dirName);
        if (subModels.length > 0) {
            if (subModels.length === 1) {
                models.push(subModels[0]);
                messages.push(`来自 ${dirName} 的 ${subModels[0].split('/')[1]} 模型`);
            } else {
                models.push(subModels);
                messages.push(`${dirName} 系列模型`);
            }
            console.log(`  发现 ${subModels.length} 个子模型`);
        }
    }
}

// 处理live2d-model-assets-master目录（原有逻辑保持不变）
async function processLive2dAssets(assetsDir, models, messages) {
    try {
        const indexPath = path.join(assetsDir, 'assets/model.index');
        
        if (!(await fs.pathExists(indexPath))) {
            console.log('  未找到model.index文件');
            return;
        }
        
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const lines = indexContent.split('\n').filter(line => line.trim());
        
        // 按系列分组模型
        const seriesMap = new Map();
        const baseUrl = 'https://raw.githubusercontent.com/zenghongtu/live2d-model-assets/master/';
        
        for (const line of lines) {
            if (line.startsWith('https://')) {
                const urlParts = line.split('/');
                const seriesName = decodeURIComponent(urlParts[urlParts.length - 3]);
                
                // 检查本地文件是否存在
                const localPath = await checkLocalFile(line, assetsDir, baseUrl);
                const finalPath = localPath || line;
                
                if (!seriesMap.has(seriesName)) {
                    seriesMap.set(seriesName, []);
                }
                seriesMap.get(seriesName).push(finalPath);
            }
        }
        
        // 添加到模型列表
        for (const [seriesName, paths] of seriesMap) {
            if (paths.length === 1) {
                models.push(paths[0]);
                messages.push(`来自 ${seriesName} 的模型`);
            } else {
                models.push(paths);
                messages.push(`${seriesName} 系列模型`);
            }
            
            // 统计本地和网络文件数量
            const localCount = paths.filter(p => !p.startsWith('http')).length;
            const networkCount = paths.length - localCount;
            console.log(`  发现系列: ${seriesName} (${paths.length} 个模型, ${localCount} 个本地, ${networkCount} 个网络)`);
        }
        
    } catch (error) {
        console.error('处理live2d-model-assets时出错:', error);
    }
}

// 智能模式检查本地文件
async function checkLocalFileWithSmartMode(url, assetsDir, baseUrl, dirName, handler) {
    try {
        if (!url.startsWith(baseUrl)) {
            return null;
        }
        
        // 提取相对路径
        const relativePath = url.replace(baseUrl, '');
        const decodedPath = decodeURIComponent(relativePath);
        const localFilePath = path.join(assetsDir, decodedPath);
        
        // 检查文件是否存在
        if (await fs.pathExists(localFilePath)) {
            // 返回相对于models目录的路径，不包含前导斜杠
            const modelDir = path.join(__dirname, '../../models');
            let relativeToModel = path.relative(modelDir, localFilePath).replace(/\\/g, '/');
            
            // 使用智能模式处理路径
            if (handler && handler.processModelPath) {
                relativeToModel = handler.processModelPath(relativeToModel, dirName);
            }
            
            console.log(`    使用本地文件: ${decodedPath} -> ${relativeToModel}`);
            return relativeToModel;
        }
        
        return null;
    } catch (error) {
        console.error(`智能模式检查本地文件时出错 ${url}:`, error);
        return null;
    }
}

// 检查本地文件是否存在，如果存在返回本地路径（原有逻辑保持不变）
async function checkLocalFile(url, assetsDir, baseUrl) {
    try {
        if (!url.startsWith(baseUrl)) {
            return null;
        }
        
        // 提取相对路径
        const relativePath = url.replace(baseUrl, '');
        const decodedPath = decodeURIComponent(relativePath);
        const localFilePath = path.join(assetsDir, decodedPath);
        
        // 检查文件是否存在
        if (await fs.pathExists(localFilePath)) {
            // 返回相对于models目录的路径，不包含前导斜杠
            // 控制器会正确拼接 models/ 前缀
            const modelDir = path.join(__dirname, '../../models');
            const relativeToModel = path.relative(modelDir, localFilePath).replace(/\\/g, '/');
            console.log(`    使用本地文件: ${decodedPath}`);
            return relativeToModel;
        }
        
        return null;
    } catch (error) {
        console.error(`检查本地文件时出错 ${url}:`, error);
        return null;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    scanModels().catch(console.error);
}

module.exports = { scanModels };