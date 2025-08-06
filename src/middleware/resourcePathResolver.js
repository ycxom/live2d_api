const path = require('path');
const fs = require('fs-extra');
const debugConfig = require('../config/debug');

// 创建调试日志函数
const debugLog = debugConfig.createDebugLogger('resourcePathResolver');

// 资源路径解析中间件 - 处理复杂的相对路径引用
const resourcePathResolver = (req, res, next) => {
    const requestPath = req.path;
    debugLog(`处理请求路径: ${requestPath}`);
    
    // 添加调试日志
    console.log(`[ResourcePathResolver] 处理请求: ${requestPath}`);
    console.log(`[ResourcePathResolver] 原始URL: ${req.originalUrl}`);
    console.log(`[ResourcePathResolver] 当前URL: ${req.url}`);
    
    try {
        // 对于 live2d-model-assets-master/assets/ 路径，直接跳过处理
        if (requestPath.includes('live2d-model-assets-master/assets/')) {
            debugLog('检测到 live2d-model-assets-master/assets/ 路径，跳过ResourcePathResolver处理');
            next();
            return;
        }
        
        // 处理 HyperdimensionNeptunia 系列的特殊路径结构
        if (requestPath.includes('HyperdimensionNeptunia')) {
            debugLog('检测到 HyperdimensionNeptunia 模型请求');
            
            // 处理 motions/../../general/mtn/ 这样的路径
            if (requestPath.includes('motions/../../general/')) {
                const motionMatch = requestPath.match(/(.+\/HyperdimensionNeptunia)\/([^\/]+)\/motions\/\.\.\/\.\.\/general\/(.+)/);
                if (motionMatch) {
                    const seriesPath = motionMatch[1]; // /model/HyperdimensionNeptunia
                    const characterName = motionMatch[2]; // blanc_classic
                    const fileName = motionMatch[3]; // mtn/idle_00.mtn
                    // 修正路径解析：从角色目录跳转到同级的general目录
                    const resolvedPath = `${seriesPath}/general/${fileName}`;
                    debugLog(`HyperdimensionNeptunia motions 路径解析: ${requestPath} -> ${resolvedPath}`);
                    
                    const fullPath = path.join(__dirname, '..', resolvedPath);
                    debugLog(`检查文件是否存在: ${fullPath}`);
                    
                    if (fs.existsSync(fullPath)) {
                        req.url = resolvedPath;
                        req.path = resolvedPath;
                        debugLog(`路径解析成功，继续处理: ${resolvedPath}`);
                        next();
                        return;
                    } else {
                        debugLog(`文件不存在: ${fullPath}`);
                    }
                }
            }
            
            // 处理 ../general/pose.json 这样的路径
            if (requestPath.includes('../general/')) {
                const poseMatch = requestPath.match(/(.+\/HyperdimensionNeptunia)\/([^\/]+)\/\.\.\/general\/(.+)/);
                if (poseMatch) {
                    const seriesPath = poseMatch[1]; // /model/HyperdimensionNeptunia
                    const characterName = poseMatch[2]; // blanc_classic
                    const fileName = poseMatch[3]; // pose.json
                    // 修正路径解析：从角色目录跳转到同级的general目录
                    const resolvedPath = `${seriesPath}/general/${fileName}`;
                    debugLog(`HyperdimensionNeptunia pose 路径解析: ${requestPath} -> ${resolvedPath}`);
                    
                    const fullPath = path.join(__dirname, '..', resolvedPath);
                    debugLog(`检查文件是否存在: ${fullPath}`);
                    
                    if (fs.existsSync(fullPath)) {
                        req.url = resolvedPath;
                        req.path = resolvedPath;
                        debugLog(`路径解析成功，继续处理: ${resolvedPath}`);
                        next();
                        return;
                    } else {
                        debugLog(`文件不存在: ${fullPath}`);
                    }
                }
            }
        }
        
        // 处理 KantaiCollection 系列的嵌套路径结构
        if (requestPath.includes('KantaiCollection')) {
            debugLog('检测到 KantaiCollection 模型请求');
            
            // 处理缺少子目录的路径，包括直接文件和目录资源
            // 如 /model/KantaiCollection/model.moc, /model/KantaiCollection/physics.json, /model/KantaiCollection/textures.1024/00.png
            const directResourceMatch = requestPath.match(/^(\/model\/KantaiCollection\/)(.+)$/);
            if (directResourceMatch && !requestPath.includes('/murakumo/')) {
                const basePath = directResourceMatch[1];
                const resourcePath = directResourceMatch[2];
                // 插入 murakumo 子目录
                const resolvedPath = basePath + 'murakumo/' + resourcePath;
                
                // 添加更多调试日志
                console.log(`[ResourcePathResolver] KantaiCollection 资源路径解析: ${requestPath} -> ${resolvedPath}`);
                
                // 修正：使用正确的路径检查文件是否存在
                const fullPath = path.join(__dirname, '../../models', 'KantaiCollection/murakumo', resourcePath);
                console.log(`[ResourcePathResolver] 检查文件是否存在: ${fullPath}`);
                
                if (fs.existsSync(fullPath)) {
                    console.log(`[ResourcePathResolver] 文件存在，修改请求路径`);
                    req.url = resolvedPath;
                    req.path = resolvedPath;
                    console.log(`[ResourcePathResolver] 路径解析成功，继续处理: ${resolvedPath}`);
                    next();
                    return;
                } else {
                    console.log(`[ResourcePathResolver] 文件不存在: ${fullPath}`);
                }
            }
            
            // 处理嵌套的相对路径，如 ../../1/1.mtn
            const nestedMatch = requestPath.match(/(.+\/KantaiCollection\/[^\/]+\/[^\/]+)\/\.\.\/\.\.\/(.+)/);
            if (nestedMatch) {
                const basePath = nestedMatch[1];
                const relativePath = nestedMatch[2];
                // 向上两级目录，然后拼接相对路径
                const resolvedPath = basePath.replace(/\/[^\/]+\/[^\/]+$/, `/${relativePath}`);
                debugLog(`KantaiCollection 嵌套路径解析: ${requestPath} -> ${resolvedPath}`);
                
                const fullPath = path.join(__dirname, '..', resolvedPath);
                debugLog(`检查文件是否存在: ${fullPath}`);
                
                if (fs.existsSync(fullPath)) {
                    req.url = resolvedPath;
                    req.path = resolvedPath;
                    debugLog(`路径解析成功，继续处理: ${resolvedPath}`);
                    next();
                    return;
                } else {
                    debugLog(`文件不存在: ${fullPath}`);
                }
            }
        }
        
        // 处理通用的相对路径解析
        if (requestPath.includes('../')) {
            debugLog('检测到相对路径引用');
            
            // 处理 ../ 路径
            const segments = requestPath.split('/');
            const resolvedSegments = [];
            
            for (const segment of segments) {
                if (segment === '..') {
                    // 向上一级目录
                    if (resolvedSegments.length > 0) {
                        resolvedSegments.pop();
                    }
                } else if (segment !== '' && segment !== '.') {
                    resolvedSegments.push(segment);
                }
            }
            
            const resolvedPath = '/' + resolvedSegments.join('/');
            
            if (resolvedPath !== requestPath) {
                debugLog(`通用相对路径解析: ${requestPath} -> ${resolvedPath}`);
                
                const fullPath = path.join(__dirname, '..', resolvedPath);
                debugLog(`检查文件是否存在: ${fullPath}`);
                
                if (fs.existsSync(fullPath)) {
                    req.url = resolvedPath;
                    req.path = resolvedPath;
                    debugLog(`路径解析成功，继续处理: ${resolvedPath}`);
                    next();
                    return;
                } else {
                    debugLog(`文件不存在: ${fullPath}`);
                }
            }
        }
        
        // 如果没有特殊处理，继续正常流程
        debugLog(`无需特殊处理，继续正常流程: ${requestPath}`);
        next();
        
    } catch (error) {
        debugLog(`路径解析过程中发生错误: ${error.message}`);
        debugLog(`错误堆栈: ${error.stack}`);
        next();
    }
};

module.exports = resourcePathResolver;