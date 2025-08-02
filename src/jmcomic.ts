/**
 * JMComic TypeScript 实现
 * 对应 Python 版本的 jmcomic 模块
 * 实现真实的API调用和图片下载
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';
import * as CryptoJS from 'crypto-js';
import { execSync } from 'child_process';
const jimp = require('jimp');
const Jimp = jimp.Jimp;
import {
    JmOption,
    JmDownloaderInterface,
    JmcomicClient,
    JmAlbumDetail,
    JmPhotoDetail,
    JmImageDetail,
    DirRule,
    AdvancedDict,
    AlbumInfo,
    DownloadResult
} from './types';

// 模拟版本号
export const __version__ = '2.6.4';

// 域名列表随机化函数 - 对应Python的shuffled()
function shuffleDomains(domains: string[]): string[] {
    const shuffled = [...domains];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 常量配置
const JmMagicConstants = {
    APP_TOKEN_SECRET: '18comicAPP',
    APP_TOKEN_SECRET_2: '18comicAPPContent',
    APP_DATA_SECRET: '185Hcomic3PAPP7R',
    APP_VERSION: '1.8.0',
    SCRAMBLE_220980: 220980,
    SCRAMBLE_268850: 268850,
    SCRAMBLE_421926: 421926
};

const JmModuleConfig = {
    PROT: 'https://',
    DOMAIN_API_LIST: shuffleDomains([
        'www.cdnmhwscc.vip',
        'www.cdnplaystation6.club', 
        'www.cdnplaystation6.org',
        'www.cdnuc.vip',
        'www.cdn-mspjmapiproxy.xyz'
    ]),
    DOMAIN_IMAGE_LIST: shuffleDomains([
        'cdn-msp.jmapiproxy1.cc',
        'cdn-msp.jmapiproxy2.cc',
        'cdn-msp2.jmapiproxy2.cc',
        'cdn-msp3.jmapiproxy2.cc'
    ]),
    APP_HEADERS_TEMPLATE: {
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'X-Requested-With': 'com.jiaohua_browser',
        'user-agent': 'Mozilla/5.0 (Linux; Android 9; V1938CT Build/PQ3A.190705.11211812; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Safari/537.36',
    },
    APP_HEADERS_IMAGE: {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'X-Requested-With': 'com.jiaohua_browser',
    }
};

// 图片工具类 - 对应Python的JmImageTool
export class JmImageTool {
    /**
     * 获取Jimp图片的尺寸（兼容不同版本的Jimp）
     */
    private static getImageSize(image: any): { width: number; height: number } {
        if (typeof image.getWidth === 'function') {
            // 旧版本Jimp使用方法
            return { width: image.getWidth(), height: image.getHeight() };
        } else if (typeof image.width === 'number' && typeof image.height === 'number') {
            // 新版本Jimp使用属性
            return { width: image.width, height: image.height };
        } else if (image.bitmap && typeof image.bitmap.width === 'number' && typeof image.bitmap.height === 'number') {
            // 从bitmap属性获取
            return { width: image.bitmap.width, height: image.bitmap.height };
        } else {
            throw new Error(`无法获取图片尺寸，Jimp对象结构不符合预期`);
        }
    }

    /**
     * 获得图片分割数 - 完全对应Python版本
     */
    static getNum(scrambleId: number | string, aid: number | string, filename: string): number {
        const scrambleIdNum = parseInt(scrambleId.toString());
        const aidNum = parseInt(aid.toString());

        if (aidNum < scrambleIdNum) {
            return 0;
        } else if (aidNum < JmMagicConstants.SCRAMBLE_268850) {
            return 10;
        } else {
            const x = aidNum < JmMagicConstants.SCRAMBLE_421926 ? 10 : 8;
            const s = `${aidNum}${filename}`;
            const hash = crypto.createHash('md5').update(s, 'utf8').digest('hex');
            const lastChar = hash[hash.length - 1];
            let num = lastChar.charCodeAt(0);
            num %= x;
            num = num * 2 + 2;
            return num;
        }
    }

    /**
     * 从文件名提取不带扩展名的部分
     */
    static getFileName(filename: string, withoutExtension: boolean = true): string {
        if (withoutExtension) {
            const lastDotIndex = filename.lastIndexOf('.');
            return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
        }
        return filename;
    }

    /**
     * 从URL中提取文件名
     */
    static getFileNameFromUrl(url: string): string {
        // 移除查询参数
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
            url = url.substring(0, queryIndex);
        }
        
        // 提取文件名
        const lastSlashIndex = url.lastIndexOf('/');
        const filename = lastSlashIndex !== -1 ? url.substring(lastSlashIndex + 1) : url;
        
        return this.getFileName(filename, true);
    }

    /**
     * 解码并保存图片 - 完全对应Python版本的decode_and_save方法
     */
    static async decodeAndSave(num: number, imageBuffer: Buffer, decodedSavePath: string): Promise<void> {
        // console.log(`[解码] 开始解码图片: ${path.basename(decodedSavePath)}`);
        // console.log(`[解码] 分割数: ${num}, 原始大小: ${imageBuffer.length} bytes`);
        
        // 无需解密，直接保存
        if (num === 0) {
            // console.log(`[解码] 分割数为0，直接保存原图`);
            fs.writeFileSync(decodedSavePath, imageBuffer);
            return;
        }

        try {
            // console.log(`[解码] 使用jimp读取图片...`);
            
            // 检查是否为WebP格式并转换为JPG
            let processBuffer = imageBuffer;
            const isWebP = imageBuffer.slice(8, 12).toString() === 'WEBP';
            
            if (isWebP) {
                // console.log(`[解码] 检测到WebP格式，转换为JPG...`);
                try {
                    // 将WebP buffer转换为JPG buffer
                    const tempWebpPath = path.join(path.dirname(decodedSavePath), `temp_${Date.now()}.webp`);
                    const tempJpgPath = path.join(path.dirname(decodedSavePath), `temp_${Date.now()}.jpg`);
                    
                    // 先写入临时WebP文件
                    fs.writeFileSync(tempWebpPath, imageBuffer);
                    
                    // 转换为JPG
                    execSync(`ffmpeg -i "${tempWebpPath}" -update 1 -frames:v 1 "${tempJpgPath}"`);
                    
                    // 读取转换后的JPG
                    processBuffer = fs.readFileSync(tempJpgPath);
                    
                    // 清理临时文件
                    fs.unlinkSync(tempWebpPath);
                    fs.unlinkSync(tempJpgPath);
                    
                    // console.log(`[解码] WebP转换JPG成功，新大小: ${processBuffer.length} bytes`);
                } catch (convertError: any) {
                    console.error(`[解码] WebP转换失败，使用原始buffer:`, convertError.message);
                    processBuffer = imageBuffer;
                }
            }
            
            // 使用jimp处理图片
            // console.log(`[解码] 开始使用Jimp读取processBuffer...`);
            const image = await Jimp.read(processBuffer);
            // console.log(`[解码] Jimp.read返回对象类型:`, typeof image);
            // console.log(`[解码] 对象构造函数:`, image?.constructor?.name);
            
            // 获取图片尺寸 - 使用辅助函数
            const { width, height } = JmImageTool.getImageSize(image);
            // console.log(`[解码] 获取图片尺寸: ${width}x${height}`);
            
            // 额外检查尺寸有效性
            
            // console.log(`[解码] 图片尺寸: ${width}x${height}`);
            
            if (!width || !height) {
                throw new Error('无法获取图片尺寸');
            }

            // 图片解码开始

            // 完全按照Python版本的算法 - 不做任何边界检查修改
            const w = width;
            const h = height;
            const over = h % num;
            
            // console.log(`[解码] 算法参数: w=${w}, h=${h}, num=${num}, over=${over}`);
            
            // console.log(`[解码] 创建结果画布: ${w}x${h}`);
            // 创建解码后的图片 - 使用对象参数格式
            const resultImage = new Jimp({width: w, height: h});
            await resultImage;

            const strips: { image: any; top: number; left: number }[] = [];

            // console.log(`[解码] 开始分片处理，共${num}个分片`);
            // 修复后的循环逻辑 - 解决extract_area错误
            for (let i = 0; i < num; i++) {
                // console.log(`[解码] === 处理分片 ${i} ===`);
                // 每次循环重新计算move - 对应Python的 move = math.floor(h / num)
                let move = Math.floor(h / num);
                let ySrc = h - (move * (i + 1)) - over;  // 对应Python的 y_src
                let yDst = move * i;                     // 对应Python的 y_dst

                // console.log(`[解码] 分片 ${i} 初始计算: move=${move}, ySrc=${ySrc}, yDst=${yDst}`);

                // 确保 ySrc 不小于 0
                ySrc = Math.max(0, ySrc);

                // 完全按照Python的条件判断
                if (i === 0) {
                    move += over;     // 第一个分片加上余数
                    // console.log(`[解码] 分片 ${i} 第一个分片，添加余数: move=${move}`);
                    // 确保第一个分片不会超出图像底部
                    move = Math.min(move, h - ySrc);
                    // console.log(`[解码] 分片 ${i} 限制边界后: move=${move}`);
                } else {
                    yDst += over;     // 其他分片的目标位置加上余数
                    // console.log(`[解码] 分片 ${i} 非第一个分片，调整目标位置: yDst=${yDst}`);
                }

                // console.log(`[解码] 分片 ${i} 最终参数: ySrc=${ySrc}, yDst=${yDst}, move=${move}`);
                
                // 严格验证参数
                if (ySrc >= h || move <= 0 || ySrc + move > h) {
                    console.log(`[解码] 分片 ${i} 参数无效: ySrc=${ySrc}, move=${move}, h=${h}`);
                    console.log(`[调试] 分片 ${i} 计算过程:
  原图尺寸: ${w}x${h}
  分割数: ${num}, 余数: ${over}
  基础move: ${Math.floor(h / num)}
  ySrc计算: ${h}-(${Math.floor(h / num)}*${i + 1})-${over}=${h - (Math.floor(h / num) * (i + 1)) - over}
  修正后ySrc: ${ySrc}`);
                    throw new Error(`无效的分片参数: 分片 ${i} 超出图像范围`);
                }

                // console.log(`[解码] 分片 ${i} 开始提取，区域: (0,${ySrc},${w},${move})`);

                try {
                    // 从原图提取分片 - 对应Python的 img_src.crop((0, y_src, w, y_src + move))
                    // 使用jimp提取分片 - 使用对象参数格式
                    const stripImage = image.clone().crop({x: 0, y: ySrc, w: w, h: move});
                    const stripSize = JmImageTool.getImageSize(stripImage);
                    // console.log(`[解码] 分片 ${i} 提取成功，尺寸: ${stripSize.width}x${stripSize.height}`);

                    // 添加到合成列表 - 对应Python的 img_decode.paste(分片, (0, y_dst, w, y_dst + move))
                    strips.push({
                        image: stripImage,
                        top: yDst,
                        left: 0
                    });
                    // console.log(`[解码] 分片 ${i} 已添加到合成列表，目标位置: (0,${yDst})`);
                } catch (err: any) {
                    console.error(`处理分片 ${i} 时出错:`, err.message);
                    console.log(`[错误详情] 分片 ${i} 参数:
  提取区域: left=0, top=${ySrc}, width=${w}, height=${move}
  图片尺寸: ${w}x${h}
  提取区域是否有效: ${ySrc >= 0 && ySrc < h && move > 0 && ySrc + move <= h}`);
                    throw err;
                }
            }

            // console.log(`[解码] 开始合成最终图片，共${strips.length}个分片`);
            // 合成最终图片并保存 - 对应Python的 cls.save_image(img_decode, decoded_save_path)
            for (let i = 0; i < strips.length; i++) {
                const strip = strips[i];
                const stripSize = JmImageTool.getImageSize(strip.image);
                // console.log(`[解码] 合成分片 ${i}: 位置(${strip.left},${strip.top}), 尺寸${stripSize.width}x${stripSize.height}`);
                resultImage.composite(strip.image, strip.left, strip.top);
            }
            
            // console.log(`[解码] 保存解码后的图片: ${decodedSavePath}`);
            
            // 修改保存路径为JPG格式
            const jpgSavePath = decodedSavePath.replace(/\.webp$/i, '.jpg');
            // console.log(`[解码] 保存为JPG格式: ${jpgSavePath}`);
            
            // 使用现代的 await write() 方法（根据官方文档）
            await resultImage.write(jpgSavePath);
            // console.log(`[解码] 图片解码完成: ${path.basename(jpgSavePath)}`);

        } catch (error: any) {
            console.error(`[解码] 图片解码失败: ${error.message}`);
            console.error(`[解码] 错误详情:`, error.stack);
            // console.log(`[解码] 保存原始图片作为fallback: ${decodedSavePath}`);
            // 保存原始图片作为fallback
            fs.writeFileSync(decodedSavePath, imageBuffer);
        }
    }
}

