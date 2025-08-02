"use strict";
/**
 * JMComic TypeScript 实现
 * 对应 Python 版本的 jmcomic 模块
 * 实现真实的API调用和图片下载
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
exports.JmOption = exports.JmDownloader = exports.JmDownloaderImpl = exports.JmOptionImpl = exports.__version__ = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
// 模拟版本号
exports.__version__ = '2.6.4';
// 域名列表随机化函数 - 对应Python的shuffled()
function shuffleDomains(domains) {
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
class JmImageTool {
    /**
     * 获得图片分割数 - 完全对应Python版本
     */
    static getNum(scrambleId, aid, filename) {
        const scrambleIdNum = parseInt(scrambleId.toString());
        const aidNum = parseInt(aid.toString());
        if (aidNum < scrambleIdNum) {
            return 0;
        }
        else if (aidNum < JmMagicConstants.SCRAMBLE_268850) {
            return 10;
        }
        else {
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
    static getFileName(filename, withoutExtension = true) {
        if (withoutExtension) {
            const lastDotIndex = filename.lastIndexOf('.');
            return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
        }
        return filename;
    }
    /**
     * 从URL中提取文件名
     */
    static getFileNameFromUrl(url) {
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
    static async decodeAndSave(num, imageBuffer, decodedSavePath) {
        // 无需解密，直接保存
        if (num === 0) {
            fs.writeFileSync(decodedSavePath, imageBuffer);
            return;
        }
        try {
            // 使用sharp处理图片
            const image = (0, sharp_1.default)(imageBuffer);
            const { width, height } = await image.metadata();
            if (!width || !height) {
                throw new Error('无法获取图片尺寸');
            }
            // 图片解码开始
            // 完全按照Python版本的算法 - 不做任何边界检查修改
            const w = width;
            const h = height;
            const over = h % num;
            // 创建解码后的图片
            const resultImage = (0, sharp_1.default)({
                create: {
                    width: w,
                    height: h,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            });
            const strips = [];
            // 修复后的循环逻辑 - 解决extract_area错误
            for (let i = 0; i < num; i++) {
                // 每次循环重新计算move - 对应Python的 move = math.floor(h / num)
                let move = Math.floor(h / num);
                let ySrc = h - (move * (i + 1)) - over; // 对应Python的 y_src
                let yDst = move * i; // 对应Python的 y_dst
                // 确保 ySrc 不小于 0
                ySrc = Math.max(0, ySrc);
                // 完全按照Python的条件判断
                if (i === 0) {
                    move += over; // 第一个分片加上余数
                    // 确保第一个分片不会超出图像底部
                    move = Math.min(move, h - ySrc);
                }
                else {
                    yDst += over; // 其他分片的目标位置加上余数
                }
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
                // 处理分片 ${i}
                try {
                    // 从原图提取分片 - 对应Python的 img_src.crop((0, y_src, w, y_src + move))
                    // 修复Sharp的extract bug：为每个分片重新创建Sharp实例
                    const stripBuffer = await (0, sharp_1.default)(imageBuffer)
                        .extract({
                        left: 0,
                        top: ySrc,
                        width: w,
                        height: move
                    })
                        .webp() // 直接使用webp格式，避免PNG转换
                        .toBuffer();
                    // 添加到合成列表 - 对应Python的 img_decode.paste(分片, (0, y_dst, w, y_dst + move))
                    strips.push({
                        input: stripBuffer,
                        top: yDst,
                        left: 0
                    });
                }
                catch (err) {
                    console.error(`处理分片 ${i} 时出错:`, err.message);
                    console.log(`[错误详情] 分片 ${i} 参数:
  提取区域: left=0, top=${ySrc}, width=${w}, height=${move}
  图片尺寸: ${w}x${h}
  提取区域是否有效: ${ySrc >= 0 && ySrc < h && move > 0 && ySrc + move <= h}`);
                    throw err;
                }
            }
            // 合成最终图片并保存 - 对应Python的 cls.save_image(img_decode, decoded_save_path)
            await resultImage.composite(strips).webp().toFile(decodedSavePath);
        }
        catch (error) {
            console.log(`图片解码失败: ${error.message}，保存原始图片`);
            // 保存原始图片作为fallback
            fs.writeFileSync(decodedSavePath, imageBuffer);
        }
    }
}
// 加密工具类
class JmCryptoTool {
    static md5hex(key) {
        return crypto.createHash('md5').update(key, 'utf8').digest('hex');
    }
    static tokenAndTokenparam(ts, secret = JmMagicConstants.APP_TOKEN_SECRET) {
        const tokenparam = `${ts},${JmMagicConstants.APP_VERSION}`;
        const token = this.md5hex(`${ts}${secret}`);
        return [token, tokenparam];
    }
    static decodeRespData(data, ts, secret = JmMagicConstants.APP_DATA_SECRET) {
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
        }
        catch (error) {
            console.warn(`解密失败，返回原始数据: ${error.message}`);
            // 如果解密失败，尝试直接返回数据（可能已经是解密的）
            try {
                JSON.parse(data);
                return data;
            }
            catch {
                throw new Error(`数据既不是有效的加密数据也不是有效的JSON: ${data.substring(0, 50)}...`);
            }
        }
    }
}
// API响应类
class JmApiResp {
    resp;
    ts;
    constructor(resp, ts) {
        this.resp = resp;
        this.ts = ts;
    }
    get rawResponse() {
        return this.resp;
    }
    get isSuccess() {
        return this.resp.status === 200;
    }
    get json() {
        try {
            return this.resp.data;
        }
        catch (error) {
            throw new Error(`JSON解析失败: ${error.message}`);
        }
    }
    get isSuccessful() {
        return this.isSuccess && this.json.code === 200;
    }
    get encodedData() {
        return this.json.data;
    }
    get decodedData() {
        return JmCryptoTool.decodeRespData(this.encodedData, this.ts);
    }
    get resData() {
        if (!this.isSuccessful) {
            throw new Error(`API请求失败: code=${this.json.code}`);
        }
        try {
            return JSON.parse(this.decodedData);
        }
        catch (error) {
            console.log(`解析解密数据失败: ${error.message}`);
            // 如果解密数据解析失败，尝试直接返回原始data
            return this.json.data;
        }
    }
    get modelData() {
        return this.resData;
    }
}
// 高级字典类实现
class AdvancedDictImpl {
    data = {};
    constructor(obj = {}) {
        this.data = { ...obj };
    }
    get srcDict() {
        return { ...this.data };
    }
}
// 目录规则类实现
class DirRuleImpl {
    rule;
    baseDir;
    constructor(rule = 'Bd', baseDir) {
        this.rule = rule;
        this.baseDir = baseDir || 'downloads';
    }
    decideImageSaveDir(album, photo) {
        return path.join(this.baseDir, album.title);
    }
    decideAlbumRootDir(album) {
        return path.join(this.baseDir, album.title);
    }
}
// JmOption 类实现
class JmOptionImpl {
    dirRule;
    client;
    download;
    plugins;
    filepath;
    constructor(config) {
        this.dirRule = new DirRuleImpl(config.dirRule.rule, config.dirRule.baseDir);
        this.client = new AdvancedDictImpl(config.client || {});
        this.download = new AdvancedDictImpl(config.download || {});
        this.plugins = new AdvancedDictImpl(config.plugins || {});
        this.filepath = config.filepath;
    }
    static default() {
        return new JmOptionImpl({
            dirRule: { rule: 'Bd', baseDir: 'downloads' },
            download: {},
            client: {},
            plugins: {}
        });
    }
    buildJmClient() {
        return new JmApiClientImpl();
    }
}
exports.JmOptionImpl = JmOptionImpl;
exports.JmOption = JmOptionImpl;
// 真实的 JmApi客户端实现
class JmApiClientImpl {
    domainList = JmModuleConfig.DOMAIN_API_LIST;
    retryTimes = 3;
    currentDomainIndex = 0;
    API_ALBUM = '/album';
    API_CHAPTER = '/chapter';
    API_SCRAMBLE = '/chapter_view_template';
    async getAlbumDetail(albumId) {
        // 获取本子详情: ${albumId}
        const resp = await this.reqApi(`${this.API_ALBUM}?id=${albumId}`);
        const data = resp.resData;
        if (!data || !data.name) {
            throw new Error(`本子 ${albumId} 不存在或数据无效`);
        }
        return this.parseAlbumData(albumId, data);
    }
    async getPhotoDetail(photoId, fetchAlbum = true, fetchScrambleId = true) {
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
            }
            catch (error) {
                console.log(`获取scramble_id失败: ${error.message}，使用默认值`);
                photo.scrambleId = JmMagicConstants.SCRAMBLE_220980.toString();
            }
        }
        return photo;
    }
    async getScrambleId(photoId) {
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
        }
        catch (error) {
            console.log(`请求scramble_id失败: ${error.message}`);
            return JmMagicConstants.SCRAMBLE_220980;
        }
    }
    async reqApiForScramble(url) {
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
                    const resp = await axios_1.default.get(fullUrl, {
                        headers,
                        timeout: 30000,
                        validateStatus: function (status) {
                            return status >= 200 && status < 300; // 只接受 2xx 状态码
                        }
                    });
                    return new JmApiResp(resp, ts);
                }
                catch (error) {
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
    checkPhoto(photo) {
        // 检查章节: ${photo.title}
    }
    async reqApi(url, method = 'GET', data) {
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
                        validateStatus: function (status) {
                            return status >= 200 && status < 300; // 只接受 2xx 状态码
                        }
                    };
                    let resp;
                    if (method === 'GET') {
                        resp = await axios_1.default.get(fullUrl, axiosConfig);
                    }
                    else {
                        resp = await axios_1.default.post(fullUrl, data, axiosConfig);
                    }
                    return new JmApiResp(resp, ts);
                }
                catch (error) {
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
    parseAlbumData(albumId, data) {
        // 解析API返回的本子数据
        // 调试信息已移除
        // 根据实际API响应结构解析
        let episodeList = [];
        if (data.series && Array.isArray(data.series) && data.series.length > 0) {
            episodeList = data.series;
        }
        else {
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
            toFile: (filepath) => { },
            isImage: () => false,
            isPhoto: () => false,
            isAlbum: () => true,
            isPage: () => false,
            getindex: (index) => null,
            [Symbol.iterator]: function* () {
                for (const episode of episodeList) {
                    yield episode;
                }
            }
        };
    }
    parsePhotoData(photoId, data) {
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
            toFile: (filepath) => { },
            isImage: () => false,
            isPhoto: () => true,
            isAlbum: () => false,
            isPage: () => false,
            getindex: (index) => null,
            [Symbol.iterator]: function* () {
                for (let i = 0; i < imageCount; i++) {
                    yield { index: i + 1, filename: `${(i + 1).toString().padStart(5, '0')}.webp` };
                }
            }
        };
    }
    extractAuthor(authors) {
        if (Array.isArray(authors) && authors.length > 0) {
            return authors[0];
        }
        if (typeof authors === 'string') {
            return authors;
        }
        return '未知作者';
    }
    async downloadImage(imageUrl, savePath, scrambleId, decodeImage = true) {
        try {
            // 下载图片: ${imageUrl}
            const response = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    ...JmModuleConfig.APP_HEADERS_IMAGE,
                    'User-Agent': JmModuleConfig.APP_HEADERS_TEMPLATE['user-agent']
                }
            });
            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const imageBuffer = Buffer.from(response.data);
            // 判断是否需要解码图片
            if (!decodeImage || scrambleId === null || scrambleId === undefined) {
                // 不解码，直接保存
                fs.writeFileSync(savePath, imageBuffer);
            }
            else {
                // 解码图片并保存 - 完全对应Python版本的逻辑
                const filename = JmImageTool.getFileNameFromUrl(imageUrl);
                const photoId = this.extractPhotoIdFromUrl(imageUrl);
                const num = JmImageTool.getNum(scrambleId, photoId, filename);
                await JmImageTool.decodeAndSave(num, imageBuffer, savePath);
            }
            return true;
        }
        catch (error) {
            console.log(`[图片] 下载失败: ${imageUrl}, ${error.message}`);
            return false;
        }
    }
    extractPhotoIdFromUrl(url) {
        // 从URL中提取photo ID: https://domain/media/photos/302471/00001.webp -> 302471
        const matches = url.match(/\/media\/photos\/(\d+)\//);
        return matches ? matches[1] : '0';
    }
}
// JmDownloader 类实现
class JmDownloaderImpl {
    option;
    client;
    constructor(option) {
        this.option = option;
        this.client = option.buildJmClient();
    }
    async downloadAlbum(albumId) {
        const album = await this.client.getAlbumDetail(albumId);
        await this.downloadByAlbumDetail(album);
        return album;
    }
    async downloadByAlbumDetail(album) {
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
    async downloadPhotoImages(photo, albumDir) {
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
    buildImageUrl(photo, imageName) {
        // 使用随机的图片域名
        const domain = JmModuleConfig.DOMAIN_IMAGE_LIST[Math.floor(Math.random() * JmModuleConfig.DOMAIN_IMAGE_LIST.length)];
        // 完全对应Python版本: return f'{JmModuleConfig.PROT}{domain}/media/photos/{self.photo_id}/{img_name}'
        return `${JmModuleConfig.PROT}${domain}/media/photos/${photo.photoId}/${imageName}`;
    }
}
exports.JmDownloaderImpl = JmDownloaderImpl;
exports.JmDownloader = JmDownloaderImpl;
//# sourceMappingURL=jmcomic.js.map