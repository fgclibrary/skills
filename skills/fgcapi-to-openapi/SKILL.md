---
name: fgcapi-to-openapi
description: Convert a Forguncy API Excel workbook into an OpenAPI 3.0 JSON file. Use this when the user provides an `.xlsx` workbook exported or prepared from Forguncy project documentation, wants to import server commands into Apifox, or asks to transform 活字格接口文档 into OpenAPI / Swagger JSON.
---

# FGC API To OpenAPI

Convert a Forguncy API Excel workbook into an OpenAPI 3.0 JSON file suitable for Apifox import.

## Prerequisite

The user must provide an `.xlsx` workbook derived from Forguncy project documentation.

The workbook should contain or be arranged to contain these two sheets:
- `服务端命令列表`
- `服务端命令详情`

This skill assumes the workbook follows that structure. The file name itself is not fixed, but the file must be an `.xlsx`.

## When To Use

Use this skill when the user:
- provides a Forguncy API `.xlsx` workbook
- asks to convert 活字格接口文档 into OpenAPI / Swagger / Apifox JSON
- asks to extract server commands and parameters from Forguncy documentation sheets

## Expected Output

Produce:
- one OpenAPI 3.0 JSON file

The default output path should be:
- `output/spreadsheet/<excel-basename>-openapi.json`

## Workflow

1. Inspect the workbook structure with `openpyxl`.
2. Confirm the relevant sheets:
   - sheet 1: server command list
   - sheet 2: server command details
3. Parse the command list from the first sheet:
   - use the command identifier as the stable interface id
   - treat the description as source material, not as the final interface name
4. Parse the detail sheet into command blocks:
   - detect block starts from command identifiers in column A
   - keep only the first occurrence of each command
   - ignore later duplicate blocks that mainly contain internal command logic
5. Extract for each command:
   - command id
   - public URL
   - HTTP method
   - command summary
   - request parameters
   - array item definitions when present
6. Build OpenAPI 3.0 JSON:
   - map each command to `paths.<path>.<method>`
   - put a concise Chinese command name in `summary`
   - put the original spreadsheet description in `description`
   - use `operationId` = command id
   - put parameters into `requestBody.content.application/json.schema`
   - include an `example`
   - include a placeholder `200` response when the sheet does not define response schema
7. Save the JSON file and tell the user where it was written.

## Naming Guidance

The spreadsheet description is usually too verbose to use directly as the interface name.

Generate a concise Chinese command name for `summary` by combining:
- command id
- URL path
- original description

Prefer normalized action names such as:
- 新增
- 更新
- 编辑
- 删除
- 绑定
- 分配
- 调整
- 重置
- 添加
- 移除

Examples:
- `AddOrg` -> `新增组织`
- `UpdateOrg` -> `更新组织`
- `ResetPassword` -> `重置账户密码`
- `assignRolesToUsers` -> `分配角色到用户`

Keep `description` as the more complete original spreadsheet text.

## Parameter Rules

- Default scalar parameters to `string` unless the spreadsheet clearly indicates a more specific type.
- Convert array parameters into OpenAPI `type: array`.
- If the sheet includes array item fields, represent items as `object` with `properties`.
- Mark listed request parameters as required unless the spreadsheet explicitly says otherwise.
- Set `additionalProperties: false` on request objects and array item objects unless the spreadsheet implies free-form data.

## Output Rules

- Default to OpenAPI version `3.0.3`.
- Use UTF-8 JSON with indentation.
- Normalize paths so they start with `/`.
- If the source uses `~/ServerCommand/...`, convert it to `/ServerCommand/...`.

## Script

Use the bundled script:
- `scripts/fgcapi_to_openapi.py`

Run it like this:

```bash
python3 <skill-dir>/scripts/fgcapi_to_openapi.py <input.xlsx> [output.json]
```

## Response Style

Keep the user-facing response short:
- mention the generated file path
- mention how many commands were extracted
- note that duplicate detail blocks after the first occurrence were ignored
