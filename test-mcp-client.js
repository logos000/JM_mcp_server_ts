#!/usr/bin/env node

/**
 * 简单的 MCP 客户端测试脚本
 * 用于测试 JM Comic MCP 服务器的下载功能
 */

const { spawn } = require('child_process');
const readline = require('readline');

class MCPClient {
  constructor() {
    this.serverProcess = null;
    this.requestId = 1;
  }

  // 启动 MCP 服务器
  startServer() {
    console.log('🚀 启动 MCP 服务器...');
    
    this.serverProcess = spawn('node', ['build/server/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    this.serverProcess.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('📥 服务器响应:', JSON.stringify(response, null, 2));
        
        // 如果是初始化响应，发送工具列表请求
        if (response.result && response.result.protocolVersion && response.id === 1) {
          console.log('🔧 初始化成功，请求工具列表...');
          this.sendRequest({
            jsonrpc: "2.0",
            id: this.requestId++,
            method: "tools/list",
            params: {}
          });
        }
      } catch (error) {
        console.log('📥 服务器输出:', data.toString());
      }
    });

    this.serverProcess.on('error', (error) => {
      console.error('❌ 服务器错误:', error);
    });

    this.serverProcess.on('close', (code) => {
      console.log(`🔌 服务器已关闭，退出码: ${code}`);
    });

    // 发送初始化请求
    setTimeout(() => {
      this.sendRequest({
        jsonrpc: "2.0",
        id: this.requestId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0"
          }
        }
      });
    }, 1000);
  }

  // 发送请求到服务器
  sendRequest(request) {
    const requestStr = JSON.stringify(request) + '\n';
    console.log('📤 发送请求:', JSON.stringify(request, null, 2));
    this.serverProcess.stdin.write(requestStr);
  }

  // 下载单个专辑
  downloadAlbum(albumId, convertToPdf = false) {
    this.sendRequest({
      jsonrpc: "2.0",
      id: this.requestId++,
      method: "tools/call",
      params: {
        name: "download_comic_album",
        arguments: {
          album_id: albumId,
          convert_to_pdf: convertToPdf
        }
      }
    });
  }

  // 批量下载专辑
  batchDownload(albumIds, convertToPdf = false) {
    this.sendRequest({
      jsonrpc: "2.0", 
      id: this.requestId++,
      method: "tools/call",
      params: {
        name: "batch_download_albums",
        arguments: {
          album_ids: albumIds,
          convert_to_pdf: convertToPdf
        }
      }
    });
  }

  // 搜索漫画
  searchComic(query, page = 1) {
    this.sendRequest({
      jsonrpc: "2.0",
      id: this.requestId++,
      method: "tools/call", 
      params: {
        name: "search_comic",
        arguments: {
          query: query,
          page: page,
          order_by: "view"
        }
      }
    });
  }

  // 获取专辑信息
  getAlbumInfo(albumId) {
    this.sendRequest({
      jsonrpc: "2.0",
      id: this.requestId++,
      method: "tools/call",
      params: {
        name: "get_album_info_enhanced", 
        arguments: {
          album_id: albumId
        }
      }
    });
  }

  // 关闭服务器
  close() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// 主函数
async function main() {
  const client = new MCPClient();
  client.startServer();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🎮 MCP 客户端已启动！可用命令:');
  console.log('  download <album_id>                    - 下载专辑');
  console.log('  download <album_id> pdf                - 下载专辑并转换为PDF');
  console.log('  batch <id1,id2,id3>                   - 批量下载');
  console.log('  batch <id1,id2,id3> pdf               - 批量下载并转换为PDF');
  console.log('  search <关键词>                        - 搜索漫画');
  console.log('  info <album_id>                       - 获取专辑信息');
  console.log('  quit                                  - 退出');
  console.log('');

  const processCommand = (input) => {
    const parts = input.trim().split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'download':
        if (parts.length >= 2) {
          const albumId = parts[1];
          const convertToPdf = parts[2] === 'pdf';
          console.log(`📥 下载专辑 ${albumId}${convertToPdf ? ' (转换为PDF)' : ''}`);
          client.downloadAlbum(albumId, convertToPdf);
        } else {
          console.log('❌ 用法: download <album_id> [pdf]');
        }
        break;

      case 'batch':
        if (parts.length >= 2) {
          const albumIds = parts[1].split(',').map(id => id.trim());
          const convertToPdf = parts[2] === 'pdf';
          console.log(`📥 批量下载专辑 ${albumIds.join(', ')}${convertToPdf ? ' (转换为PDF)' : ''}`);
          client.batchDownload(albumIds, convertToPdf);
        } else {
          console.log('❌ 用法: batch <id1,id2,id3> [pdf]');
        }
        break;

      case 'search':
        if (parts.length >= 2) {
          const query = parts.slice(1).join(' ');
          console.log(`🔍 搜索: ${query}`);
          client.searchComic(query);
        } else {
          console.log('❌ 用法: search <关键词>');
        }
        break;

      case 'info':
        if (parts.length >= 2) {
          const albumId = parts[1];
          console.log(`📋 获取专辑信息: ${albumId}`);
          client.getAlbumInfo(albumId);
        } else {
          console.log('❌ 用法: info <album_id>');
        }
        break;

      case 'quit':
      case 'exit':
        console.log('👋 再见！');
        client.close();
        rl.close();
        process.exit(0);
        break;

      default:
        console.log('❌ 未知命令。输入 help 查看帮助。');
        break;
    }
  };

  rl.on('line', processCommand);

  // 处理 Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n👋 收到中断信号，正在关闭...');
    client.close();
    rl.close();
    process.exit(0);
  });
}

main().catch(console.error); 