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
- `UploadBundleOptions`, `UploadBundleResult`
- `DownloadOptions`, `DownloadResult`
- `DownloadBundleOptions`
- `PreviewOptions`, `PreviewResult`
- `VerifyOptions`, `VerifyResult`
- `DatasetBundleManifest`
- `VerifyBundleResult`

## Methods

- `health()`
- `upload(data, options)`
- `uploadBundle(options)`
- `publish(options)`
- `download(id, options?)`
- `downloadBundleManifest(id, options?)`
- `downloadBundleFile(id, path, options?)`
- `preview(id, options?)`
- `verify(id, options?)`
- `verifyBundle(id, options?)`
- `getMetadata(id)`
- `listDatasets(options?)` (sent as query params; supports `limit`, `cursor`, and `sort`)
  - `tags` is sent as a comma-separated list (example: `tags=wind,hourly`)
  - supports geo/altitude + status filters when the API supports them: `bbox`, `altitudeMin`, `altitudeMax`, `verified`, `metadataFrozen`, `createdAtFrom`, `createdAtTo`
- `listTags(options?)` (returns tag counts for the same filter options)

## Storage Adapters

- `createIpfsAdapter()`
- `createS3Adapter()`

## Registry / On-chain Helpers

- `createHttpRegistry(transport, options?)`
- `createStacksOnChainPublisher({ contractAddress, contractName })`
- `createStacksConnectOnChainPublisher({ contractAddress, contractName, contractCall })`

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
- `parseCsvWithHeader(text, maxRows)`
- `inferSchema(rows, options?)`
```
