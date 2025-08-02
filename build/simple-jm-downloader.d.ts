#!/usr/bin/env node
/**
 * 简化的JMComic下载器
 * 基于复制的原版代码，提供简单易用的下载接口
 * TypeScript版本，完全对应Python版本的逻辑
 */
import { AlbumInfo, DownloadResult } from './types';
/**
 * 简化的JM下载器包装类
 */
export declare class SimpleJMDownloader {
    private downloadDir;
    private option;
    private downloader;
    private client;
    /**
     * 初始化下载器
     *
     * @param downloadDir 下载目录路径
     */
    constructor(downloadDir?: string);
    /**
     * 获取下载目录路径
     *
     * @returns 下载目录路径
     */
    getDownloadDir(): string;
    /**
     * 获取本子信息
     *
     * @param albumId 本子ID
     * @returns 包含本子信息的字典
     */
    getAlbumInfo(albumId: string): Promise<AlbumInfo>;
    /**
     * 下载本子
     *
     * @param albumId 本子ID
     * @param confirm 是否需要确认下载
     * @returns 下载结果字典
     */
    downloadAlbum(albumId: string, confirm?: boolean): Promise<DownloadResult>;
    /**
     * 检查下载的文件 - 完全对应Python版本
     */
    private _checkDownloadedFiles;
    /**
     * 批量下载 - 完全对应Python版本
     *
     * @param albumIds 本子ID列表
     * @param confirmEach 是否每个都需要确认
     * @returns 下载结果列表
     */
    batchDownload(albumIds: string[], confirmEach?: boolean): Promise<DownloadResult[]>;
    /**
     * 询问用户确认
     */
    private askConfirmation;
}
