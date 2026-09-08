# 法语学习资料库

一个使用 Docusaurus 构建的多语言法语学习资料站。默认语言为简体中文，同时提供法语和英语版本。

## 本地开发

项目使用 Node.js 24 和 npm：

```bash
npm install
npm start
```

默认启动中文站点。单独预览其他语言：

```bash
npm start -- --locale fr
npm start -- --locale en
```

## 内容结构

- 中文原文放在 `docs/`。
- 法语翻译放在 `i18n/fr/docusaurus-plugin-content-docs/current/`。
- 英语翻译放在 `i18n/en/docusaurus-plugin-content-docs/current/`。
- 侧栏会根据文件夹结构自动生成；通过各目录的 `_category_.json` 控制栏目名称与顺序。

## 检查与构建

```bash
npm run typecheck
npm run build
npm run serve
```

`npm run build` 会一次生成中文、法语和英语静态站点到 `build/`。

## Cloudflare Pages

在 Cloudflare Pages 中连接 GitHub 仓库，并使用以下构建设置：

| 配置 | 值 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `build` |
| Environment variable | `NODE_VERSION=24` |
| Environment variable | `SITE_URL=https://french.site258.com` |

Cloudflare Pages 项目的生产地址使用 `https://french.site258.com`。之后推送到 `main` 会自动发布，Pull Request 会生成预览部署。
