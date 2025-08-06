const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

// 导入路由
const apiRoutes = require('./routes/api');

// 导入中间件
const corsMiddleware = require('./middleware/cors');
const loggerMiddleware = require('./middleware/logger');
const pathFixMiddleware = require('./middleware/pathFix');

const app = express();

// 应用中间件
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(pathFixMiddleware);

// 导入资源路径解析中间件
const resourcePathResolver = require('./middleware/resourcePathResolver');

// 添加特殊处理KantaiCollection的路由 - 直接处理特定文件请求
app.get('/model/KantaiCollection/model.moc', (req, res) => {
  console.log(`[KantaiCollection直接路由] 接收到model.moc请求`);
  const filePath = path.join(__dirname, '../models/KantaiCollection/murakumo/model.moc');
  console.log(`[KantaiCollection直接路由] 发送文件: ${filePath}`);
  
  // 检查文件是否存在
  if (fs.existsSync(filePath)) {
    console.log(`[KantaiCollection直接路由] 文件存在，发送文件`);
    return res.sendFile(filePath);
  } else {
    console.log(`[KantaiCollection直接路由] 文件不存在: ${filePath}`);
    return res.status(404).send('文件不存在');
  }
});

app.get('/model/KantaiCollection/textures.1024/:file', (req, res) => {
  console.log(`[KantaiCollection直接路由] 接收到textures.1024请求: ${req.params.file}`);
  const filePath = path.join(__dirname, '../models/KantaiCollection/murakumo/textures.1024', req.params.file);
  console.log(`[KantaiCollection直接路由] 发送文件: ${filePath}`);
  
  // 检查文件是否存在
  if (fs.existsSync(filePath)) {
    console.log(`[KantaiCollection直接路由] 文件存在，发送文件`);
    return res.sendFile(filePath);
  } else {
    console.log(`[KantaiCollection直接路由] 文件不存在: ${filePath}`);
    return res.status(404).send('文件不存在');
  }
});

app.get('/model/KantaiCollection/physics.json', (req, res) => {
  console.log(`[KantaiCollection直接路由] 接收到physics.json请求`);
  const filePath = path.join(__dirname, '../models/KantaiCollection/murakumo/physics.json');
  console.log(`[KantaiCollection直接路由] 发送文件: ${filePath}`);
  
  // 检查文件是否存在
  if (fs.existsSync(filePath)) {
    console.log(`[KantaiCollection直接路由] 文件存在，发送文件`);
    return res.sendFile(filePath);
  } else {
    console.log(`[KantaiCollection直接路由] 文件不存在: ${filePath}`);
    return res.status(404).send('文件不存在');
  }
});

// 应用通用的资源路径解析中间件
app.use('/model', resourcePathResolver);

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '../public')));
app.use('/model', express.static(path.join(__dirname, '../models')));

// API路由
app.use('/', apiRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.path
  });
});

module.exports = app;