// 加密工具类
class JmCryptoTool {
    static md5hex(key: string): string {
        return crypto.createHash('md5').update(key, 'utf8').digest('hex');
    }

    static tokenAndTokenparam(ts: number, secret: string = JmMagicConstants.APP_TOKEN_SECRET): [string, string] {
        const tokenparam = `${ts},${JmMagicConstants.APP_VERSION}`;
        const token = this.md5hex(`${ts}${secret}`);
        return [token, tokenparam];
    }

    static decodeRespData(data: string, ts: number, secret: string = JmMagicConstants.APP_DATA_SECRET): string {
        try {
            // 1. Base64解码
            const dataB64 = Buffer.from(data, 'base64');
            
            // 2. AES-ECB解密 - 使用AES-256-ECB
            const key = this.md5hex(`${ts}${secret}`);
            const keyBuffer = Buffer.from(key, 'utf8').slice(0, 32); // 使用32字节密钥
            const decipher = crypto.createDecipheriv('aes-256-ecb', keyBuffer, null);
            decipher.setAutoPadding(false);
            
            let decrypted = decipher.update(dataB64);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // 3. 移除padding
            const paddingLength = decrypted[decrypted.length - 1];
            const result = decrypted.slice(0, -paddingLength);
            
            // 4. 解码为字符串
            return result.toString('utf-8');
        } catch (error: any) {
            console.warn(`解密失败，返回原始数据: ${error.message}`);
            // 如果解密失败，尝试直接返回数据（可能已经是解密的）
            try {
                JSON.parse(data);
                return data;
            } catch {
                throw new Error(`数据既不是有效的加密数据也不是有效的JSON: ${data.substring(0, 50)}...`);
            }
        }
    }
}

