const express = require('express');
const ModelController = require('../controllers/modelController');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

// 添加特殊处理KantaiCollection的路由 - 必须放在其他路由之前
router.get('/model/KantaiCollection/model.moc', (req, res) => {
  console.log(`[KantaiCollection路由] 接收到model.moc请求`);
  const filePath = path.join(__dirname, '../../models/KantaiCollection/murakumo/model.moc');
  console.log(`[KantaiCollection路由] 发送文件: ${filePath}`);
  res.sendFile(filePath);
});

router.get('/model/KantaiCollection/textures.1024/:file', (req, res) => {
  console.log(`[KantaiCollection路由] 接收到textures.1024请求: ${req.params.file}`);
  const filePath = path.join(__dirname, '../../models/KantaiCollection/murakumo/textures.1024', req.params.file);
  console.log(`[KantaiCollection路由] 发送文件: ${filePath}`);
  res.sendFile(filePath);
});

router.get('/model/KantaiCollection/physics.json', (req, res) => {
  console.log(`[KantaiCollection路由] 接收到physics.json请求`);
  const filePath = path.join(__dirname, '../../models/KantaiCollection/murakumo/physics.json');
  console.log(`[KantaiCollection路由] 发送文件: ${filePath}`);
  res.sendFile(filePath);
});

router.get('/model/KantaiCollection/expressions/:file', (req, res) => {
  console.log(`[KantaiCollection路由] 接收到expressions请求: ${req.params.file}`);
  const filePath = path.join(__dirname, '../../models/KantaiCollection/murakumo/expressions', req.params.file);
  console.log(`[KantaiCollection路由] 发送文件: ${filePath}`);
  res.sendFile(filePath);
});

router.get('/model/KantaiCollection/motions/:file', (req, res) => {
  console.log(`[KantaiCollection路由] 接收到motions请求: ${req.params.file}`);
  const filePath = path.join(__dirname, '../../models/KantaiCollection/murakumo/motions', req.params.file);
  console.log(`[KantaiCollection路由] 发送文件: ${filePath}`);
  res.sendFile(filePath);
});
// 这里不需要重复声明express和router

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

// 禁用 /scan 接口，改为使用文件监听自动更新
// router.get('/scan', ModelController.scanModels);
// router.post('/scan', ModelController.scanModels);

// 模型缩放控制
router.get('/scale', ModelController.getModelWithScale);
router.post('/scale', ModelController.setModelScale);

// live2d-widget 兼容性 - textures.cache 端点
router.get('/model/:modelName/textures.cache', ModelController.getTexturesCache);

// live2d-widget 兼容性 - 处理 /undefined 后缀请求（必须放在 index.json 路由之前）
router.get('/model/:modelName(*)/undefined', (req, res, next) => {
    console.log(`[ROUTE DEBUG] /undefined 路由匹配成功: ${req.path}`);
    console.log(`[ROUTE DEBUG] req.params:`, req.params);
    console.log(`[ROUTE DEBUG] req.params[0]:`, req.params[0]);
    next();
}, ModelController.getModelConfig);

// live2d-widget 兼容性 - 支持嵌套路径的模型配置文件端点（使用通配符匹配）
router.get('/model/:modelName(*)/index.json', (req, res, next) => {
    console.log(`[ROUTE DEBUG] 路由匹配成功: ${req.path}`);
    console.log(`[ROUTE DEBUG] req.params:`, req.params);
    console.log(`[ROUTE DEBUG] req.params[0]:`, req.params[0]);
    next();
}, ModelController.getModelConfig);

module.exports = router;
