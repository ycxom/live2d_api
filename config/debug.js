// Debug配置文件
module.exports = {
    // 路径修复中间件调试开关
    pathFixDebug: process.env.PATH_FIX_DEBUG === 'true' || false,
    
    // 模型服务调试开关
    modelServiceDebug: process.env.MODEL_SERVICE_DEBUG === 'true' || false,
    
    // 控制器调试开关
    controllerDebug: process.env.CONTROLLER_DEBUG === 'true' || false,
    
    // 全局调试开关
    globalDebug: process.env.DEBUG === 'true' || false,
    
    // 调试日志函数
    createDebugLogger: (moduleName) => {
        return (message) => {
            const debugKey = `${moduleName}Debug`;
            const isEnabled = module.exports[debugKey] || module.exports.globalDebug;
            if (isEnabled) {
                console.log(`[${moduleName.toUpperCase()}_DEBUG] ${message}`);
            }
        };
    }
};