// API响应类
class JmApiResp {
    constructor(private resp: AxiosResponse, private ts: number) {}

    get rawResponse(): AxiosResponse {
        return this.resp;
    }

    get isSuccess(): boolean {
        return this.resp.status === 200;
    }

    get json(): any {
        try {
            return this.resp.data;
        } catch (error: any) {
            throw new Error(`JSON解析失败: ${error.message}`);
        }
    }

    get isSuccessful(): boolean {
        return this.isSuccess && this.json.code === 200;
    }

    get encodedData(): string {
        return this.json.data;
    }

    get decodedData(): string {
        return JmCryptoTool.decodeRespData(this.encodedData, this.ts);
    }

    get resData(): any {
        if (!this.isSuccessful) {
            throw new Error(`API请求失败: code=${this.json.code}`);
        }
        try {
            return JSON.parse(this.decodedData);
        } catch (error: any) {
            console.log(`解析解密数据失败: ${error.message}`);
            // 如果解密数据解析失败，尝试直接返回原始data
            return this.json.data;
        }
    }

    get modelData(): any {
        return this.resData;
    }
}

// 高级字典类实现
class AdvancedDictImpl implements AdvancedDict {
    private data: { [key: string]: any } = {};

    constructor(obj: any = {}) {
        this.data = { ...obj };
    }

