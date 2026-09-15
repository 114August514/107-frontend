# 消费的 API 契约

`openapi.json` 是后端固定提交的快照，`source.json` 记录来源和 SHA-256。
更新时从选定的后端提交获取契约，更新来源记录，再运行 `pnpm run generate:api`。
快照、来源和生成类型一起提交。禁止手改快照或依赖后端工作区相对路径。
