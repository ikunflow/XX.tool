/**
 * 插件管理器 - PluginManager
 * 负责插件的注册、发现、加载和生命周期管理
 * 
 * 插件接口规范：
 * {
 *   id: string,           // 唯一标识，如 'cutter'
 *   name: string,         // 显示名称，如 '切割压缩模块'
 *   icon: string,         // 图标（HTML实体或emoji）
 *   description: string,  // 简短描述
 *   color: string,        // 主题色 CSS 变量名，如 '--primary-color'
 *   colorHover: string,   // 悬停色 CSS 变量名
 *   cardClass: string,    // 卡片CSS类名后缀，如 'cutter-card'
 *   uploadClass: string,  // 上传区CSS类名后缀，如 'cutter-upload'
 *   render(): string,     // 返回工作区HTML字符串
 *   init(): void,         // 工作区挂载后初始化事件绑定
 *   destroy(): void,      // 离开工作区时清理
 * }
 */

class PluginManager {
    constructor() {
        this._plugins = new Map();
        this._activePlugin = null;
    }

    /** 注册一个插件 */
    register(plugin) {
        if (!plugin.id || !plugin.name || !plugin.render) {
            console.error('[PluginManager] 插件必须包含 id, name, render 字段', plugin);
            return;
        }
        if (this._plugins.has(plugin.id)) {
            console.warn(`[PluginManager] 插件 "${plugin.id}" 已存在，覆盖注册`);
        }
        this._plugins.set(plugin.id, plugin);
    }

    /** 批量注册 */
    registerAll(plugins) {
        plugins.forEach(p => this.register(p));
    }

    /** 获取所有已注册插件 */
    getAll() {
        return Array.from(this._plugins.values());
    }

    /** 获取单个插件 */
    get(id) {
        return this._plugins.get(id);
    }

    /** 生成主页模块卡片HTML */
    renderDashboard() {
        const plugins = this.getAll();
        let cards = '';
        plugins.forEach(p => {
            cards += `
            <div class="module-card ${p.cardClass || ''}" data-plugin="${p.id}">
                <div class="icon">${p.icon || '📦'}</div>
                <h3>${p.name}</h3>
                <p>${p.description || ''}</p>
            </div>`;
        });
        return cards;
    }

    /** 切换到指定插件工作区 */
    switchTo(pluginId) {
        // 销毁当前插件
        if (this._activePlugin) {
            const current = this._plugins.get(this._activePlugin);
            if (current && current.destroy) current.destroy();
        }

        const plugin = this._plugins.get(pluginId);
        if (!plugin) {
            console.error(`[PluginManager] 插件 "${pluginId}" 未注册`);
            return;
        }

        // 隐藏主页
        document.getElementById('mainDashboard').style.display = 'none';

        // 移除旧工作区
        const oldWs = document.getElementById('workspaceContainer');
        if (oldWs) oldWs.remove();

        // 创建新工作区
        const ws = document.createElement('div');
        ws.id = 'workspaceContainer';
        ws.innerHTML = `
            <button class="btn-back" onclick="PM.goHome()">⬅️ 返回主页</button>
            ${plugin.render()}
        `;
        document.querySelector('.container').appendChild(ws);

        // 初始化插件
        if (plugin.init) plugin.init();
        this._activePlugin = pluginId;
    }

    /** 返回主页 */
    goHome() {
        if (this._activePlugin) {
            const current = this._plugins.get(this._activePlugin);
            if (current && current.destroy) current.destroy();
            this._activePlugin = null;
        }
        const ws = document.getElementById('workspaceContainer');
        if (ws) ws.remove();
        document.getElementById('mainDashboard').style.display = '';
    }

    /** 绑定主页卡片点击事件 */
    bindDashboardCards() {
        document.querySelectorAll('.module-card[data-plugin]').forEach(card => {
            card.addEventListener('click', () => {
                this.switchTo(card.dataset.plugin);
            });
        });
    }
}

// 全局单例
const PM = new PluginManager();