    get srcDict(): any {
        return { ...this.data };
    }

    [key: string]: any;
}

// 目录规则类实现
class DirRuleImpl implements DirRule {
    public rule: string;
    public baseDir: string;

    constructor(rule: string = 'Bd', baseDir?: string) {
        this.rule = rule;
        this.baseDir = baseDir || 'downloads';
    }

    decideImageSaveDir(album: JmAlbumDetail, photo: JmPhotoDetail): string {
        return path.join(this.baseDir, album.title);
    }

    decideAlbumRootDir(album: JmAlbumDetail): string {
        return path.join(this.baseDir, album.title);
    }
}

// JmOption 类实现
export class JmOptionImpl implements JmOption {
    public dirRule: DirRule;
    public client: AdvancedDict;
    public download: AdvancedDict;
    public plugins: AdvancedDict;
    public filepath?: string;

    constructor(config: {
        dirRule: { rule?: string; baseDir?: string };
        download?: any;
        client?: any;
        plugins?: any;
        filepath?: string;
    }) {
        this.dirRule = new DirRuleImpl(config.dirRule.rule, config.dirRule.baseDir);
        this.client = new AdvancedDictImpl(config.client || {});
        this.download = new AdvancedDictImpl(config.download || {});
        this.plugins = new AdvancedDictImpl(config.plugins || {});
        this.filepath = config.filepath;
    }

    static default(): JmOption {
        return new JmOptionImpl({
            dirRule: { rule: 'Bd', baseDir: 'downloads' },
            download: {},
            client: {},
            plugins: {}
        });
    }

    buildJmClient(): JmcomicClient {
        return new JmApiClientImpl();
    }
}

// 真实的 JmApi客户端实现
class JmApiClientImpl implements JmcomicClient {
    private domainList: string[] = JmModuleConfig.DOMAIN_API_LIST;
    private retryTimes: number = 3;
    private currentDomainIndex: number = 0;

    private API_ALBUM = '/album';
    private API_CHAPTER = '/chapter';
    private API_SCRAMBLE = '/chapter_view_template';
    private API_SEARCH = '/search';
    private API_CATEGORIES_FILTER = '/categories/filter';

