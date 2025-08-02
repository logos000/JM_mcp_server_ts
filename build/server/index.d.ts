#!/usr/bin/env node
/**
 * JM Comic MCP Server (TypeScript版本)
 *
 * 这是一个基于Model Context Protocol的JM漫画服务器
 * 提供漫画搜索、下载和PDF转换功能
 *
 * 功能特性：
 * - 搜索漫画
 * - 获取专辑详情
 * - 获取排行榜
 * - 按分类筛选漫画
 * - 下载漫画专辑
 * - 转换图片为PDF
 */
interface Config {
    client?: {
        domain?: {
            api?: string[];
            html?: string[];
        };
        impl?: string;
    };
    dir_rule?: {
        base_dir?: string;
    };
    download?: {
        cache?: boolean;
        image?: {
            decode?: boolean;
            suffix?: string;
        };
        threading?: {
            batch_count?: number;
        };
    };
    plugins?: {
        after_init?: Array<{
            kwargs?: {
                password?: string;
                username?: string;
            };
            plugin?: string;
        }>;
    };
    headers?: {
        [key: string]: string;
    };
    proxy?: {
        http?: string;
        https?: string;
    };
}
declare class JmCryptoTool {
    /**
     * 生成token和tokenparam
     * @returns {object} 包含token和tokenparam的对象
     */
    static tokenAndTokenparam(): {
        token: string;
        tokenparam: string;
    };
    /**
     * 解密API响应数据
     * @param {string} responseData - 加密的响应数据
     * @param {string} timestamp - 时间戳
     * @returns {any} 解密后的数据
     */
    static decodeRespData(responseData: string, timestamp: string): any;
}
declare class JMClient {
    private config;
    private axiosInstance;
    private readonly API_SEARCH;
    private readonly API_CATEGORIES_FILTER;
    private readonly API_ALBUM;
    private readonly API_CHAPTER;
    private readonly API_SCRAMBLE;
    private readonly API_FAVORITE;
    constructor(config?: Config);
    private getApiBaseUrl;
    private appendParamsToUrl;
    private reqApi;
    private getMappedValue;
    searchComics(params: {
        query: string;
        page?: number;
        mainTag?: number;
        orderBy?: string;
        time?: string;
        category?: string;
    }): Promise<any>;
    getAlbumDetails(albumId: string): Promise<any>;
    getPhotoDetail(photoId: string): Promise<any>;
    private getPhotoDetailFromHTML;
    getRankingList(period?: string): Promise<any>;
    filterByCategory(params: {
        category?: string;
        time?: string;
        orderBy?: string;
        page?: number;
    }): Promise<any>;
}
export { JMClient, JmCryptoTool };
