#!/usr/bin/env node
/**
 * 简化的JMComic下载器
 * 基于复制的原版代码，提供简单易用的下载接口
 * TypeScript版本，完全对应Python版本的逻辑
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { JmDownloaderImpl as JmDownloader, JmOptionImpl as JmOption, __version__ } from './jmcomic';
import { AlbumInfo, DownloadResult } from './types';

/**
 * 简化的JM下载器包装类
 */
export class SimpleJMDownloader {
    private downloadDir: string;
    private option: JmOption;
    private downloader: JmDownloader; 
    private client: any;

    /**
     * 初始化下载器
     * 
     * @param downloadDir 下载目录路径
     */
    constructor(downloadDir: string = "downloads") {
        // 处理 ~ 路径展开
        if (downloadDir.startsWith('~/')) {
            const homeDir = process.env.HOME || process.env.USERPROFILE || '';
            downloadDir = path.join(homeDir, downloadDir.slice(2));
        }
        this.downloadDir = path.resolve(downloadDir);
        
        // 创建下载目录
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }

        // 创建选项 - 完全对应Python的JmOption.default()
        this.option = JmOption.default();
        this.option.dirRule.baseDir = this.downloadDir;

        // 创建下载器 - 完全对应Python的JmDownloader(self.option)
        this.downloader = new JmDownloader(this.option);
        
        // 创建客户端 - 完全对应Python的self.option.build_jm_client()
        this.client = this.option.buildJmClient();