    async getAlbumDetail(albumId: string): Promise<JmAlbumDetail> {
        // 获取本子详情: ${albumId}
        
        const resp = await this.reqApi(`${this.API_ALBUM}?id=${albumId}`);
        const data = resp.resData;

        if (!data || !data.name) {
            throw new Error(`本子 ${albumId} 不存在或数据无效`);
        }

        return this.parseAlbumData(albumId, data);
    }

    async getPhotoDetail(photoId: string, fetchAlbum = true, fetchScrambleId = true): Promise<JmPhotoDetail> {
        // 获取章节详情: ${photoId}
        
        const resp = await this.reqApi(`${this.API_CHAPTER}?id=${photoId}`);
        const data = resp.resData;

        if (!data || !data.name) {
            throw new Error(`章节 ${photoId} 不存在或数据无效`);
        }

        const photo = this.parsePhotoData(photoId, data);

        // 获取scramble_id - 完全对应Python版本的逻辑
        if (fetchScrambleId) {
            try {
                const scrambleId = await this.getScrambleId(photoId);
                photo.scrambleId = scrambleId.toString();
            } catch (error: any) {
                console.log(`获取scramble_id失败: ${error.message}，使用默认值`);
                photo.scrambleId = JmMagicConstants.SCRAMBLE_220980.toString();
            }
        }

        return photo;
    }

    async getScrambleId(photoId: string): Promise<number> {
        try {
            // 这个接口使用不同的密钥，对应Python版本的特殊处理
            const resp = await this.reqApiForScramble(`${this.API_SCRAMBLE}?id=${photoId}&mode=vertical&page=0&app_img_shunt=1&express=off&v=${Math.floor(Date.now() / 1000)}`);
            
            // 这个接口返回HTML，需要解析scramble_id
            const html = resp.rawResponse.data;
            const match = html.match(/var scramble_id = (\d+);/);
            
            if (match) {
                return parseInt(match[1]);
            }
            
            console.log('未匹配到scramble_id，使用默认值');
            return JmMagicConstants.SCRAMBLE_220980;
        } catch (error: any) {
            console.log(`请求scramble_id失败: ${error.message}`);
            return JmMagicConstants.SCRAMBLE_220980;
        }
    }

    private async reqApiForScramble(url: string): Promise<JmApiResp> {
        const ts = Math.floor(Date.now() / 1000);
        
        for (let domainIndex = 0; domainIndex < this.domainList.length; domainIndex++) {
            const domain = this.domainList[domainIndex];
            for (let retry = 0; retry < this.retryTimes; retry++) {
                try {
                    const fullUrl = `${JmModuleConfig.PROT}${domain}${url}`;
                    
                    // 使用特殊的密钥 - 完全对应Python版本
                    const [token, tokenparam] = JmCryptoTool.tokenAndTokenparam(ts, JmMagicConstants.APP_TOKEN_SECRET_2);
                    
                    const headers = {
                        ...JmModuleConfig.APP_HEADERS_TEMPLATE,
                        'token': token,
                        'tokenparam': tokenparam,
                        'Referer': `${JmModuleConfig.PROT}${this.domainList[0]}`
                    };

                    // 请求scramble: ${fullUrl}

                    const resp = await axios.get(fullUrl, { 
                        headers, 
                        timeout: 30000,
                        validateStatus: function (status) {
                            return status >= 200 && status < 300; // 只接受 2xx 状态码
                        }
                    });
                    return new JmApiResp(resp, ts);

                } catch (error: any) {
                    const status = error.response?.status || 'unknown';
                    console.log(`[API] 请求scramble失败: ${error.message} (状态码: ${status}) 域名: ${domain}`);
                    if (retry === this.retryTimes - 1 && domainIndex === this.domainList.length - 1) {
                        throw new Error(`scramble请求失败: ${error.message}`);
                    }
                }
            }
        }
        
        throw new Error('scramble请求失败');
    }

    checkPhoto(photo: JmPhotoDetail): void {
        // 检查章节: ${photo.title}
    }

