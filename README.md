# 🚀 Super Proxy Switcher Pro

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Platform](https://img.shields.io/badge/Chrome-Extension-4285F4)
![License](https://img.shields.io/badge/License-MIT-green)

一个基于 Chrome **Manifest V3** 标准构建的现代化代理管理扩展。
轻量、快速、功能强大。支持多种代理协议、身份认证、IP 地理位置检测以及配置的导入导出。

## ✨ 核心功能

* **多协议支持**：完美支持 HTTP, HTTPS, SOCKS4, SOCKS5 代理协议。
* **身份认证**：内置 `webRequest` 拦截逻辑，支持带用户名和密码的代理（自动完成 407 认证）。
* **智能状态指示**：
    * **动态角标 (Badge)**：图标上直接显示当前代理状态（OFF / 代理首字母）。
    * **IP 归属地检测**：实时显示当前出口 IP、国家/地区及国旗（基于 `ipwho.is`）。
* **灵活配置**：
    * **Bypass List**：支持自定义不走代理的域名列表（白名单/排除列表）。
    * **编辑管理**：支持对已保存节点的增删改查。
* **数据备份**：支持 JSON 格式的一键导入与导出，方便在不同设备间同步配置。
* **现代化 UI**：简洁的 Tab 布局，操作流畅，适配不同分辨率。

## 📂 项目结构

```text
MyProxySwitcher/
├── manifest.json      # 核心配置文件 (MV3)
├── background.js      # 后台服务 (处理代理设置、认证、图标更新)
├── popup.html         # 插件弹窗界面
├── popup.js           # 前端交互逻辑 (CRUD、IP检测、导入导出)
├── styles.css         # 界面样式表
└── icons/             # 图标资源文件夹 (icon16.png, icon48.png, icon128.png)

## 功能特点

- ✅ 支持HTTP、HTTPS和SOCKS5代理协议
- ✅ 代理认证支持
- ✅ 保存多个代理配置并快速切换
- ✅ 实时IP检测与地理位置显示
- ✅ 简洁现代的用户界面
- ✅ 导入/导出代理配置
- ✅ 支持Manifest V3

## 安装方法

### 开发模式安装

1. 克隆或下载本项目到本地
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 启用右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹。