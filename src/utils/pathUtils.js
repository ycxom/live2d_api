const path = require('path');

class PathUtils {
    // 标准化路径分隔符
    static normalizePath(filePath) {
        return filePath.replace(/\\/g, '/');
    }

    // 构建相对路径
    static buildRelativePath(basePath, targetPath) {
        const relativePath = path.relative(basePath, targetPath);
        return this.normalizePath(relativePath);
    }

    // 构建模型资源路径
    static buildModelPath(modelName, resourcePath) {
        return this.normalizePath(`./model/${modelName}/${resourcePath}`);
    }

    // 构建Live2D资源路径
    static buildLive2DPath(modelDir, resourcePath) {
        const relativePath = path.relative(process.cwd(), modelDir);
        return this.normalizePath(`./${relativePath}/${resourcePath}`);
    }

    // 检查是否为网络URL
    static isNetworkUrl(url) {
        return url.startsWith('http://') || url.startsWith('https://');
    }

    // 检查是否为Live2D模型资源路径
    static isLive2DModelPath(modelPath) {
        return modelPath.includes('live2d-model-assets-master');
    }
}

module.exports = PathUtils;