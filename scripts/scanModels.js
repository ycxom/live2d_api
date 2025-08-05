const fs = require('fs-extra');
const path = require('path');

// 智能扫描模型目录并生成model_list.json
async function scanModels() {
    const modelDir = path.join(__dirname, '../model');
    const outputPath = path.join(__dirname, '../model_list.json');
    
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
            
            // 特殊处理live2d-model-assets-master目录
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

// 处理live2d-model-assets-master目录
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

// 检查本地文件是否存在，如果存在返回本地路径
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
            // 返回相对于model目录的路径，不包含前导斜杠
            // 控制器会正确拼接 model/ 前缀
            const modelDir = path.join(__dirname, '../model');
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