    async searchComics(params: {
        query: string;
        page?: number;
        mainTag?: number;
        orderBy?: string;
        time?: string;
    }): Promise<any> {
        const {
            query,
            page = 1,
            mainTag = 0,
            orderBy = 'view',
            time = 'all'
        } = params;

        // 参数映射
        const orderMap: { [key: string]: string } = {
            'latest': 'mr',
            'view': 'mv', 
            'picture': 'mp',
            'like': 'tf'
        };

        const timeMap: { [key: string]: string } = {
            'today': 't',
            'week': 'w',
            'month': 'm', 
            'all': 'a'
        };

        const orderValue = orderMap[orderBy.toLowerCase()] || orderMap['view'];
        const timeValue = timeMap[time.toLowerCase()] || timeMap['all'];

        try {
            const apiParams = {
                main_tag: mainTag,
                search_query: query,
                page,
                o: orderValue,
                t: timeValue
            };

            console.log(`[搜索] 参数:`, apiParams);
            
            const resp = await this.reqApi(`${this.API_SEARCH}?${new URLSearchParams(apiParams as any).toString()}`);
            const data = resp.resData;
            
            // 处理直接重定向到专辑的情况
            if (data.redirect_aid) {
                const album = await this.getAlbumDetail(data.redirect_aid);
                return {
                    search_params: params,
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
            const results: any[] = [];
            if (data.content && Array.isArray(data.content)) {
                data.content.forEach((item: any) => {
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
                search_params: params,
                constants_used: {
                    order_by: orderValue,
                    time: timeValue
                },
                results: results.slice(0, 20),
                total_results: results.length,
                total: data.total || 0,
                page_count: Math.ceil((data.total || 0) / 20)
            };
        } catch (error) {
            throw new Error(`搜索失败: ${error}`);
        }
    }

    async filterByCategory(params: {
        category?: string;
        time?: string;
        orderBy?: string;
        page?: number;
    }): Promise<any> {
        const {
            category = 'all',
            time = 'all', 
            orderBy = 'view',
            page = 1
        } = params;

        // 参数映射
        const categoryMap: { [key: string]: string } = {
            'all': '0',
            'doujin': 'doujin',
            'single': 'single',
            'short': 'short',
            'another': 'another',
            'hanman': 'hanman',
            'meiman': 'meiman',
            'doujin_cosplay': 'doujin_cosplay',
            '3d': '3D',
            'english_site': 'english_site'
        };

        const orderMap: { [key: string]: string } = {
            'latest': 'mr',
            'view': 'mv',
            'picture': 'mp', 
            'like': 'tf'
        };

        const timeMap: { [key: string]: string } = {
            'today': 't',
            'week': 'w',
            'month': 'm',
            'all': 'a'
        };

        const categoryValue = categoryMap[category.toLowerCase()] || categoryMap['all'];
        const orderValue = orderMap[orderBy.toLowerCase()] || orderMap['view'];
        const timeValue = timeMap[time.toLowerCase()] || timeMap['all'];

        try {
            // 按照Python实现的参数格式
            const o = timeValue !== 'a' ? `${orderValue}_${timeValue}` : orderValue;
            
            const apiParams = {
                page,
                order: '',
                c: categoryValue,
                o: o
            };

            console.log(`[分类筛选] 参数:`, apiParams);
            
            const resp = await this.reqApi(`${this.API_CATEGORIES_FILTER}?${new URLSearchParams(apiParams as any).toString()}`);
            const data = resp.resData;

            const results: any[] = [];
            if (data.content && Array.isArray(data.content)) {
                data.content.forEach((item: any) => {
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
                filters: params,
                constants_used: {
                    category: categoryValue,
                    time: timeValue,
                    order_by: orderValue,
                    api_o_param: o
                },
                results: results.slice(0, 20),
                total_results: results.length,
                total: data.total || 0,
                page_count: Math.ceil((data.total || 0) / 20)
            };
        } catch (error) {
            throw new Error(`分类筛选失败: ${error}`);
        }
    }

    private async reqApi(url: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<JmApiResp> {
        const ts = Math.floor(Date.now() / 1000);
        
        for (let domainIndex = 0; domainIndex < this.domainList.length; domainIndex++) {
            const domain = this.domainList[domainIndex];
            for (let retry = 0; retry < this.retryTimes; retry++) {
                try {
                    const fullUrl = `${JmModuleConfig.PROT}${domain}${url}`;
                    
                    const [token, tokenparam] = JmCryptoTool.tokenAndTokenparam(ts);
                    
                    const headers = {
                        ...JmModuleConfig.APP_HEADERS_TEMPLATE,
                        'token': token,
                        'tokenparam': tokenparam,
                        'Referer': `${JmModuleConfig.PROT}${this.domainList[0]}`
                    };

                    // API请求: ${method} ${fullUrl}

                    const axiosConfig = {
                        headers, 
                        timeout: 30000,
                        validateStatus: function (status: number) {
                            return status >= 200 && status < 300; // 只接受 2xx 状态码
                        }
                    };

                    let resp: AxiosResponse;
                    if (method === 'GET') {
                        resp = await axios.get(fullUrl, axiosConfig);
                    } else {
                        resp = await axios.post(fullUrl, data, axiosConfig);
                    }

                    return new JmApiResp(resp, ts);

                } catch (error: any) {
                    const status = error.response?.status || 'unknown';
                    console.log(`[API] 请求失败: ${error.message} (状态码: ${status}) 域名: ${domain}`);
                    if (retry === this.retryTimes - 1 && domainIndex === this.domainList.length - 1) {
                        throw new Error(`所有域名和重试都失败: ${error.message}`);
                    }
                }
            }
        }
        
        throw new Error('请求失败');
    }

    private parseAlbumData(albumId: string, data: any): JmAlbumDetail {
        // 解析API返回的本子数据
        // 调试信息已移除
        
        // 根据实际API响应结构解析
        let episodeList = [];
        if (data.series && Array.isArray(data.series) && data.series.length > 0) {
            episodeList = data.series;
        } else {
            // 如果没有series，说明是单章本子，使用albumId作为章节ID
            episodeList = [{ id: albumId, title: data.name }];
        }
        
        return {
            id: albumId,
            albumId: albumId,
            scrambleId: data.scramble_id || '220980',
            title: data.name || `本子 ${albumId}`,
            name: data.name || `本子 ${albumId}`,
            author: this.extractAuthor(data.author || []),
            episodeList: episodeList,
            pageCount: data.images ? data.images.length : 0,
            pubDate: new Date().toISOString(),
            updateDate: new Date().toISOString(),
            likes: parseInt(data.likes) || 0,
            views: parseInt(data.total_views) || 0,
            commentCount: parseInt(data.comment_total) || 0,
            works: data.works || [],
            actors: data.actors || [],
            authors: Array.isArray(data.author) ? data.author : [data.author || '未知作者'],
            tags: data.tags || [],
            relatedList: data.related_list || [],
            description: data.description || '',
            exists: false,
            skip: false,
            length: episodeList.length,
            oname: data.name || `本子 ${albumId}`,
            authoroname: `【${this.extractAuthor(data.author || [])}】${data.name || albumId}`,
            idoname: `[${albumId}] ${data.name || albumId}`,
            toFile: (filepath: string) => {},
            isImage: () => false,
            isPhoto: () => false,
            isAlbum: () => true,
            isPage: () => false,
            getindex: (index: number) => null,
            [Symbol.iterator]: function* () {
                for (const episode of episodeList) {
                    yield episode;
                }
            }
        };
    }

    private parsePhotoData(photoId: string, data: any): JmPhotoDetail {
        // 解析API返回的章节数据
        const imageCount = data.images ? data.images.length : 0;
        
        return {
            id: photoId,
            photoId: photoId,
            title: data.name || `章节 ${photoId}`,
            name: data.name || `章节 ${photoId}`,
            author: this.extractAuthor(data.author || []),
            seriesId: data.series_id || photoId,
            sort: parseInt(data.sort) || 1,
            tags: data.tags || [],
            scrambleId: data.scramble_id || '220980',
            pageArr: data.images || [],
            dataOriginalDomain: data.data_original_domain || '',
            dataOriginal0: data.data_original_0 || '',
            fromAlbum: undefined,
            exists: false,
            skip: false,
            length: imageCount,
            isSingleAlbum: false,
            indextitle: data.name || `章节 ${photoId}`,
            albumId: photoId, // 对于单章本子，albumId就是photoId
            albumIndex: 1,
            oname: data.name || `章节 ${photoId}`,
            authoroname: `【${this.extractAuthor(data.author || [])}】${data.name || photoId}`,
            idoname: `[${photoId}] ${data.name || photoId}`,
            toFile: (filepath: string) => {},
            isImage: () => false,
            isPhoto: () => true,
            isAlbum: () => false,
            isPage: () => false,
            getindex: (index: number) => null,
            [Symbol.iterator]: function* () {
                for (let i = 0; i < imageCount; i++) {
                    yield { index: i + 1, filename: `${(i + 1).toString().padStart(5, '0')}.webp` };
                }
            }
        };
    }

    private extractAuthor(authors: any): string {
        if (Array.isArray(authors) && authors.length > 0) {
            return authors[0];
        }
        if (typeof authors === 'string') {
            return authors;
        }
        return '未知作者';
    }

    async downloadImage(imageUrl: string, savePath: string, scrambleId?: number | string, decodeImage: boolean = true): Promise<boolean> {
        try {
            // console.log(`[图片] 开始下载: ${imageUrl}`);
            // console.log(`[图片] 保存路径: ${savePath}`);
            // console.log(`[图片] scrambleId: ${scrambleId}, 是否解码: ${decodeImage}`);
            
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    ...JmModuleConfig.APP_HEADERS_IMAGE,
                    'User-Agent': JmModuleConfig.APP_HEADERS_TEMPLATE['user-agent']
                }
            });

            // console.log(`[图片] 下载完成，状态码: ${response.status}, 大小: ${response.data.byteLength} bytes`);

            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                // console.log(`[图片] 创建目录: ${dir}`);
            }

            const imageBuffer = Buffer.from(response.data);

            // 判断是否需要解码图片
            if (!decodeImage || scrambleId === null || scrambleId === undefined) {
                // console.log(`[图片] 不需要解码，直接保存`);
                // 不解码，直接保存
                fs.writeFileSync(savePath, imageBuffer);
            } else {
                // 解码图片并保存 - 完全对应Python版本的逻辑
                const filename = JmImageTool.getFileNameFromUrl(imageUrl);
                const photoId = this.extractPhotoIdFromUrl(imageUrl);
                const num = JmImageTool.getNum(scrambleId, photoId, filename);
                
                // console.log(`[图片] 需要解码，参数: filename=${filename}, photoId=${photoId}, num=${num}`);
                await JmImageTool.decodeAndSave(num, imageBuffer, savePath);
            }

            // console.log(`[图片] 图片处理完成: ${path.basename(savePath)}`);
            return true;
        } catch (error: any) {
            console.error(`[图片] 下载失败: ${imageUrl}`);
            console.error(`[图片] 错误信息: ${error.message}`);
            if (error.response) {
                console.error(`[图片] HTTP状态: ${error.response.status}`);
            }
            return false;
        }
    }

    private extractPhotoIdFromUrl(url: string): string {
        // 从URL中提取photo ID: https://domain/media/photos/302471/00001.webp -> 302471
        const matches = url.match(/\/media\/photos\/(\d+)\//);
        return matches ? matches[1] : '0';
    }
}

// JmDownloader 类实现
export class JmDownloaderImpl implements JmDownloaderInterface {
    public option: JmOption;
    public client: JmApiClientImpl;

    constructor(option: JmOption) {
        this.option = option;
        this.client = option.buildJmClient() as JmApiClientImpl;
    }

    async downloadAlbum(albumId: string): Promise<JmAlbumDetail> {
        const album = await this.client.getAlbumDetail(albumId);
        await this.downloadByAlbumDetail(album);
        return album;
    }

    async downloadByAlbumDetail(album: JmAlbumDetail): Promise<void> {
        // 开始下载本子: ${album.title}
        
        // 创建本子目录
        const albumDir = this.option.dirRule.decideAlbumRootDir(album);
        
        if (!fs.existsSync(albumDir)) {
            fs.mkdirSync(albumDir, { recursive: true });
        }

        // 获取章节详情并下载图片
        for (const episode of album.episodeList) {
            const photo = await this.client.getPhotoDetail(episode.id, true);
            await this.downloadPhotoImages(photo, albumDir);
        }

        // 本子下载完成: ${album.title}
    }

    private async downloadPhotoImages(photo: JmPhotoDetail, albumDir: string): Promise<void> {
        // 开始下载章节: ${photo.title} (${photo.length}张图片)
        
        // 下载每张图片
        if (!photo.pageArr || photo.pageArr.length === 0) {
            // 没有找到图片列表
            return;
        }

        for (let i = 0; i < photo.pageArr.length; i++) {
            const imageName = photo.pageArr[i];
            const fileName = `${(i + 1).toString().padStart(5, '0')}.webp`;
            const filePath = path.join(albumDir, fileName);
            
            // 检查文件是否已存在
            if (fs.existsSync(filePath)) {
                // 图片已存在: ${fileName}
                continue;
            }

            // 构造图片URL
            const imageUrl = this.buildImageUrl(photo, imageName);
            
            // 下载并解码图片 - 使用修复后的解码算法
            const success = await this.client.downloadImage(imageUrl, filePath, photo.scrambleId, true);
            if (success) {
                // 图片已下载: ${fileName}
            }
        }
    }

    private buildImageUrl(photo: JmPhotoDetail, imageName: string): string {
        // 使用随机的图片域名
        const domain = JmModuleConfig.DOMAIN_IMAGE_LIST[Math.floor(Math.random() * JmModuleConfig.DOMAIN_IMAGE_LIST.length)];
        // 完全对应Python版本: return f'{JmModuleConfig.PROT}{domain}/media/photos/{self.photo_id}/{img_name}'
        return `${JmModuleConfig.PROT}${domain}/media/photos/${photo.photoId}/${imageName}`;
    }
}

// 导出主要的工厂函数，对应 Python 版本的 API
export { JmDownloaderImpl as JmDownloader };
export { JmOptionImpl as JmOption }; 