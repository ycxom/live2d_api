const express = require('express');
const ModelController = require('../controllers/modelController');
const router = express.Router();

// 获取模型信息
router.get('/get', ModelController.getModel);

// 兼容原PHP版本 - /get/ 路径
router.get('/get/', ModelController.getModel);

// 随机获取模型
router.get('/rand', ModelController.getRandomModel);

// 兼容原PHP版本 - /rand/ 路径
router.get('/rand/', ModelController.getRandomModel);

// 获取模型列表
router.get('/list', ModelController.getModelList);

// 兼容原PHP版本 - 直接访问model_list.json
router.get('/model_list.json', ModelController.getModelList);

// 重新扫描模型目录 - 支持GET和POST方法
router.get('/scan', ModelController.scanModels);
router.post('/scan', ModelController.scanModels);

// 模型缩放控制
router.get('/scale', ModelController.getModelWithScale);
router.post('/scale', ModelController.setModelScale);

// live2d-widget 兼容性 - textures.cache 端点
router.get('/model/:modelName/textures.cache', ModelController.getTexturesCache);

// live2d-widget 兼容性 - 模型配置文件端点
router.get('/model/:modelName/index.json', ModelController.getModelConfig);

module.exports = router;
