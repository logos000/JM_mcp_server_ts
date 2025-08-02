/**
 * TypeScript 类型定义，对应 Python jmcomic 模块
 */

// 基础类型
export interface AdvancedDict<T = any> {
    [key: string]: T;
}

// 实体类接口
export interface JmBaseEntity {
    toFile(filepath: string): void;
    isImage(): boolean;
    isPhoto(): boolean;
    isAlbum(): boolean;
    isPage(): boolean;
}

export interface Downloadable {
    exists: boolean;
    skip: boolean;
}

export interface IndexedEntity {
    getindex(index: number): any;
    length: number;
    [Symbol.iterator](): Iterator<any>;
}

export interface DetailEntity extends JmBaseEntity, IndexedEntity {
    id: string;
    title: string;
    author: string;
    oname: string;
    authoroname: string;
    idoname: string;
}

// 图片详情接口
export interface JmImageDetail extends JmBaseEntity, Downloadable {
    aid: string;
    scrambleId: string;
    imgUrl: string;
    imgFileName: string;
    imgFileSuffix: string;
    fromPhoto?: JmPhotoDetail;
    queryParams?: string;
    index: number;
    filenameWithoutSuffix: string;
    filename: string;
    isGif: boolean;
    downloadUrl: string;
    tag: string;
}

// 章节详情接口
export interface JmPhotoDetail extends DetailEntity, Downloadable {
    photoId: string;
    name: string;
    seriesId: string;
    sort: number;
    tags: string[];
    scrambleId: string;
    pageArr?: any[];
    dataOriginalDomain?: string;
    dataOriginal0?: string;
    fromAlbum?: JmAlbumDetail;
    isSingleAlbum: boolean;
    indextitle: string;
    albumId: string;
    albumIndex: number;
}

// 本子详情接口
export interface JmAlbumDetail extends DetailEntity, Downloadable {
    albumId: string;
    scrambleId: string;
    name: string;
    episodeList: any[];
    pageCount: number;
    pubDate: string;
    updateDate: string;
    likes: number;
    views: number;
    commentCount: number;
    works: any[];
    actors: any[];
    authors: any[];
    tags: string[];
    relatedList?: any[];
    description: string;
}

// 客户端接口
export interface JmcomicClient {
    getAlbumDetail(albumId: string): Promise<JmAlbumDetail>;
    getPhotoDetail(photoId: string, fetchAlbum?: boolean, fetchScrambleId?: boolean): Promise<JmPhotoDetail>;
    checkPhoto(photo: JmPhotoDetail): void;
}

// 下载器选项接口
export interface JmOptionConfig {
    dirRule: {
        rule: string;
        baseDir: string;
    };
    download: AdvancedDict;
    client: AdvancedDict;
    plugins: AdvancedDict;
}

// 下载器选项类接口
export interface JmOption {
    dirRule: DirRule;
    client: AdvancedDict;
    download: AdvancedDict;
    plugins: AdvancedDict;
    filepath?: string;
    buildJmClient(): JmcomicClient;
}

// 目录规则接口
export interface DirRule {
    rule: string;
    baseDir?: string;
    decideImageSaveDir(album: JmAlbumDetail, photo: JmPhotoDetail): string;
    decideAlbumRootDir(album: JmAlbumDetail): string;
}

// 下载器接口
export interface JmDownloaderInterface {
    option: JmOption;
    client: JmcomicClient;
    downloadAlbum(albumId: string): Promise<JmAlbumDetail>;
    downloadByAlbumDetail(album: JmAlbumDetail): Promise<void>;
}

// 下载结果接口
export interface DownloadResult {
    success: boolean;
    albumId?: string;
    title?: string;
    author?: string;
    downloadedFiles?: {
        directory: string | null;
        fileCount: number;
        files: string[];
    };
    result?: string;
    error?: string;
    message?: string;
}

// 本子信息接口
export interface AlbumInfo {
    id: string;
    title: string;
    author: string;
    chapterCount: number;
    pageCount: number;
    tags: string[];
    success: boolean;
    firstChapter?: {
        id: string;
        title: string;
        imageCount: number;
        sampleImages: string[];
    } | null;
    error?: string;
} 