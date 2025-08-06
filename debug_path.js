const path = require('path');
const fs = require('fs-extra');

// 打印当前工作目录
console.log('当前工作目录:', process.cwd());

// 打印模型目录路径
const modelsPath = path.join(__dirname, 'models');
console.log('模型目录路径:', modelsPath);

// 检查模型目录是否存在
const modelsExists = fs.existsSync(modelsPath);
console.log('模型目录是否存在:', modelsExists);

// 检查KantaiCollection目录
const kantaiPath = path.join(modelsPath, 'KantaiCollection');
console.log('KantaiCollection路径:', kantaiPath);
console.log('KantaiCollection是否存在:', fs.existsSync(kantaiPath));

// 检查murakumo子目录
const murakumoPath = path.join(kantaiPath, 'murakumo');
console.log('murakumo路径:', murakumoPath);
console.log('murakumo是否存在:', fs.existsSync(murakumoPath));

// 检查模型文件
const modelPath = path.join(murakumoPath, 'model.moc');
console.log('model.moc路径:', modelPath);
console.log('model.moc是否存在:', fs.existsSync(modelPath));

// 检查纹理文件
const textureDirPath = path.join(murakumoPath, 'textures.1024');
console.log('textures.1024路径:', textureDirPath);
console.log('textures.1024是否存在:', fs.existsSync(textureDirPath));

const texturePath = path.join(textureDirPath, '00.png');
console.log('00.png路径:', texturePath);
console.log('00.png是否存在:', fs.existsSync(texturePath));

// 检查配置文件
const configPath = path.join(murakumoPath, 'index.json');
console.log('index.json路径:', configPath);
console.log('index.json是否存在:', fs.existsSync(configPath));

// 检查resourcePathResolver中间件是否正确加载
try {
  const resourcePathResolver = require('./src/middleware/resourcePathResolver');
  console.log('resourcePathResolver中间件已加载');
} catch (error) {
  console.error('resourcePathResolver中间件加载失败:', error.message);
}