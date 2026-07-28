# Forguncy Skills

这是一个为活字格低代码平台（Forguncy）提供 Agent 技能的仓库。

## 安装

使用 `skills` CLI 安装指定 skill：

```bash
npx skills add https://github.com/fgclibrary/skills --skill <skill-name>
```

如果你的环境支持仓库简写，也可以尝试：

```bash
npx skills add fgclibrary/skills --skill <skill-name>
```

示例：

```bash
npx skills add https://github.com/fgclibrary/skills --skill fgcapi-to-openapi
```

<br />

## 当前 Skills

- `fgcapi-to-openapi`：将活字格 API Excel 工作簿转换为可导入 Apifox 的 OpenAPI 3.0 JSON
- `html-slides`：创建统一样式、可离线演示、带讲者讲稿并支持 PDF 导出的 16:9 HTML 幻灯片

## 新增 Skill

1. 复制 `template/skill-template/` 到 `skills/<new-skill-name>/`
2. 将 `SKILL.md.template` 重命名为 `SKILL.md`，将
   `agents/openai.yaml.template` 重命名为 `agents/openai.yaml`
3. 替换全部占位内容，并确保目录名称与 frontmatter 的 `name` 一致
4. 只有确有需要时才增加 `references/`、`assets/` 或 `scripts/`
5. 在本地验证元数据、随附脚本和代表性输出
6. 将新 Skill 作为独立变更提交
