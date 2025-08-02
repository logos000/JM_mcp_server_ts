/**
 * JMComic TypeScript 下载器主入口文件
 * 对应 Python 版本的 simple_jm_downloader.py
 */

// 导出类型定义
export * from './types';

// 导出具体实现类
export { JmDownloaderImpl as JmDownloader, JmOptionImpl as JmOption, __version__ } from './jmcomic';

// 导出主要功能类
export { SimpleJMDownloader } from './simple-jm-downloader';

// 主要类的别名导出
export { SimpleJMDownloader as default } from './simple-jm-downloader'; 