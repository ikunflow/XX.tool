/**
 * 工具函数库 - Utils
 * 所有插件共用的基础函数，避免重复实现。
 */

const Utils = (function () {
    'use strict';

    // ==================== 文件大小格式化 ====================
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
        return size + ' ' + units[i];
    }

    // ==================== 图片递归压缩引擎 ====================
    /**
     * 递归压缩图片直到大小 <= maxBytes
     * @param {HTMLCanvasElement} canvas 源画布
     * @param {number} quality 初始JPEG质量 (0-1)
     * @param {number} maxBytes 目标最大字节数
     * @param {function(Blob)} callback 完成回调，传入压缩后的Blob
     */
    function compressEngine(canvas, quality, maxBytes, callback, mimeType) {
        mimeType = mimeType || 'image/jpeg';
        // PNG 是无损格式，质量参数无效，直接尝试降分辨率
        if (mimeType === 'image/png') {
            canvas.toBlob(function (blob) {
                if (blob.size <= maxBytes) {
                    callback(blob);
                } else {
                    // PNG 降分辨率
                    var shrink = document.createElement('canvas');
                    shrink.width = Math.floor(canvas.width * 0.85);
                    shrink.height = Math.floor(canvas.height * 0.85);
                    shrink.getContext('2d').drawImage(canvas, 0, 0, shrink.width, shrink.height);
                    compressEngine(shrink, quality, maxBytes, callback, mimeType);
                }
            }, mimeType);
            return;
        }
        // JPEG / WebP 支持质量调节
        canvas.toBlob(function (blob) {
            if (blob.size <= maxBytes || quality <= 0.1) {
                if (blob.size > maxBytes) {
                    // 降分辨率兜底
                    var shrink = document.createElement('canvas');
                    shrink.width = Math.floor(canvas.width * 0.85);
                    shrink.height = Math.floor(canvas.height * 0.85);
                    shrink.getContext('2d').drawImage(canvas, 0, 0, shrink.width, shrink.height);
                    compressEngine(shrink, 0.9, maxBytes, callback, mimeType);
                } else {
                    callback(blob);
                }
            } else {
                compressEngine(canvas, quality - 0.05, maxBytes, callback, mimeType);
            }
        }, mimeType, quality);
    }

    // ==================== 通用ZIP打包下载 ====================
    /**
     * 将文件列表打包为ZIP并触发下载
     * @param {Array<{blob: Blob, name: string, folder?: string}>} files 文件列表
     * @param {string} zipName ZIP文件名
     * @returns {Promise}
     */
    function zipAndDownload(files, zipName) {
        var zip = new JSZip();
        files.forEach(function (item) {
            if (item.folder) {
                zip.folder(item.folder).file(item.name, item.blob);
            } else {
                zip.file(item.name, item.blob);
            }
        });
        return zip.generateAsync({ type: 'blob' }).then(function (content) {
            saveAs(content, zipName);
        });
    }

    // ==================== 设置栏生成器 ====================
    /**
     * 根据配置数组生成 settings-bar HTML
     * @param {Array} configs 配置项数组
     *   每项结构: { label, type, id, value, options, min, max, step, unit, onChange, checked, style }
     *   type: 'number' | 'select' | 'text' | 'range' | 'checkbox'
     *   options: [{ label, value }] (仅 select 类型)
     * @returns {string} HTML字符串
     */
    function createSettingsBar(configs) {
        var html = '<div class="settings-bar">';
        configs.forEach(function (cfg) {
            html += '<div class="setting-item">';
            if (cfg.label) {
                html += '<label for="' + cfg.id + '">' + cfg.label + '</label>';
            }

            switch (cfg.type) {
                case 'select':
                    html += '<select id="' + cfg.id + '"' + (cfg.onChange ? ' onchange="' + cfg.onChange + '"' : '') + '>';
                    (cfg.options || []).forEach(function (opt) {
                        var sel = opt.value === cfg.value ? ' selected' : '';
                        html += '<option value="' + opt.value + '"' + sel + '>' + opt.label + '</option>';
                    });
                    html += '</select>';
                    break;
                case 'number':
                    html += '<input type="number" id="' + cfg.id + '" value="' + (cfg.value || 0) + '"';
                    if (cfg.min !== undefined) html += ' min="' + cfg.min + '"';
                    if (cfg.max !== undefined) html += ' max="' + cfg.max + '"';
                    if (cfg.step !== undefined) html += ' step="' + cfg.step + '"';
                    if (cfg.style) html += ' style="' + cfg.style + '"';
                    html += '>';
                    break;
                case 'text':
                    html += '<input type="text" id="' + cfg.id + '" value="' + (cfg.value || '') + '"';
                    if (cfg.placeholder) html += ' placeholder="' + cfg.placeholder + '"';
                    if (cfg.style) html += ' style="' + cfg.style + '"';
                    html += '>';
                    break;
                case 'range':
                    html += '<input type="range" id="' + cfg.id + '" value="' + (cfg.value || 50) + '"';
                    if (cfg.min !== undefined) html += ' min="' + cfg.min + '"';
                    if (cfg.max !== undefined) html += ' max="' + cfg.max + '"';
                    if (cfg.step !== undefined) html += ' step="' + cfg.step + '"';
                    html += '><span id="' + cfg.id + 'Val">' + cfg.value + (cfg.unit || '') + '</span>';
                    break;
                case 'checkbox':
                    html += '<input type="checkbox" id="' + cfg.id + '"' + (cfg.checked ? ' checked' : '') + '>';
                    if (cfg.checkLabel) {
                        html += '<label for="' + cfg.id + '">' + cfg.checkLabel + '</label>';
                    }
                    break;
            }

            if (cfg.unit) html += '<span>' + cfg.unit + '</span>';
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    // ==================== 通用拖拽绑定 ====================
    /**
     * 为上传区绑定拖拽事件
     * @param {string} dropZoneId 拖拽区DOM元素ID
     * @param {string} fileInputId 隐藏file input的DOM元素ID
     * @param {function(FileList|File)} onFilesCallback 文件回调，多文件传入FileList，单文件传入File
     */
    function setupDragDrop(dropZoneId, fileInputId, onFilesCallback) {
        var zone = document.getElementById(dropZoneId);
        var input = document.getElementById(fileInputId);
        if (!zone || !input) return;

        // 点击上传
        zone.addEventListener('click', function () {
            input.click();
        });

        // file input change
        input.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                onFilesCallback(e.target.files);
            }
        });

        // 拖拽事件
        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', function () {
            zone.classList.remove('dragover');
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                onFilesCallback(e.dataTransfer.files);
            }
        });
    }

    // ==================== 从File加载图片 ====================
    /**
     * 从File对象加载HTMLImageElement
     * @param {File} file 图片文件
     * @returns {Promise<HTMLImageElement>}
     */
    function loadImageFromFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = new Image();
                img.onload = function () { resolve(img); };
                img.onerror = function () { reject(new Error('图片加载失败: ' + file.name)); };
                img.src = e.target.result;
            };
            reader.onerror = function () { reject(new Error('文件读取失败: ' + file.name)); };
            reader.readAsDataURL(file);
        });
    }

    // ==================== 数字转字母序号 ====================
    function convertToAlphabet(i) {
        var c = '';
        while (i >= 0) {
            c = String.fromCharCode((i % 26) + 97) + c;
            i = Math.floor(i / 26) - 1;
        }
        return c;
    }

    // ==================== 通用清理函数 ====================
    function resetFileInput(inputId) {
        var el = document.getElementById(inputId);
        if (el) el.value = '';
    }

    function setStatus(statusId, message) {
        var el = document.getElementById(statusId);
        if (el) el.textContent = message;
    }

    function showElement(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'block';
    }

    function hideElement(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    // ==================== 全局拖拽事件拦截 ====================
    function setupGlobalDragPrevention() {
        window.addEventListener('dragover', function (e) { e.preventDefault(); });
        window.addEventListener('drop', function (e) { e.preventDefault(); });
    }

    // ==================== 导出 ====================
    return {
        formatSize: formatSize,
        compressEngine: compressEngine,
        zipAndDownload: zipAndDownload,
        createSettingsBar: createSettingsBar,
        setupDragDrop: setupDragDrop,
        loadImageFromFile: loadImageFromFile,
        convertToAlphabet: convertToAlphabet,
        resetFileInput: resetFileInput,
        setStatus: setStatus,
        showElement: showElement,
        hideElement: hideElement,
        setupGlobalDragPrevention: setupGlobalDragPrevention
    };
})();