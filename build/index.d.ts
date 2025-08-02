/**
 * JMComic TypeScript 下载器主入口文件
 * 对应 Python 版本的 simple_jm_downloader.py
 */
export * from './types';
export { JmDownloaderImpl as JmDownloader, JmOptionImpl as JmOption, __version__ } from './jmcomic';
export { SimpleJMDownloader } from './simple-jm-downloader';
export { SimpleJMDownloader as default } from './simple-jm-downloader';
