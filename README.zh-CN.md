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
2. 完成 `SKILL.md`
3. 按需增加脚本、示例或备注文件
4. 本地验证该 skill
5. 以独立变更提交
