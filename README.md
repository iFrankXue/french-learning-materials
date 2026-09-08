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

- 中文原文放在 `docs/`，它是文档内容的唯一来源。
- 法语和英语文档由翻译脚本增量生成到 `i18n/`；不要直接修改生成的翻译文件。
- 侧栏会根据文件夹结构自动生成；通过各目录的 `_category_.json` 控制栏目名称与顺序。

## 自动翻译与发布

首次使用时，在 OpenAI 平台创建 API 密钥，然后配置本机文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，将 `OPENAI_API_KEY` 替换为真实密钥。这个文件已被 Git 忽略，不会上传到 GitHub。

在 VS Code 中编辑 `docs/` 后，打开命令面板并选择 **Tasks: Run Build Task**，即可运行“翻译并发布资料库”。它会：

1. 只翻译发生变化的中文文档和栏目配置；
2. 更新法语及英语文件；
3. 完成类型检查和三语生产构建；
4. 提交内容并推送到 `main`；
5. 触发 Cloudflare Pages 自动部署。

也可以在终端中运行：

```bash
# 只更新翻译
npm run translate

# 检查三种语言是否同步
npm run translate:check

# 翻译、检查、提交、推送并触发部署
npm run publish:content

# 强制重新翻译全部文档
npm run translate -- --force
```

可以给发布提交指定说明：

```bash
npm run publish:content -- "新增发音学习资料"
```

## 检查与构建

```bash
npm run typecheck
npm run translate:check
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
