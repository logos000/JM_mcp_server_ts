# JM Comic MCP Server (TypeScript版本)

基于Model Context Protocol的JM漫画服务器TypeScript实现，提供漫画搜索、下载和PDF转换功能。

## 功能特性

- 🔍 **漫画搜索**: 支持关键词搜索和高级筛选
- 📖 **专辑详情**: 获取漫画专辑的详细信息  
- 📊 **排行榜**: 获取周排行、月排行和总排行
- 🏷️ **分类筛选**: 按分类、时间段和排序方式筛选漫画
- 📥 **漫画下载**: 下载漫画专辑到本地，支持图片解码
- 📦 **批量下载**: 支持同时下载多个专辑
- 📚 **PDF转换**: 将下载的图片转换为PDF格式
- 📁 **目录管理**: 获取下载目录信息和已下载专辑列表
- ⚙️ **配置管理**: 支持YAML配置文件
- 🌐 **跨平台支持**: 支持Windows、Linux、macOS和Android (Termux)
- ⚡ **异步下载**: 下载任务在后台进行，避免超时

## 系统要求

### 必需依赖
- **Node.js** 16+ 
- **FFmpeg** - 用于WebP图片格式转换



## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译项目

```bash
npm run build
```

### 3. 验证FFmpeg安装

```bash
ffmpeg -version
```

### 4. 测试服务器

```bash
# 使用内置测试客户端
node test-mcp-client.js
```

### 5. 配置VS Code

在 `.vscode/mcp.json` 中配置：

```json
{
  "servers": {
    "jm-comic-server-ts": {
      "type": "stdio",
      "command": "node",
      "args": ["你的项目路径/build/server/index.js"]
    }
  }
}
```

### 6. 重启VS Code

配置完成后重启VS Code，即可在AI助手中使用JM漫画功能。

## 可用工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `search_comic` | 搜索漫画 | `query`, `page`, `order_by`, `time_period`, `category` |
| `get_album_details` | 获取专辑详情 | `album_id` |
| `get_album_info_enhanced` | 获取增强专辑信息 | `album_id` |
| `download_comic_album` | 下载漫画专辑 | `album_id`, `convert_to_pdf` |
| `batch_download_albums` | 批量下载专辑 | `album_ids`, `convert_to_pdf` |
| `convert_album_to_pdf_tool` | 转换为PDF | `album_id`, `album_dir` |
| `get_ranking_list` | 获取排行榜 | `period` |
| `filter_comics_by_category` | 分类筛选 | `category`, `time_period`, `order_by`, `page` |
| `get_download_info` | 获取下载目录信息 | 无参数 |


## 项目结构

```
jm-mcp-server-ts/
├── src/
│   ├── jmcomic.ts           # 核心API客户端 (使用FFmpeg)
│   ├── simple-jm-downloader.ts  # 下载器封装
│   └── types.ts             # 类型定义
├── server/
│   └── index.ts             # MCP服务器主文件
├── downloads/               # 下载目录
├── test-mcp-client.js       # 测试客户端
├── op.yml                   # 配置文件
└── build/                   # 编译输出
```

## 技术栈

- **TypeScript** - 类型安全的JavaScript
- **@modelcontextprotocol/sdk** - MCP官方SDK
- **axios** - HTTP客户端
- **jimp** - 图像处理和解码
- **ffmpeg** - 图片格式转换 (WebP → JPG)
- **pdf-lib** - PDF生成
- **crypto-js** - 加密解密

## 平台兼容性

| 平台 | 状态 | 说明 |
|------|------|------|
| ✅ Windows | 完全支持 | 需要安装FFmpeg |
| ✅ macOS | 完全支持 | 需要安装FFmpeg |
| ✅ Linux | 完全支持 | 需要安装FFmpeg |
| ✅ Android (Termux) | 完全支持 | 使用FFmpeg代替webp-converter |

## 故障排除

### 常见问题

**1. WebP转换失败**
```bash
# 确保FFmpeg已正确安装
ffmpeg -version

# 检查FFmpeg是否在PATH中
which ffmpeg  # Linux/macOS
where ffmpeg  # Windows
```

**2. 下载失败**
- 检查网络连接
- 确认专辑ID是否正确
- 查看控制台日志了解详细错误信息

**3. 权限错误**
- 确保有写入downloads目录的权限
- 在Linux/macOS上可能需要调整目录权限

## 更新日志

### v1.2.0 (最新)
- ✅ 异步下载：下载任务在后台进行，避免MCP客户端超时
- ✅ Android优化：自动检测Termux环境，下载到手机正常存储空间
- ✅ 路径智能处理：自动展开~路径，支持~/storage/downloads

### v1.1.0
- ✅ 替换webp-converter为FFmpeg，解决Android ARM64兼容性
- ✅ 新增批量下载功能
- ✅ 新增下载目录管理
- ✅ 改进错误处理和日志输出
- ✅ 增加跨平台支持

### v1.0.0
- 🎉 初始版本发布
- ✅ 基础搜索和下载功能
- ✅ PDF转换功能

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 支持

如果这个项目对你有帮助，请给它一个⭐️！
