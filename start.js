#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 Live2D API 模块化服务器...\n');

// 启动模块化服务器
const server = spawn('node', ['server_modular.js'], {
    cwd: __dirname,
    stdio: 'inherit'
});

server.on('error', (err) => {
    console.error('❌ 服务器启动失败:', err);
    process.exit(1);
});

server.on('close', (code) => {
    console.log(`\n📴 服务器已停止 (退出码: ${code})`);
    process.exit(code);
});

// 处理进程退出
process.on('SIGINT', () => {
    console.log('\n🛑 正在停止服务器...');
    server.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在停止服务器...');
    server.kill('SIGTERM');
});