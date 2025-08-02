# JM Comic MCP Server (TypeScript版本)

基于Model Context Protocol的JM漫画服务器TypeScript实现，提供漫画搜索、下载和PDF转换功能。

## 功能特性

- 🔍 **漫画搜索**: 支持关键词搜索和高级筛选
- 📖 **专辑详情**: 获取漫画专辑的详细信息
- 📊 **排行榜**: 获取周排行、月排行和总排行
- 🏷️ **分类筛选**: 按分类、时间段和排序方式筛选漫画
- 📥 **漫画下载**: 下载漫画专辑到本地
- 📚 **PDF转换**: 将下载的图片转换为PDF格式
- ⚙️ **配置管理**: 支持YAML配置文件

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译项目

```bash
npm run build
```

### 3. 配置VS Code

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

### 4. 重启VS Code

配置完成后重启VS Code，即可在AI助手中使用JM漫画功能。

## 可用工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `search_comic` | 搜索漫画 | `query`, `order_by`, `time_period` |
| `get_album_details` | 获取专辑详情 | `album_id` |
| `download_comic_album` | 下载漫画专辑 | `album_id` |
| `convert_album_to_pdf_tool` | 转换为PDF | `album_id` |
| `get_ranking_list` | 获取排行榜 | `period` |
| `filter_comics_by_category` | 分类筛选 | `category`, `time`, `order_by` |

## 项目结构

```
jm-mcp-server-ts/
├── src/
│   ├── jmcomic.ts           # 核心API客户端
│   ├── simple-jm-downloader.ts  # 下载器封装
│   └── types.ts             # 类型定义
├── server/
│   └── index.ts             # MCP服务器主文件
├── downloads/               # 下载目录
├── op.yml                   # 配置文件
└── build/                   # 编译输出
```

## 技术栈

- **TypeScript** - 类型安全的JavaScript
- **@modelcontextprotocol/sdk** - MCP官方SDK
- **axios** - HTTP客户端
- **sharp** - 图像处理
- **pdf-lib** - PDF生成

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。
