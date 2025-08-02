#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JmCryptoTool = exports.JMClient = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const jimp = require('jimp');
const Jimp = jimp.Jimp;
const crypto_js_1 = __importDefault(require("crypto-js"));
const pdf_lib_1 = require("pdf-lib");
const simple_jm_downloader_js_1 = require("../src/simple-jm-downloader.js");
// 创建服务器实例
const server = new mcp_js_1.McpServer({
    name: "jm-comic-server-ts",
    version: "1.0.0",
    description: "JM漫画下载和PDF转换服务器（TypeScript版本）",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// JM常量定义
const JM_CONSTANTS = {
    ORDER_BY: {
        LATEST: 'mr', // 最新
        VIEW: 'mv', // 浏览
        PICTURE: 'mp', // 图片
        LIKE: 'tf' // 喜欢
    },
    TIME: {
        TODAY: 't', // 今天
        WEEK: 'w', // 本周
        MONTH: 'm', // 本月
        ALL: 'a' // 全部
    },
    CATEGORY: {
        ALL: '0', // 全部
        DOUJIN: 'doujin', // 同人
        SINGLE: 'single', // 单本
        SHORT: 'short', // 短篇
        ANOTHER: 'another', // 另类
        HANMAN: 'hanman', // 韩漫
        MEIMAN: 'meiman', // 美漫
        DOUJIN_COSPLAY: 'doujin_cosplay', // 同人COS
        '3D': '3D', // 3D
        ENGLISH_SITE: 'english_site' // 英文站
    },
    // 加解密常量
    APP_TOKEN_SECRET: '18comicAPP',
    APP_TOKEN_SECRET_2: '18comicAPPContent',
    APP_DATA_SECRET: '185Hcomic3PAPP7R',
    APP_VERSION: '1.8.0'
};
// 加密解密工具类
class JmCryptoTool {
    /**
     * 生成token和tokenparam
     * @returns {object} 包含token和tokenparam的对象
     */
    static tokenAndTokenparam() {
        const timestamp = Math.floor(Date.now() / 1000);
        // token = md5(timestamp + APP_TOKEN_SECRET)
        const tokenStr = timestamp + JM_CONSTANTS.APP_TOKEN_SECRET;
        const token = crypto_js_1.default.MD5(tokenStr).toString();
        // tokenparam = "timestamp,version"
        const tokenparam = `${timestamp},${JM_CONSTANTS.APP_VERSION}`;
        return { token, tokenparam };
    }
    /**
     * 解密API响应数据
     * @param {string} responseData - 加密的响应数据
     * @param {string} timestamp - 时间戳
     * @returns {any} 解密后的数据
     */
    static decodeRespData(responseData, timestamp) {
        try {
            // 生成解密密钥: md5(timestamp + APP_DATA_SECRET)
            const keyStr = timestamp + JM_CONSTANTS.APP_DATA_SECRET;
            const key = crypto_js_1.default.MD5(keyStr).toString();
            // Base64解码
            const encryptedData = crypto_js_1.default.enc.Base64.parse(responseData);
            // AES-ECB解密
            const decrypted = crypto_js_1.default.AES.decrypt({ ciphertext: encryptedData }, crypto_js_1.default.enc.Utf8.parse(key), { mode: crypto_js_1.default.mode.ECB, padding: crypto_js_1.default.pad.Pkcs7 });
            // 转换为字符串
            const decryptedStr = decrypted.toString(crypto_js_1.default.enc.Utf8);
            // 解析JSON
            return JSON.parse(decryptedStr);
        }
        catch (error) {
            console.error('解密响应数据失败:', error);
            throw new Error(`解密失败: ${error}`);
        }
    }
}
exports.JmCryptoTool = JmCryptoTool;
// 参数映射
const PARAM_MAPPINGS = {
    order: {
        'latest': JM_CONSTANTS.ORDER_BY.LATEST,
        'view': JM_CONSTANTS.ORDER_BY.VIEW,
        'picture': JM_CONSTANTS.ORDER_BY.PICTURE,
        'like': JM_CONSTANTS.ORDER_BY.LIKE
    },
    time: {
        'today': JM_CONSTANTS.TIME.TODAY,
        'week': JM_CONSTANTS.TIME.WEEK,
        'month': JM_CONSTANTS.TIME.MONTH,
        'all': JM_CONSTANTS.TIME.ALL
    },
    category: {
        'all': JM_CONSTANTS.CATEGORY.ALL,
        'doujin': JM_CONSTANTS.CATEGORY.DOUJIN,
        'single': JM_CONSTANTS.CATEGORY.SINGLE,
        'short': JM_CONSTANTS.CATEGORY.SHORT,
        'another': JM_CONSTANTS.CATEGORY.ANOTHER,
        'hanman': JM_CONSTANTS.CATEGORY.HANMAN,
        'meiman': JM_CONSTANTS.CATEGORY.MEIMAN,
        'doujin_cosplay': JM_CONSTANTS.CATEGORY.DOUJIN_COSPLAY,
        '3d': JM_CONSTANTS.CATEGORY['3D'],
        'english_site': JM_CONSTANTS.CATEGORY.ENGLISH_SITE
    }
};
// 配置管理类
class ConfigManager {
    config = {};
    configPath = 'op.yml';
    constructor() {
        this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                this.config = yaml.load(configData) || {};
                // 检查是否在Android/termux环境，如果是且下载目录不正确，则强制更新
                if (this.isRunningOnAndroidTermux()) {
                    const currentBaseDir = this.config.dir_rule?.base_dir;
                    if (currentBaseDir !== '~/storage/downloads') {
                        console.log('[配置] 检测到Android/Termux环境，强制更新下载目录为: ~/storage/downloads');
                        if (!this.config.dir_rule) {
                            this.config.dir_rule = {};
                        }
                        this.config.dir_rule.base_dir = '~/storage/downloads';
                        this.saveConfig();
                    }
                }
            }
            else {
                this.config = this.getDefaultConfig();
                this.saveConfig();
            }
        }
        catch (error) {
            console.error('配置文件加载失败:', error);
            this.config = this.getDefaultConfig();
        }
    }
    isRunningOnAndroidTermux() {
        try {
            console.log('[检测] 当前工作目录:', process.cwd());
            console.log('[检测] HOME环境变量:', process.env.HOME);
            console.log('[检测] PREFIX环境变量:', process.env.PREFIX);
            console.log('[检测] TERMUX_VERSION环境变量:', process.env.TERMUX_VERSION);
            // 检查环境变量
            if (process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux')) {
                console.log('[检测] 通过环境变量检测到Termux');
                return true;
            }
            // 检查当前工作目录是否在termux路径下
            const cwd = process.cwd();
            if (cwd.includes('/data/data/com.termux/files')) {
                console.log('[检测] 通过工作目录检测到Termux');
                return true;
            }
            // 检查是否存在termux特有的目录
            const homeStoragePath = process.env.HOME ? path.join(process.env.HOME, 'storage') : '';
            if (fs.existsSync('/data/data/com.termux')) {
                console.log('[检测] 通过/data/data/com.termux目录检测到Termux');
                return true;
            }
            if (homeStoragePath && fs.existsSync(homeStoragePath)) {
                console.log('[检测] 通过~/storage目录检测到Termux');
                return true;
            }
            console.log('[检测] 未检测到Termux环境');
            return false;
        }
        catch (error) {
            console.log('检测Android/termux环境时出错:', error);
            return false;
        }
    }
    getDefaultConfig() {
        // 检测是否运行在Android/termux环境
        const isAndroidTermux = this.isRunningOnAndroidTermux();
        const defaultDownloadDir = isAndroidTermux ? '~/storage/downloads' : 'C:/Users/Cielo/Downloads';
        if (isAndroidTermux) {
            console.log('[配置] 检测到Android/Termux环境，使用下载目录:', defaultDownloadDir);
        }
        else {
            console.log('[配置] 使用默认下载目录:', defaultDownloadDir);
        }
        return {
            client: {
                domain: {
                    api: [
                        'api.jmapiproxy1.cc',
                        'api.jmapiproxy2.cc',
                        'api.jmapiproxy3.cc',
                        'api.jmapiproxy4.cc'
                    ],
                    html: [
                        '18comic.vip',
                        '18comic.org'
                    ]
                },
                impl: 'api'
            },
            dir_rule: {
                base_dir: defaultDownloadDir
            },
            download: {
                cache: true,
                image: {
                    decode: true,
                    suffix: '.jpg'
                },
                threading: {
                    batch_count: 45
                }
            },
            plugins: {
                after_init: [
                    {
                        kwargs: {
                            password: 'your_password',
                            username: 'your_username'
                        },
                        plugin: 'login'
                    }
                ]
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
            }
        };
    }
    saveConfig() {
        try {
            const yamlStr = yaml.dump(this.config);
            fs.writeFileSync(this.configPath, yamlStr, 'utf8');
        }
        catch (error) {
            console.error('配置文件保存失败:', error);
        }
    }
    getConfig() {
        return this.config;
    }
    updateStoragePath(storagePath) {
        if (!this.config.dir_rule) {
            this.config.dir_rule = {};
        }
        this.config.dir_rule.base_dir = storagePath;
        this.saveConfig();
        console.log(`已更新存储路径: ${storagePath}`);
    }
    getStoragePath() {
        let basePath = this.config.dir_rule?.base_dir;
        // 如果没有配置，使用默认值
        if (!basePath) {
            basePath = this.isRunningOnAndroidTermux() ? '~/storage/downloads' : 'C:/Users/Cielo/Downloads';
        }
        // 处理 ~ 路径展开
        if (basePath.startsWith('~/')) {
            const homeDir = process.env.HOME || process.env.USERPROFILE || '';
            if (homeDir) {
                basePath = path.join(homeDir, basePath.slice(2));
            }
        }
        console.log('[配置] 最终下载路径:', basePath);
        return basePath;
    }
}
// JM客户端类 - 基于移动端API实现
class JMClient {
    config;
    axiosInstance;
    // 移动端API端点
    API_SEARCH = '/search';
    API_CATEGORIES_FILTER = '/categories/filter';
    API_ALBUM = '/album';
    API_CHAPTER = '/chapter';
    API_SCRAMBLE = '/chapter_view_template';
    API_FAVORITE = '/favorite';
    constructor(config) {
        this.config = config || {
            headers: {
                'User-Agent': 'okhttp/4.9.0'
            },
            client: {
                domain: {
                    api: ['www.cdnmhws.cc'] // 使用Python源码中的域名
                }
            }
        };
        this.axiosInstance = axios_1.default.create({
            headers: {
                ...this.config.headers,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }
    // 获取API基础URL
    getApiBaseUrl() {
        const apiDomains = this.config.client?.domain?.api || ['www.cdnmhws.cc'];
        return `https://${apiDomains[0]}`;
    }
    // 构建API URL，添加参数
    appendParamsToUrl(url, params) {
        const urlObj = new URL(url, this.getApiBaseUrl());
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                urlObj.searchParams.set(key, String(value));
            }
        });
        return urlObj.toString();
    }
    // 发送API请求
    async reqApi(url, params) {
        try {
            const fullUrl = params ? this.appendParamsToUrl(url, params) : `${this.getApiBaseUrl()}${url}`;
            console.log(`[API请求] URL: ${fullUrl}`);
            // 生成token和tokenparam
            const { token, tokenparam } = JmCryptoTool.tokenAndTokenparam();
            // 提取时间戳用于解密
            const timestamp = tokenparam.split(',')[0];
            // 模拟移动端APP的请求头
            const headers = {
                'User-Agent': 'JMComic/1.6.0 (iPhone; iOS 14.6; Scale/3.00)',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'token': token,
                'tokenparam': tokenparam,
                'Cookie': 'session=default; _ga=GA1.1.123456789.1234567890',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...this.config.headers
            };
            console.log(`[加密信息] Token: ${token}, Tokenparam: ${tokenparam}`);
            const response = await this.axiosInstance.get(fullUrl, {
                headers: headers,
                timeout: 30000,
                validateStatus: (status) => status < 500 // 允许4xx错误返回
            });
            console.log(`[API响应] Status: ${response.status}, Data type: ${typeof response.data}`);
            // 处理API响应
            if (response.data && typeof response.data === 'object') {
                // 检查是否是加密响应格式 { code: 200, data: "encrypted_string" }
                if (response.data.code === 200 && typeof response.data.data === 'string') {
                    console.log(`[API成功] 收到加密数据，开始解密...`);
                    try {
                        // 解密数据
                        const decryptedData = JmCryptoTool.decodeRespData(response.data.data, timestamp);
                        console.log(`[解密成功] 解密后数据:`, JSON.stringify(decryptedData, null, 2).substring(0, 500));
                        return decryptedData;
                    }
                    catch (decryptError) {
                        console.error(`[解密失败]`, decryptError);
                        throw new Error(`数据解密失败: ${decryptError}`);
                    }
                }
                // 直接返回的JSON数据（如搜索结果）
                else if (response.data.content !== undefined || response.data.total !== undefined || response.data.list !== undefined) {
                    console.log(`[API成功] 直接JSON数据:`, JSON.stringify(response.data, null, 2).substring(0, 500));
                    return response.data;
                }
                // 错误响应
                else if (response.data.code && response.data.code !== 200) {
                    console.log(`[API错误] 服务器返回错误:`, response.data);
                    throw new Error(`API服务器错误: ${response.data.errorMsg || response.data.message || 'Unknown error'}`);
                }
                // 其他格式
                else {
                    console.log(`[API响应] 完整数据:`, JSON.stringify(response.data, null, 2).substring(0, 1000));
                    return response.data;
                }
            }
            throw new Error(`Invalid API response format: ${JSON.stringify(response.data)}`);
        }
        catch (error) {
            console.error(`[API错误] ${error}`);
            if (axios_1.default.isAxiosError(error)) {
                console.error(`[API错误详情] Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
            }
            throw new Error(`API request failed: ${error}`);
        }
    }
    getMappedValue(paramType, userValue, defaultKey = 'latest') {
        const mapping = PARAM_MAPPINGS[paramType] || {};
        // 对于order类型，默认值是latest
        if (paramType === 'order') {
            return mapping[userValue.toLowerCase()] || mapping['latest'] || mapping[Object.keys(mapping)[0]] || '';
        }
        // 对于其他类型，使用传入的默认键
        return mapping[userValue.toLowerCase()] || mapping[defaultKey] || mapping[Object.keys(mapping)[0]] || '';
    }
    // 搜索漫画 - 基于移动端API
    async searchComics(params) {
        const { query, page = 1, mainTag = 0, orderBy = 'view', time = 'all', category = 'all' } = params;
        const orderValue = this.getMappedValue('order', orderBy, 'view');
        const timeValue = this.getMappedValue('time', time, 'all');
        try {
            // 使用Python中相同的参数名和格式
            const apiParams = {
                main_tag: mainTag,
                search_query: query,
                page,
                o: orderValue, // Python使用 'o' 参数
                t: timeValue, // Python使用 't' 参数
            };
            console.log(`[搜索] 参数:`, apiParams);
            const data = await this.reqApi(this.API_SEARCH, apiParams);
            // 处理直接重定向到专辑的情况（搜索车号时发生）
            if (data.redirect_aid) {
                const album = await this.getAlbumDetails(data.redirect_aid);
                return {
                    search_params: {
                        query,
                        page,
                        main_tag: mainTag,
                        order_by: orderBy,
                        time_period: time,
                        category
                    },
                    constants_used: {
                        order_by: orderValue,
                        time: timeValue,
                        category: 'all'
                    },
                    results: [{
                            id: album.id,
                            title: album.title
                        }],
                    total_results: 1,
                    is_single_album: true,
                    single_album: album
                };
            }
            // 处理正常搜索结果
            const results = [];
            if (data.content && Array.isArray(data.content)) {
                data.content.forEach((item) => {
                    if (item && typeof item === 'object') {
                        const id = item.id || item.album_id;
                        const name = item.name || item.title;
                        if (id && name) {
                            results.push({
                                id: String(id),
                                title: name
                            });
                        }
                    }
                });
            }
            return {
                search_params: {
                    query,
                    page,
                    main_tag: mainTag,
                    order_by: orderBy,
                    time_period: time,
                    category
                },
                constants_used: {
                    order_by: orderValue,
                    time: timeValue,
                    category: 'all'
                },
                results: results.slice(0, 20), // 限制20个结果
                total_results: results.length,
                total: data.total || 0,
                page_count: Math.ceil((data.total || 0) / 20)
            };
        }
        catch (error) {
            throw new Error(`搜索失败: ${error}`);
        }
    }
    // 获取专辑详情 - 基于移动端API
    async getAlbumDetails(albumId) {
        try {
            const data = await this.reqApi(this.API_ALBUM, { id: albumId });
            if (!data || !data.name) {
                throw new Error(`Album ${albumId} not found`);
            }
            return {
                id: String(data.id || albumId),
                title: data.name || '',
                author: Array.isArray(data.author) ? data.author.join(', ') : (data.author || ''),
                tags: Array.isArray(data.tags) ? data.tags : [],
                description: data.description || '',
                views: data.total_views || '0',
                likes: data.likes || '0',
                comment_count: parseInt(data.comment_total || '0'),
                works: Array.isArray(data.works) ? data.works : [],
                actors: Array.isArray(data.actors) ? data.actors : [],
                page_count: data.page_count || 0,
                pub_date: data.pub_date || '',
                update_date: data.update_date || '',
                series_id: data.series_id || '0',
                related_list: Array.isArray(data.related_list) ? data.related_list : [],
                images: Array.isArray(data.images) ? data.images : []
            };
        }
        catch (error) {
            throw new Error(`获取专辑详情失败: ${error}`);
        }
    }
    // 获取章节详情
    async getPhotoDetail(photoId) {
        try {
            console.log(`[API请求] 获取章节详情: ${photoId}`);
            // 使用已有的reqApi方法
            const data = await this.reqApi('/photo', { id: photoId });
            console.log(`[解密成功] 章节详情:`, JSON.stringify(data, null, 2));
            // 检查返回的错误信息
            if (data.errorMsg && data.errorMsg !== '') {
                console.log(`[Photo API] 返回错误: ${data.errorMsg}`);
                // 如果是"Not legal.photo"错误，尝试HTML方式获取
                if (data.errorMsg.includes('Not legal.photo')) {
                    console.log(`[Photo API] API方式失败，尝试HTML方式获取章节详情`);
                    return await this.getPhotoDetailFromHTML(photoId);
                }
            }
            return data;
        }
        catch (error) {
            console.error(`[错误] API方式获取章节详情失败:`, error);
            // 如果API方式失败，尝试HTML方式
            console.log(`[Photo API] API方式异常，尝试HTML方式获取章节详情`);
            try {
                return await this.getPhotoDetailFromHTML(photoId);
            }
            catch (htmlError) {
                console.error(`[错误] HTML方式也失败:`, htmlError);
                throw error; // 抛出原始错误
            }
        }
    }
    // 从HTML页面获取章节详情
    async getPhotoDetailFromHTML(photoId) {
        try {
            console.log(`[HTML方式] 获取章节 ${photoId} 的详情`);
            // 尝试访问章节页面
            const photoUrl = `https://www.cdnmhws.cc/photo/${photoId}/`;
            const response = await axios_1.default.get(photoUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }
            const html = String(response.data);
            console.log(`[HTML方式] 成功获取HTML页面，长度: ${html.length}`);
            // 从HTML中提取图片信息
            const pageArrMatch = html.match(/var page_arr = (.*?);/);
            const domainMatch = html.match(/data-original-domain="(.*?)"/);
            const scrambleIdMatch = html.match(/var scramble_id = (\d+);/);
            let pageArr = [];
            let domain = 'cdn-msp.18comicapps.com';
            let scrambleId = '';
            if (pageArrMatch) {
                try {
                    pageArr = JSON.parse(pageArrMatch[1]);
                    console.log(`[HTML方式] 提取到 page_arr:`, pageArr);
                }
                catch (e) {
                    console.log(`[HTML方式] 解析 page_arr 失败:`, e);
                }
            }
            if (domainMatch) {
                domain = domainMatch[1];
                console.log(`[HTML方式] 提取到域名:`, domain);
            }
            if (scrambleIdMatch) {
                scrambleId = scrambleIdMatch[1];
                console.log(`[HTML方式] 提取到 scramble_id:`, scrambleId);
            }
            // 如果没有找到page_arr，尝试从图片标签中提取
            if (pageArr.length === 0) {
                console.log(`[HTML方式] 未找到page_arr，尝试从img标签提取图片信息`);
                // 查找所有图片标签
                const imgMatches = html.match(/<img[^>]+data-original="[^"]*"[^>]*>/g);
                if (imgMatches) {
                    for (const imgTag of imgMatches) {
                        const srcMatch = imgTag.match(/data-original="[^"]*\/([^\/]+\.(jpg|jpeg|png|webp|gif))"/);
                        if (srcMatch) {
                            pageArr.push(srcMatch[1]);
                        }
                    }
                    console.log(`[HTML方式] 从img标签提取到图片:`, pageArr);
                }
            }
            return {
                page_arr: pageArr,
                images: pageArr, // 兼容性字段
                data_original_domain: domain,
                scramble_id: scrambleId,
                source: 'html'
            };
        }
        catch (error) {
            console.error(`[HTML方式] 获取章节详情失败:`, error);
            // 返回空的响应对象而不是抛出异常
            return {
                page_arr: [],
                images: [],
                data_original_domain: 'cdn-msp.18comicapps.com',
                error: `HTML方式失败: ${error instanceof Error ? error.message : String(error)}`,
                source: 'html_failed'
            };
        }
    }
    // 获取排行榜 - 基于分类筛选API实现
    async getRankingList(period = 'week') {
        try {
            let timeValue = '';
            let orderValue = JM_CONSTANTS.ORDER_BY.VIEW; // 排行榜按观看数排序
            switch (period.toLowerCase()) {
                case 'week':
                    timeValue = JM_CONSTANTS.TIME.WEEK;
                    break;
                case 'month':
                    timeValue = JM_CONSTANTS.TIME.MONTH;
                    break;
                case 'all':
                    timeValue = JM_CONSTANTS.TIME.ALL;
                    break;
                default:
                    timeValue = JM_CONSTANTS.TIME.WEEK;
            }
            // 使用分类筛选API实现排行榜
            const result = await this.filterByCategory({
                category: 'all',
                time: period,
                orderBy: 'view', // 排行榜按观看数排序
                page: 1
            });
            // 返回前10个结果
            return result.results ? result.results.slice(0, 10) : [];
        }
        catch (error) {
            throw new Error(`获取排行榜失败: ${error}`);
        }
    }
    // 按分类筛选 - 基于移动端API
    async filterByCategory(params) {
        const { category = 'all', time = 'all', orderBy = 'view', page = 1 } = params;
        const categoryValue = this.getMappedValue('category', category, 'all');
        const timeValue = this.getMappedValue('time', time, 'all');
        const orderValue = this.getMappedValue('order', orderBy, 'view');
        try {
            // 移动端API的分类筛选，按照Python实现
            // o参数格式: 如果time不是'all'，则为 orderBy_time，否则只是orderBy
            const o = timeValue !== JM_CONSTANTS.TIME.ALL ? `${orderValue}_${timeValue}` : orderValue;
            const apiParams = {
                page,
                order: '', // 该参数为空（Python中就是这样）
                c: categoryValue,
                o: o,
            };
            console.log(`[分类筛选] 参数:`, apiParams);
            console.log(`[分类筛选] 映射值: category=${categoryValue}, time=${timeValue}, order=${orderValue}, o=${o}`);
            const data = await this.reqApi(this.API_CATEGORIES_FILTER, apiParams);
            // 处理API返回的数据
            const results = [];
            if (data.content && Array.isArray(data.content)) {
                data.content.forEach((item) => {
                    if (item && typeof item === 'object') {
                        const id = item.id || item.album_id;
                        const name = item.name || item.title;
                        if (id && name) {
                            results.push({
                                id: String(id),
                                title: name
                            });
                        }
                    }
                });
            }
            return {
                filters: {
                    category,
                    time_period: time,
                    order_by: orderBy,
                    page
                },
                constants_used: {
                    category: categoryValue,
                    time: timeValue,
                    order_by: orderValue,
                    api_o_param: o
                },
                results: results.slice(0, 20), // 限制20个结果
                total_results: results.length,
                total: data.total || 0,
                page_count: Math.ceil((data.total || 0) / 20)
            };
        }
        catch (error) {
            throw new Error(`分类筛选失败: ${error}`);
        }
    }
}
exports.JMClient = JMClient;
// PDF转换工具类
class PDFConverter {
    // 对文件名按数字排序
    sortNumericFilenames(fileList) {
        return fileList.sort((a, b) => {
            const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
            const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
            return aNum - bNum;
        });
    }
    // 对目录按数字排序
    sortNumericDirs(dirList) {
        return dirList.sort((a, b) => {
            const aIsDigit = /^\d+$/.test(a);
            const bIsDigit = /^\d+$/.test(b);
            if (aIsDigit && bIsDigit) {
                return parseInt(a) - parseInt(b);
            }
            else if (aIsDigit) {
                return -1;
            }
            else if (bIsDigit) {
                return 1;
            }
            else {
                return a.localeCompare(b);
            }
        });
    }
    // 转换图片为PDF
    async convertImagesToPdf(inputFolder, outputPath, pdfName) {
        const startTime = Date.now();
        // 优先支持JPG格式，因为我们的下载器现在输出JPG
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
        try {
            // 确保输出目录存在
            await fs.ensureDir(outputPath);
            // 生成完整的PDF路径
            const pdfFullPath = path.join(outputPath, `${path.parse(pdfName).name}.pdf`);
            // 检查PDF是否已存在
            if (await fs.pathExists(pdfFullPath)) {
                console.log(`跳过已有PDF：${pdfName}.pdf`);
                return true;
            }
            // 检查输入文件夹是否存在
            if (!await fs.pathExists(inputFolder)) {
                console.error(`错误：输入文件夹不存在 ${inputFolder}`);
                return false;
            }
            const imagePaths = [];
            // 获取所有子目录并排序
            const entries = await fs.readdir(inputFolder);
            const subdirs = [];
            for (const entry of entries) {
                const entryPath = path.join(inputFolder, entry);
                const stat = await fs.stat(entryPath);
                if (stat.isDirectory()) {
                    subdirs.push(entry);
                }
            }
            const sortedSubdirs = this.sortNumericDirs(subdirs);
            // 如果没有子目录，直接处理当前目录的图片
            if (sortedSubdirs.length === 0) {
                const files = await fs.readdir(inputFolder);
                const imageFiles = files.filter((f) => allowedExtensions.includes(path.extname(f).toLowerCase()));
                const sortedFiles = this.sortNumericFilenames(imageFiles);
                for (const file of sortedFiles) {
                    imagePaths.push(path.join(inputFolder, file));
                }
            }
            else {
                // 处理子目录中的图片
                for (const subdir of sortedSubdirs) {
                    const subdirPath = path.join(inputFolder, subdir);
                    try {
                        const files = await fs.readdir(subdirPath);
                        const imageFiles = files.filter((f) => allowedExtensions.includes(path.extname(f).toLowerCase()));
                        const sortedFiles = this.sortNumericFilenames(imageFiles);
                        for (const file of sortedFiles) {
                            imagePaths.push(path.join(subdirPath, file));
                        }
                    }
                    catch (error) {
                        console.warn(`警告：读取子目录失败 ${subdirPath}，原因：${error}`);
                    }
                }
            }
            if (imagePaths.length === 0) {
                console.error(`错误：在 ${inputFolder} 中未找到任何图片文件`);
                return false;
            }
            console.log(`[转换] 转换中：${pdfName} (${imagePaths.length} 张图片)`);
            console.log(`开始生成PDF：${pdfFullPath}`);
            // 创建PDF文档
            const pdfDoc = await pdf_lib_1.PDFDocument.create();
            // 处理每张图片
            for (let i = 0; i < imagePaths.length; i++) {
                const imagePath = imagePaths[i];
                try {
                    console.log(`[转换] 处理图片 ${i + 1}/${imagePaths.length}: ${path.basename(imagePath)}`);
                    const fileExtension = path.extname(imagePath).toLowerCase();
                    let imageBuffer;
                    let isJpeg = false;
                    // 优化：如果是JPG文件，直接读取而不重新编码
                    if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                        console.log(`[转换] 直接读取JPG文件: ${path.basename(imagePath)}`);
                        imageBuffer = await fs.readFile(imagePath);
                        isJpeg = true;
                    }
                    else {
                        // 对于其他格式，使用jimp转换为JPEG
                        console.log(`[转换] 使用jimp转换 ${fileExtension} 为JPEG: ${path.basename(imagePath)}`);
                        const jimpImage = await Jimp.read(imagePath);
                        imageBuffer = await jimpImage.quality(85).getBuffer(Jimp.MIME_JPEG);
                        isJpeg = true;
                    }
                    // 将图片添加到PDF
                    const image = isJpeg ?
                        await pdfDoc.embedJpg(imageBuffer) :
                        await pdfDoc.embedPng(imageBuffer);
                    const { width, height } = image.scale(1);
                    const page = pdfDoc.addPage([width, height]);
                    page.drawImage(image, {
                        x: 0,
                        y: 0,
                        width,
                        height,
                    });
                    console.log(`[转换] 图片 ${i + 1} 添加成功 (${width}x${height})`);
                }
                catch (error) {
                    console.warn(`[转换] 警告：无法处理图片 ${imagePath}，原因：${error}`);
                }
            }
            // 保存PDF
            console.log(`[转换] 保存PDF文件...`);
            const pdfBytes = await pdfDoc.save();
            await fs.writeFile(pdfFullPath, pdfBytes);
            const fileSize = (pdfBytes.length / 1024 / 1024).toFixed(2);
            console.log(`[成功] 成功生成PDF：${pdfFullPath}`);
            console.log(`[成功] PDF大小：${fileSize} MB，包含 ${imagePaths.length} 张图片`);
            console.log(`[成功] 处理完成，耗时 ${(Date.now() - startTime) / 1000} 秒`);
            return true;
        }
        catch (error) {
            console.error(`[失败] 生成PDF失败：${error}`);
            return false;
        }
    }
    // 转换专辑为PDF
    async convertAlbumToPdf(albumDir, baseOutputDir) {
        if (!await fs.pathExists(albumDir)) {
            console.error(`错误：专辑目录不存在 ${albumDir}`);
            return false;
        }
        const albumName = path.basename(albumDir);
        const outputDir = baseOutputDir || path.dirname(albumDir);
        console.log(`\n[转换] 开始转换专辑：${albumName}`);
        const success = await this.convertImagesToPdf(albumDir, outputDir, albumName);
        if (success) {
            console.log(`[完成] 专辑 ${albumName} 转换完成`);
        }
        else {
            console.log(`[失败] 专辑 ${albumName} 转换失败`);
        }
        return success;
    }
}
// 初始化配置和客户端
const configManager = new ConfigManager();
const pdfConverter = new PDFConverter();
// 初始化简化下载器
const simpleDownloader = new simple_jm_downloader_js_1.SimpleJMDownloader(configManager.getStoragePath());
// 定义验证规则
const StringSchema = zod_1.z.string().describe("字符串");
const NumberSchema = zod_1.z.number().describe("数字");
const BooleanSchema = zod_1.z.boolean().describe("布尔值");
// 专辑ID架构 - 支持数字自动转换为字符串
const AlbumIdSchema = zod_1.z.coerce.string().describe("专辑ID (数字或字符串)");
// 搜索漫画工具
server.tool("search_comic", `Searches for comics on jmcomic with advanced filtering options.

Args:
    query: The search query.
    page: The page number to retrieve. Defaults to 1.
    main_tag: Main tag filter. Defaults to 0.
    order_by: Sort order. Options: 'latest', 'view', 'picture', 'like'. Defaults to 'view'.
    time_period: Time period filter. Options: 'today', 'week', 'month', 'all'. Defaults to 'all'.
    category: Category filter. Options: 'all', 'doujin', 'single', 'short', 'another', 
             'hanman', 'meiman', 'doujin_cosplay', '3d', 'english_site'. Defaults to 'all'.

Returns:
    A JSON string containing the search results.`, {
    query: StringSchema.describe("The search query"),
    page: NumberSchema.optional().describe("The page number to retrieve. Defaults to 1"),
    main_tag: NumberSchema.optional().describe("Main tag filter. Defaults to 0"),
    order_by: StringSchema.optional().describe("Sort order. Options: 'latest', 'view', 'picture', 'like'. Defaults to 'view'"),
    time_period: StringSchema.optional().describe("Time period filter. Options: 'today', 'week', 'month', 'all'. Defaults to 'all'"),
    category: StringSchema.optional().describe("Category filter. Options: 'all', 'doujin', 'single', 'short', 'another', 'hanman', 'meiman', 'doujin_cosplay', '3d', 'english_site'. Defaults to 'all'")
}, async ({ query, page = 1, main_tag = 0, order_by = 'view', time_period = 'all', category = 'all' }) => {
    try {
        const result = await simpleDownloader.searchComics({
            query,
            page,
            mainTag: main_tag,
            orderBy: order_by,
            time: time_period
        });
        if (!result.results || result.results.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ message: "No results found." }),
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ error: `An unexpected error occurred: ${error}` }),
                },
            ],
        };
    }
});
// 获取专辑详情工具
server.tool("get_album_details", `Gets the details of a comic album.

Args:
    album_id: The ID of the album.

Returns:
    A JSON string containing the album details.`, {
    album_id: AlbumIdSchema.describe("The ID of the album")
}, async ({ album_id }) => {
    try {
        const result = await simpleDownloader.getAlbumInfo(album_id);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ error: `An unexpected error occurred: ${error}` }),
                },
            ],
        };
    }
});
// 获取排行榜工具
server.tool("get_ranking_list", `Gets the comic ranking list for a given period.

Args:
    period: The time period for the ranking. Can be 'week', 'month', 'all'. Defaults to 'week'.

Returns:
    A JSON string containing the ranking list.`, {
    period: StringSchema.optional().describe("The time period for the ranking. Can be 'week', 'month', 'all'. Defaults to 'week'")
}, async ({ period = 'week' }) => {
    try {
        const result = await simpleDownloader.getRankingList(period);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ error: `An unexpected error occurred: ${error}` }),
                },
            ],
        };
    }
});
// 按分类筛选漫画工具
server.tool("filter_comics_by_category", `Filters comics by category, time period, and sorting method.

Args:
    category: The category to filter by. Options: 'all', 'doujin', 'single', 'short', 
             'another', 'hanman', 'meiman', 'doujin_cosplay', '3D', 'english_site'.
             Defaults to 'all'.
    time_period: The time period to filter by. Options: 'today', 'week', 'month', 'all'.
                Defaults to 'all'.
    order_by: Sort order. Options: 'latest', 'view', 'picture', 'like'. Defaults to 'view'.
    page: Page number to retrieve. Defaults to 1.

Returns:
    A JSON string containing the filtered results.`, {
    category: StringSchema.optional().describe("The category to filter by. Options: 'all', 'doujin', 'single', 'short', 'another', 'hanman', 'meiman', 'doujin_cosplay', '3D', 'english_site'. Defaults to 'all'"),
    time_period: StringSchema.optional().describe("The time period to filter by. Options: 'today', 'week', 'month', 'all'. Defaults to 'all'"),
    order_by: StringSchema.optional().describe("Sort order. Options: 'latest', 'view', 'picture', 'like'. Defaults to 'view'"),
    page: NumberSchema.optional().describe("Page number to retrieve. Defaults to 1")
}, async ({ category = 'all', time_period = 'all', order_by = 'view', page = 1 }) => {
    try {
        const result = await simpleDownloader.filterByCategory({
            category,
            time: time_period,
            orderBy: order_by,
            page
        });
        if (!result.results || result.results.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            message: `No results found for category: ${category}, time: ${time_period}, order: ${order_by}`
                        }),
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ error: `An unexpected error occurred: ${error}` }),
                },
            ],
        };
    }
});
// 下载漫画专辑工具
server.tool("download_comic_album", `Downloads a comic album and optionally converts it to PDF using enhanced downloader.

Args:
    album_id: The ID of the album to download.
    convert_to_pdf: Whether to convert the downloaded images to PDF after download completes.

Returns:
    A message indicating the download has started.`, {
    album_id: AlbumIdSchema.describe("The ID of the album to download"),
    convert_to_pdf: BooleanSchema.optional().describe("Whether to convert the downloaded images to PDF after download completes")
}, async ({ album_id, convert_to_pdf = false }) => {
    try {
        console.log(`[下载] 开始下载专辑 ${album_id}，使用增强下载器`);
        // 获取下载目录和专辑信息
        const downloadDir = simpleDownloader.getDownloadDir();
        let albumTitle = '';
        let estimatedPath = downloadDir;
        try {
            // 尝试获取专辑信息以构造完整路径
            const albumInfo = await simpleDownloader.getAlbumInfo(album_id);
            if (albumInfo.success && albumInfo.title) {
                albumTitle = albumInfo.title;
                estimatedPath = path.join(downloadDir, albumInfo.title);
            }
        }
        catch (infoError) {
            console.log(`[下载] 无法获取专辑信息，使用默认路径: ${infoError}`);
        }
        // 立即返回开始下载的消息，包含下载地址
        const startMessage = `✨ 专辑 ${album_id} 下载已开始！\n` +
            `📁 下载目录: ${downloadDir}\n` +
            (albumTitle ? `📂 专辑路径: ${estimatedPath}\n` : '') +
            `下载将在后台进行，请稍后检查下载目录。`;
        // 在后台执行下载任务
        setImmediate(async () => {
            try {
                // 使用增强的SimpleJMDownloader
                const result = await simpleDownloader.downloadAlbum(album_id, false);
                if (!result.success) {
                    console.error(`[下载] 专辑 ${album_id} 下载失败: ${result.error}`);
                    return;
                }
                console.log(`[下载] 专辑 ${album_id} 下载完成！`);
                console.log(`[下载] 标题: ${result.title}`);
                console.log(`[下载] 作者: ${result.author}`);
                console.log(`[下载] 下载位置: ${result.downloadedFiles?.directory || '未知'}`);
                console.log(`[下载] 文件数量: ${result.downloadedFiles?.fileCount || 0}`);
                // 可选的PDF转换
                if (convert_to_pdf && result.downloadedFiles?.directory) {
                    console.log(`[转换] 开始转换专辑 ${album_id} 为PDF`);
                    const pdfSuccess = await pdfConverter.convertAlbumToPdf(result.downloadedFiles.directory, simpleDownloader.getDownloadDir());
                    console.log(`[转换] 专辑 ${album_id} PDF转换${pdfSuccess ? '成功' : '失败'}`);
                }
            }
            catch (error) {
                console.error(`[下载] 专辑 ${album_id} 后台下载失败:`, error);
            }
        });
        return {
            content: [
                {
                    type: "text",
                    text: startMessage,
                },
            ],
        };
    }
    catch (error) {
        console.error(`[下载] 专辑 ${album_id} 启动下载失败:`, error);
        return {
            content: [
                {
                    type: "text",
                    text: `专辑 ${album_id} 启动下载失败: ${error.message}`,
                },
            ],
        };
    }
});
// 转换专辑为PDF工具
server.tool("convert_album_to_pdf_tool", `Converts a downloaded comic album to PDF.

Args:
    album_id: The ID of the album.
    album_dir: Optional custom path to the album directory. If not provided, 
              will search for the album by title in the download directory.

Returns:
    A message indicating the conversion status.`, {
    album_id: AlbumIdSchema.describe("The ID of the album"),
    album_dir: StringSchema.optional().describe("Optional custom path to the album directory. If not provided, will search for the album by title in the download directory")
}, async ({ album_id, album_dir }) => {
    try {
        let targetDir = album_dir;
        if (!targetDir) {
            // 如果没有提供目录，尝试通过专辑信息查找
            try {
                console.log(`[PDF转换] 获取专辑 ${album_id} 的信息以查找下载目录`);
                const albumInfo = await simpleDownloader.getAlbumInfo(album_id);
                if (albumInfo.success && albumInfo.title) {
                    // 使用专辑标题构造目录路径
                    targetDir = path.join(simpleDownloader.getDownloadDir(), albumInfo.title);
                    console.log(`[PDF转换] 根据专辑标题查找目录: ${targetDir}`);
                }
                else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `错误：无法获取专辑 ${album_id} 的信息来定位下载目录`,
                            },
                        ],
                    };
                }
            }
            catch (infoError) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `错误：获取专辑信息失败: ${infoError}`,
                        },
                    ],
                };
            }
        }
        if (!await fs.pathExists(targetDir)) {
            // 如果目录不存在，列出可用的目录供参考
            const downloadDir = simpleDownloader.getDownloadDir();
            let availableDirs = '';
            try {
                if (await fs.pathExists(downloadDir)) {
                    const entries = await fs.readdir(downloadDir);
                    const directories = [];
                    for (const entry of entries) {
                        const fullPath = path.join(downloadDir, entry);
                        const stat = await fs.stat(fullPath);
                        if (stat.isDirectory()) {
                            directories.push(entry);
                        }
                    }
                    if (directories.length > 0) {
                        availableDirs = `\n\n可用的专辑目录:\n${directories.map(dir => `  - ${dir}`).join('\n')}`;
                    }
                }
            }
            catch (listError) {
                console.log(`[PDF转换] 无法列出目录: ${listError}`);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `错误：专辑目录不存在 ${targetDir}${availableDirs}`,
                    },
                ],
            };
        }
        console.log(`[PDF转换] 开始转换目录: ${targetDir}`);
        const baseOutputDir = path.dirname(targetDir);
        const success = await pdfConverter.convertAlbumToPdf(targetDir, baseOutputDir);
        const message = success
            ? `✅ [成功] 专辑 ${album_id} 已成功转换为PDF\n📁 源目录: ${targetDir}\n📄 PDF位置: ${baseOutputDir}`
            : `❌ [失败] 专辑 ${album_id} PDF转换失败`;
        return {
            content: [
                {
                    type: "text",
                    text: message,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `转换专辑 ${album_id} 为PDF时发生错误: ${error}`,
                },
            ],
        };
    }
});
// 使用SimpleJMDownloader获取专辑详细信息工具
server.tool("get_album_info_enhanced", `Gets detailed information about a comic album using the enhanced downloader.

Args:
    album_id: The ID of the album to get information about.

Returns:
    Detailed album information including chapters and sample images.`, {
    album_id: AlbumIdSchema.describe("The ID of the album to get information about")
}, async ({ album_id }) => {
    try {
        const albumInfo = await simpleDownloader.getAlbumInfo(album_id);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(albumInfo, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: `获取专辑信息失败: ${error}`,
                        album_id
                    }),
                },
            ],
        };
    }
});
// 批量下载专辑工具
server.tool("batch_download_albums", `Downloads multiple comic albums in batch using the enhanced downloader.

Args:
    album_ids: Array of album IDs to download.
    convert_to_pdf: Whether to convert all downloaded albums to PDF.

Returns:
    A message indicating the batch download has started.`, {
    album_ids: zod_1.z.array(AlbumIdSchema).describe("Array of album IDs to download"),
    convert_to_pdf: BooleanSchema.optional().describe("Whether to convert all downloaded albums to PDF")
}, async ({ album_ids, convert_to_pdf = false }) => {
    try {
        console.log(`[批量下载] 开始批量下载 ${album_ids.length} 个专辑`);
        // 获取下载目录
        const downloadDir = simpleDownloader.getDownloadDir();
        // 立即返回开始下载的消息，包含下载地址
        const startMessage = `🚀 批量下载已开始！\n` +
            `正在下载 ${album_ids.length} 个专辑: ${album_ids.join(', ')}\n` +
            `📁 下载目录: ${downloadDir}\n` +
            `📂 每个专辑将创建独立的子文件夹\n` +
            `下载将在后台进行，请稍后检查下载目录。`;
        // 在后台执行批量下载任务
        setImmediate(async () => {
            try {
                // 使用简化下载器批量下载
                const results = await simpleDownloader.batchDownload(album_ids, false);
                // 统计结果
                const successfulDownloads = results.filter(r => r.success);
                const failedDownloads = results.filter(r => !r.success);
                console.log(`[批量下载] 批量下载完成！`);
                console.log(`[批量下载] 总数: ${album_ids.length}, 成功: ${successfulDownloads.length}, 失败: ${failedDownloads.length}`);
                // 可选的PDF转换
                let pdfConversions = 0;
                if (convert_to_pdf && successfulDownloads.length > 0) {
                    console.log(`[批量转换] 开始转换 ${successfulDownloads.length} 个专辑为PDF`);
                    for (const result of successfulDownloads) {
                        if (result.downloadedFiles?.directory) {
                            const pdfSuccess = await pdfConverter.convertAlbumToPdf(result.downloadedFiles.directory, simpleDownloader.getDownloadDir());
                            if (pdfSuccess)
                                pdfConversions++;
                        }
                    }
                    console.log(`[批量转换] PDF转换完成，成功转换 ${pdfConversions} 个专辑`);
                }
                // 打印详细结果到控制台
                console.log(`[批量下载] 成功下载的专辑:`);
                successfulDownloads.forEach((result, index) => {
                    console.log(`  ${index + 1}. ${result.title} (${result.albumId}) - ${result.downloadedFiles?.fileCount || 0} 个文件`);
                });
                if (failedDownloads.length > 0) {
                    console.log(`[批量下载] 下载失败的专辑:`);
                    failedDownloads.forEach((result, index) => {
                        console.log(`  ${index + 1}. ${result.albumId} - ${result.error}`);
                    });
                }
            }
            catch (error) {
                console.error(`[批量下载] 后台批量下载失败:`, error);
            }
        });
        return {
            content: [
                {
                    type: "text",
                    text: startMessage,
                },
            ],
        };
    }
    catch (error) {
        console.error(`[批量下载] 启动批量下载失败:`, error);
        return {
            content: [
                {
                    type: "text",
                    text: `启动批量下载失败: ${error}`,
                },
            ],
        };
    }
});
// 获取下载目录信息工具
server.tool("get_download_info", `Gets information about the current download directory and its contents.

Returns:
    Information about the download directory and downloaded albums.`, {}, async () => {
    try {
        const downloadDir = simpleDownloader.getDownloadDir();
        let info = `下载目录信息:\n`;
        info += `📁 目录位置: ${downloadDir}\n`;
        if (fs.existsSync(downloadDir)) {
            const entries = fs.readdirSync(downloadDir);
            const directories = entries.filter(entry => {
                const fullPath = path.join(downloadDir, entry);
                return fs.statSync(fullPath).isDirectory();
            });
            info += `📂 专辑数量: ${directories.length}\n\n`;
            if (directories.length > 0) {
                info += `已下载的专辑:\n`;
                directories.slice(0, 20).forEach((dir, index) => {
                    const fullPath = path.join(downloadDir, dir);
                    const files = fs.readdirSync(fullPath);
                    const fileCount = files.length;
                    info += `  ${index + 1}. ${dir} (${fileCount} 个文件)\n`;
                });
                if (directories.length > 20) {
                    info += `  ... 还有 ${directories.length - 20} 个专辑\n`;
                }
            }
            else {
                info += `暂无已下载的专辑。\n`;
            }
        }
        else {
            info += `❌ 下载目录不存在\n`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: info,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `获取下载目录信息失败: ${error}`,
                },
            ],
        };
    }
});
// 启动服务器
async function main() {
    try {
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
        console.error("JM Comic MCP Server (TypeScript版本) 已启动");
        console.error("功能包括：搜索漫画、获取详情、排行榜、分类筛选、下载和PDF转换");
        console.error("增强功能：SimpleJMDownloader集成、批量下载、下载目录管理");
    }
    catch (error) {
        console.error("服务器启动失败:", error);
        process.exit(1);
    }
}
// 启动服务器
main().catch((error) => {
    console.error("主函数执行失败:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map