# Atmos SDK API (Sketch)

## Client

```ts
import { SdkClient } from "@atmos/sdk";

const client = new SdkClient({
  baseUrl: "https://api.atmos.example",
  auth: { getAccessToken: async () => "token" },
  storage: createIpfsAdapter(),
});

await client.upload(file, { metadata });
const data = await client.download(id);
```

## Core Types

- `DatasetMetadata`
- `UploadOptions`, `UploadResult`
- `DownloadOptions`, `DownloadResult`
- `PreviewOptions`, `PreviewResult`
- `VerifyOptions`, `VerifyResult`

## Methods

- `upload(data, options)`
- `download(id, options?)`
- `preview(id, options?)`
- `verify(id, options?)`
- `getMetadata(id)`
- `listDatasets(options?)`

## Storage Adapters

- `createIpfsAdapter()`
- `createS3Adapter()`

### IPFS Options

```ts
createIpfsAdapter({
  endpoint: "http://127.0.0.1:5001",
  cidVersion: 1,
  cidBase: "base32",
  pin: true,
  timeoutMs: 30_000,
});
```

### Resumable Uploads (IPFS MFS)

```ts
await client.upload(file, {
  metadata,
  resumable: true,
  sessionId: "my-upload-session",
  chunkSize: 5 * 1024 * 1024,
});
```

## Utilities

- `withRetry(fn, retries?, delayMs?)`
- `isSdkError(err)`
```
