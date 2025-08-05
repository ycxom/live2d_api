const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 主页路由
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../live2d-widget/demo/demo.html'));
});

// 健康检查路由
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 缩放控制页面
router.get('/scale-control', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/scale-control.html'));
});

// favicon 路由
router.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/favicon.svg'));
});

// 测试页面
router.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/test.html'));
});

module.exports = router;