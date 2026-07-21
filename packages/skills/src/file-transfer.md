---
name: file-transfer
description: Upload or download files between your local machine and a connected server via the file_transfer resource
tags: [files, upload, download]
---

# Transfer files

Use the `file_transfer` MCP resource to move files between the local machine and a connected server.

## Steps

1. Call `list_resource_actions` with `resource: "file_transfer"`.
2. Call `get_resource_action_schema` for `file_transfer.upload` and `file_transfer.download` to learn params.
3. To upload: call `invoke_resource_action` with `resource: "file_transfer"`, `action: "upload"`, and `{ server, localPath, remotePath }`.
4. To download: call with `action: "download"` and `{ server, remotePath, localPath }`.
5. For batch transfers, call `file_transfer.upload_dir` or `file_transfer.download_dir`.

## Tips

- Paths must be absolute. Relative paths are rejected.
- Large files stream in chunks; the call blocks until transfer completes (or `timeoutMs`).
- Permissions are preserved on download; uploads default the remote file to `0644`.
- Symlinks are not followed by default — pass `{ followSymlinks: true }` to follow.
