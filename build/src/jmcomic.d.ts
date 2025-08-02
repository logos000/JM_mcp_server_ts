/**
 * JMComic TypeScript 实现
 * 对应 Python 版本的 jmcomic 模块
 * 实现真实的API调用和图片下载
 */
import { JmOption, JmDownloaderInterface, JmcomicClient, JmAlbumDetail, JmPhotoDetail, DirRule, AdvancedDict } from './types';
export declare const __version__ = "2.6.4";
export declare class JmOptionImpl implements JmOption {
    dirRule: DirRule;
    client: AdvancedDict;
    download: AdvancedDict;
    plugins: AdvancedDict;
    filepath?: string;
    constructor(config: {
        dirRule: {
            rule?: string;
            baseDir?: string;
        };
        download?: any;
        client?: any;
        plugins?: any;
        filepath?: string;
    });
    static default(): JmOption;
    buildJmClient(): JmcomicClient;
}
declare class JmApiClientImpl implements JmcomicClient {
    private domainList;
    private retryTimes;
    private currentDomainIndex;
    private API_ALBUM;
    private API_CHAPTER;
    private API_SCRAMBLE;
    private API_SEARCH;
    private API_CATEGORIES_FILTER;
    getAlbumDetail(albumId: string): Promise<JmAlbumDetail>;
    getPhotoDetail(photoId: string, fetchAlbum?: boolean, fetchScrambleId?: boolean): Promise<JmPhotoDetail>;
    getScrambleId(photoId: string): Promise<number>;
    private reqApiForScramble;
    checkPhoto(photo: JmPhotoDetail): void;
    searchComics(params: {
        query: string;
        page?: number;
        mainTag?: number;
        orderBy?: string;
        time?: string;
    }): Promise<any>;
    filterByCategory(params: {
        category?: string;
        time?: string;
        orderBy?: string;
        page?: number;
    }): Promise<any>;
    private reqApi;
    private parseAlbumData;
    private parsePhotoData;
    private extractAuthor;
    downloadImage(imageUrl: string, savePath: string, scrambleId?: number | string, decodeImage?: boolean): Promise<boolean>;
    private extractPhotoIdFromUrl;
}
export declare class JmDownloaderImpl implements JmDownloaderInterface {
    option: JmOption;
    client: JmApiClientImpl;
    constructor(option: JmOption);
    downloadAlbum(albumId: string): Promise<JmAlbumDetail>;
    downloadByAlbumDetail(album: JmAlbumDetail): Promise<void>;
    private downloadPhotoImages;
    private buildImageUrl;
}
export { JmDownloaderImpl as JmDownloader };
export { JmOptionImpl as JmOption };
