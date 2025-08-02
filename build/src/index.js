"use strict";
/**
 * JMComic TypeScript 下载器主入口文件
 * 对应 Python 版本的 simple_jm_downloader.py
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.SimpleJMDownloader = exports.__version__ = exports.JmOption = exports.JmDownloader = void 0;
// 导出类型定义
__exportStar(require("./types"), exports);
// 导出具体实现类
var jmcomic_1 = require("./jmcomic");
Object.defineProperty(exports, "JmDownloader", { enumerable: true, get: function () { return jmcomic_1.JmDownloaderImpl; } });
Object.defineProperty(exports, "JmOption", { enumerable: true, get: function () { return jmcomic_1.JmOptionImpl; } });
Object.defineProperty(exports, "__version__", { enumerable: true, get: function () { return jmcomic_1.__version__; } });
// 导出主要功能类
var simple_jm_downloader_1 = require("./simple-jm-downloader");
Object.defineProperty(exports, "SimpleJMDownloader", { enumerable: true, get: function () { return simple_jm_downloader_1.SimpleJMDownloader; } });
// 主要类的别名导出
var simple_jm_downloader_2 = require("./simple-jm-downloader");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return simple_jm_downloader_2.SimpleJMDownloader; } });
//# sourceMappingURL=index.js.map