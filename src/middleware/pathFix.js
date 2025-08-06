const path = require('path');
const fs = require('fs-extra');
const debugConfig = require('../config/debug');

// 创建调试日志函数
const debugLog = debugConfig.createDebugLogger('pathFix');

// 路径修复中间件 - 处理 .model.json/ 被错误当作目录的情况
const pathFixMiddleware = (req, res, next) => {
    let requestPath = req.path;
    debugLog(`原始请求路径: ${requestPath}`);
    
    // 修复路径问题：处理 .model.json/、model.json/ 或 .model3.json/ 被错误当作目录的情况
    if (requestPath.includes('.model.json/') || requestPath.includes('model.json/') || requestPath.includes('.model3.json/')) {
        debugLog(`检测到需要修复的路径: ${requestPath}`);
        
        // 如果请求的是 index.json 或 undefined，直接映射到实际的 model.json 或 model3.json 文件
        if (requestPath.endsWith('/index.json') || requestPath.endsWith('/undefined')) {
            // 匹配 .model.json 或 .model3.json 文件
            const modelMatch = req.path.match(/\/([^\/]*\.?model3?\.json)\//);
            if (modelMatch) {
                const modelFile = modelMatch[1];
                // 从原始路径中提取目录路径，去掉 /model 前缀
                const originalPath = req.path;
                const dirPath = originalPath.substring(0, originalPath.indexOf(`/${modelFile}/`));
                // 移除开头的 /model 前缀
                const cleanDirPath = dirPath.replace(/^\/model/, '');
                const actualModelPath = `/model${cleanDirPath}/${modelFile}`;
                debugLog(`映射 ${requestPath.endsWith('/undefined') ? 'undefined' : 'index.json'} 到实际模型文件: ${actualModelPath}`);
                req.url = actualModelPath;
                req.path = actualModelPath;
                next();
                return;
            }
        } else {
            // 使用正则表达式匹配并修复路径
            // 匹配模式：/model/路径/模型名.model.json/文件名 -> /model/路径/文件名
            const fixedPath = requestPath.replace(/^\/model\/(.+)\/([^\/]*model\.json)\/(.+)$/, (match, basePath, modelFile, fileName) => {
                debugLog(`路径修复匹配成功: ${match}`);
                debugLog(`basePath: ${basePath}, modelFile: ${modelFile}, fileName: ${fileName}`);
                const newPath = `/model/${basePath}/${fileName}`;
                debugLog(`修复后路径: ${newPath}`);
                return newPath;
            });
            
            // 如果没有匹配到上面的模式，尝试更通用的匹配（包括 model3.json）
            if (fixedPath === requestPath && (requestPath.includes('model.json/') || requestPath.includes('model3.json/'))) {
                const altFixedPath = requestPath.replace(/\/([^\/]*model3?\.json)\/(.+)$/, '/$2');
                if (altFixedPath !== requestPath) {
                    debugLog(`使用备用修复规则: ${requestPath} -> ${altFixedPath}`);
                    req.url = altFixedPath;
                    req.path = altFixedPath;
                    
                    // 特殊处理 textures.cache 文件不存在的情况
                    if (altFixedPath.endsWith('/textures.cache')) {
                        const isLive2DAssets = altFixedPath.includes('live2d-model-assets');
                        const fullPath = isLive2DAssets 
                            ? path.join(__dirname, '..', altFixedPath)
                            : path.join(__dirname, '../model', altFixedPath);
                        
                        debugLog(`检查 textures.cache 文件: ${fullPath}`);
                        if (!fs.existsSync(fullPath)) {
                            debugLog(`textures.cache 文件不存在，返回 null: ${fullPath}`);
                            res.json(null);
                            return;
                        }
                    }
                    
                    next();
                    return;
                }
            }
            
            if (fixedPath !== requestPath) {
                debugLog(`修复后的路径: ${fixedPath}`);
                req.url = fixedPath;
                req.path = fixedPath;
                
                // 特殊处理 textures.cache 文件不存在的情况
                if (fixedPath.endsWith('/textures.cache')) {
                    const isLive2DAssets = fixedPath.includes('live2d-model-assets');
                    const fullPath = isLive2DAssets 
                        ? path.join(__dirname, '..', fixedPath)
                        : path.join(__dirname, '../model', fixedPath);
                    
                    debugLog(`检查 textures.cache 文件: ${fullPath}`);
                    if (!fs.existsSync(fullPath)) {
                        debugLog(`textures.cache 文件不存在，返回 null: ${fullPath}`);
                        res.json(null);
                        return;
                    }
                }
            }
        }
    }
    
    // 最终检查 textures.cache 文件是否存在
    const finalPath = req.path;
    if (finalPath.endsWith('/textures.cache')) {
        // 对于 live2d-model-assets 路径，不需要额外添加 model 前缀
        const isLive2DAssets = finalPath.includes('live2d-model-assets');
        const fullPath = isLive2DAssets 
            ? path.join(__dirname, '..', finalPath)
            : path.join(__dirname, '../model', finalPath);
        
        debugLog(`最终检查 textures.cache 文件: ${fullPath}`);
        if (!fs.existsSync(fullPath)) {
            debugLog(`textures.cache 文件不存在，返回 null: ${fullPath}`);
            res.json(null);
            return;
        }
    }
    
    next();
};

module.exports = pathFixMiddleware;