        console.log('✅ JM下载器初始化成功');
        console.log(`📁 下载目录: ${this.downloadDir}`);
        console.log(`🔗 JMComic版本: ${__version__}`);
    }

    /**
     * 获取下载目录路径
     * 
     * @returns 下载目录路径
     */
    getDownloadDir(): string {
        return this.downloadDir;
    }

    /**
     * 搜索漫画
     * 
     * @param params 搜索参数
     * @returns 搜索结果
     */
    async searchComics(params: {
        query: string;
        page?: number;
        mainTag?: number;
        orderBy?: string;
        time?: string;
    }): Promise<any> {
        try {
            console.log(`🔍 搜索漫画: ${params.query}`);
            return await this.client.searchComics(params);
        } catch (error: any) {
            console.error(`搜索失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 按分类筛选漫画
     * 
     * @param params 筛选参数
     * @returns 筛选结果
     */
    async filterByCategory(params: {
        category?: string;
        time?: string;
        orderBy?: string;
        page?: number;
    }): Promise<any> {
        try {
            console.log(`📂 分类筛选: ${params.category || 'all'}`);
            return await this.client.filterByCategory(params);
        } catch (error: any) {
            console.error(`分类筛选失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取排行榜（基于分类筛选实现）
     * 
     * @param period 时间周期
     * @returns 排行榜结果
     */
    async getRankingList(period: string = 'week'): Promise<any> {
        try {
            console.log(`🏆 获取排行榜: ${period}`);
            const result = await this.client.filterByCategory({
                category: 'all',
                time: period,
                orderBy: 'view',
                page: 1
            });
            // 返回前10个结果作为排行榜
            return result.results ? result.results.slice(0, 10) : [];
        } catch (error: any) {
            console.error(`获取排行榜失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取本子信息
     * 
     * @param albumId 本子ID
     * @returns 包含本子信息的字典
     */
    async getAlbumInfo(albumId: string): Promise<AlbumInfo> {
        try {
            // 完全对应Python: album = self.client.get_album_detail(album_id)
            const album = await this.client.getAlbumDetail(albumId);

            const info: AlbumInfo = {
                id: album.id,
                title: album.title,
                author: album.author,
                chapterCount: album.length,
                pageCount: album.pageCount,
                tags: album.tags || [],
                success: true
            };

            // 获取章节详情 - 完全对应Python逻辑
            if (album.length > 0) {
                try {
                    // 完全对应Python: first_chapter = album[0]
                    const firstChapter = album.episodeList[0];
                    
                    // 完全对应Python: chapter_detail = self.client.get_photo_detail(first_chapter.id, True)
                    const chapterDetail = await this.client.getPhotoDetail(firstChapter.id, true);
                    
                    info.firstChapter = {
                        id: chapterDetail.id,
                        title: chapterDetail.title,
                        imageCount: chapterDetail.length,
                        sampleImages: Array.from({ length: Math.min(3, chapterDetail.length) }, 
                            (_, i) => `sample_image_${i + 1}.jpg`)
                    };
                } catch (e: any) {
                    console.log(`⚠️ 获取章节详情失败: ${e.message}`);
                    info.firstChapter = null;
                }
            }

            return info;

        } catch (e: any) {
            return {
                id: albumId,
                title: '',
                author: '',
                chapterCount: 0,
                pageCount: 0,
                tags: [],
                error: e.message,
                success: false
            };
        }
    }

    /**
     * 下载本子
     * 
     * @param albumId 本子ID
     * @param confirm 是否需要确认下载
     * @returns 下载结果字典
     */
    async downloadAlbum(albumId: string, confirm: boolean = false): Promise<DownloadResult> {
        try {
            // 先获取信息 - 完全对应Python
            console.log(`📖 获取本子信息: ${albumId}`);
            const info = await this.getAlbumInfo(albumId);

            if (!info.success) {
                return {
                    success: false,
                    albumId: albumId,
                    error: info.error
                };
            }

            // 显示本子信息 - 完全对应Python
            console.log('✅ 本子信息:');
            console.log(`   标题: ${info.title}`);
            console.log(`   作者: ${info.author}`);
            console.log(`   章节数: ${info.chapterCount}`);

            if (info.firstChapter) {
                console.log(`   图片数: ${info.firstChapter.imageCount}`);
            }

            // 确认下载 - 完全对应Python
            if (confirm) {
                const confirmInput = await this.askConfirmation(`\n是否下载本子 ${albumId}? (y/N): `);
                if (confirmInput.toLowerCase() !== 'y') {
                    return { success: false, message: '用户取消下载' };
                }
            }

            // 开始下载 - 完全对应Python: result = self.downloader.download_album(album_id)
            console.log(`📥 开始下载本子: ${albumId}`);
            const result = await this.downloader.downloadAlbum(albumId);

            // 检查下载结果 - 完全对应Python
            const downloadedFiles = this._checkDownloadedFiles(info.title);

            return {
                success: true,
                albumId: albumId,
                title: info.title,
                author: info.author,
                downloadedFiles: downloadedFiles,
                result: result.toString()
            };

        } catch (e: any) {
            return {
                success: false,
                albumId: albumId,
                error: e.message
            };
        }
    }

    /**
     * 检查下载的文件 - 完全对应Python版本
     */
    private _checkDownloadedFiles(title: string): {
        directory: string | null;
        fileCount: number;
        files: string[];
    } {
        try {
            const albumDir = path.join(this.downloadDir, title);
            if (fs.existsSync(albumDir) && fs.statSync(albumDir).isDirectory()) {
                const files = fs.readdirSync(albumDir);
                return {
                    directory: albumDir,
                    fileCount: files.length,
                    files: files.slice(0, 10) // 只显示前10个文件名
                };
            }
            return { directory: null, fileCount: 0, files: [] };
        } catch (e: any) {
            return { directory: null, fileCount: 0, files: [] };
        }
    }

    /**
     * 批量下载 - 完全对应Python版本
     * 
     * @param albumIds 本子ID列表
     * @param confirmEach 是否每个都需要确认
     * @returns 下载结果列表
     */
    async batchDownload(albumIds: string[], confirmEach: boolean = false): Promise<DownloadResult[]> {
        const results: DownloadResult[] = [];

        console.log(`📦 开始批量下载 ${albumIds.length} 个本子`);

        for (let i = 0; i < albumIds.length; i++) {
            const albumId = albumIds[i];
            console.log(`\n[${i + 1}/${albumIds.length}] 处理本子: ${albumId}`);
            const result = await this.downloadAlbum(albumId, confirmEach);
            results.push(result);

            if (result.success) {
                console.log(`✅ 下载成功: ${result.title}`);
            } else {
                console.log(`❌ 下载失败: ${result.error || 'Unknown error'}`);
            }
        }

        // 统计结果 - 完全对应Python版本
        const successCount = results.filter(r => r.success).length;
        console.log('\n📊 批量下载完成:');
        console.log(`   成功: ${successCount}`);
        console.log(`   失败: ${albumIds.length - successCount}`);
        console.log(`   总计: ${albumIds.length}`);

        return results;
    }

    /**
     * 询问用户确认
     */
    private async askConfirmation(question: string): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(question, answer => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
}

/**
 * 命令行入口 - 完全对应Python版本的main()函数
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('用法:');
        console.log('  npx ts-node simple-jm-downloader.ts <本子ID>');
        console.log('  npx ts-node simple-jm-downloader.ts <本子ID1> <本子ID2> ...');
        console.log('');
        console.log('示例:');
        console.log('  npx ts-node simple-jm-downloader.ts 302471');
        console.log('  npx ts-node simple-jm-downloader.ts 302471 123456 789012');
        return;
    }

    const albumIds = args;

    try {
        // 创建下载器 - 完全对应Python版本
        const downloader = new SimpleJMDownloader("downloads_simple");

        if (albumIds.length === 1) {
            // 单个下载 - 默认不需要确认
            const result = await downloader.downloadAlbum(albumIds[0], false);
            if (result.success && result.downloadedFiles) {
                console.log('\n🎉 下载完成!');
                console.log(`文件位置: ${result.downloadedFiles.directory}`);
                console.log(`文件数量: ${result.downloadedFiles.fileCount}`);
            } else {
                console.log(`\n❌ 下载失败: ${result.error || 'Unknown error'}`);
            }
        } else {
            // 批量下载
            const results = await downloader.batchDownload(albumIds, false);

            // 显示成功下载的文件
            const successfulDownloads = results.filter(r => r.success);
            if (successfulDownloads.length > 0) {
                console.log('\n📁 成功下载的文件:');
                for (const result of successfulDownloads) {
                    if (result.downloadedFiles) {
                        console.log(`  📂 ${result.title} (${result.downloadedFiles.fileCount} 个文件)`);
                    }
                }
            }
        }

    } catch (e: any) {
        if (e.message && e.message.includes('SIGINT')) {
            console.log('\n\n⏹️ 用户中断下载');
        } else {
            console.log(`\n❌ 运行失败: ${e.message}`);
            console.error(e.stack);
        }
    }
}

// 如果这个文件是直接运行的，执行main函数
if (require.main === module) {
    main().catch(console.error);
} 