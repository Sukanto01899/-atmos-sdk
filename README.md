# Atmos SDK

TypeScript SDK for uploading, downloading, verifying, and previewing datasets.

## Features

- Upload with resumable sessions
- Download with streaming or range reads
- Preview data and inspect schema
- Verify integrity hashes

## Install

```bash
npm install @atmos/sdk
```

## Quick start

```ts
import { SdkClient, createIpfsAdapter } from "@atmos/sdk";

const client = new SdkClient({
  baseUrl: "https://api.atmos.example",
  storage: createIpfsAdapter({
    endpoint: "https://ipfs.example",
    pin: true,
  }),
});

const metadata = {
  name: "Gulf Stream Snapshot",
  description: "Surface temperature tiles for 2026-01-15.",
  dataType: "imagery",
  isPublic: true,
  collectionDate: 1764768000,
  altitudeMin: 0,
  altitudeMax: 0,
  latitude: 26.1,
  longitude: -79.9,
};

const file = new Blob(["lat,lon,temp\n26.1,-79.9,26.2\n"], {
  type: "text/csv",
});

const upload = await client.upload(file, { metadata });
console.log(upload.id, upload.location);
```

## Common tasks

### Upload (resumable)

```ts
const result = await client.upload(file, {
  metadata,
  resumable: true,
  chunkSize: 5 * 1024 * 1024,
  onProgress: ({ uploadedBytes, totalBytes, percent }) => {
    console.log(uploadedBytes, totalBytes, percent);
  },
});
```

### Batch upload

```ts
const batch = await client.uploadBatch(
  [
    { data: fileA, options: { metadata: metaA } },
    { data: fileB, options: { metadata: metaB } },
  ],
  {
    concurrency: 3,
    retries: 2,
    retryDelayMs: 400,
    stopOnError: false,
    onProgress: (progress) => console.log(progress),
  },
);

const successes = batch.filter((item) => item.status === "fulfilled");
const failures = batch.filter((item) => item.status === "rejected");
```

### Upload bundle (multi-file)

Uploads a directory CID containing your files plus `manifest.json` with per-file SHA-256 checksums.

```ts
const bundle = await client.uploadBundle({
  metadata,
  files: [
    { path: "data/part-001.csv", data: fileA },
    { path: "data/part-002.csv", data: fileB },
  ],
});

console.log(bundle.id); // directory CID
```

### Download bundle manifest / file

```ts
const manifest = await client.downloadBundleManifest(bundle.id);
const { data } = await client.downloadBundleFile(bundle.id, "data/part-001.csv");
```

### Download

```ts
const { data } = await client.download("QmHash");
if (data) {
  const text = new TextDecoder().decode(data);
  console.log(text);
}
```

### Download (stream)

```ts
const { stream } = await client.download("QmHash", { asStream: true });
if (stream) {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value.byteLength);
  }
}
```

### Batch download

```ts
const results = await client.downloadBatch(
  [{ id: "QmA" }, { id: "QmB" }],
  { concurrency: 4 },
);
```

### Preview

```ts
const preview = await client.preview("QmHash", { maxRows: 5, format: "csv" });
console.table(preview.rows);
```

Preview now returns `schema` when available (CSV/JSON/NDJSON auto-detect).

### Verify

```ts
const result = await client.verify("QmHash", {
  checksum: "ab12...ef",
  sizeBytes: 1024,
});
console.log(result.ok, result.reason);
```

### Publish (upload + checksum + register)

```ts
import {
  SdkClient,
  httpTransport,
  createHttpRegistry,
  createStacksOnChainPublisher,
} from "@atmos/sdk";

const baseUrl = "https://api.atmos.example";
const transport = httpTransport({ baseUrl });

const client = new SdkClient({
  baseUrl,
  transport,
  storage,
  registry: createHttpRegistry(transport),
  onchain: createStacksOnChainPublisher({ contractAddress: "SP…", contractName: "atmos-v4" }),
});

const published = await client.publish({
  kind: "file",
  data: file,
  metadata,
  target: "both",
  broadcastOnChainTx: false, // for wallet flow, use createStacksConnectOnChainPublisher(...)
});
```

## Listing datasets (pagination)

```ts
const page1 = await client.listDatasets({
  limit: 25,
  cursor: "0",
  sort: "created_at_desc",
  tags: ["wind", "hourly"],
});
const page2 = page1.nextCursor
  ? await client.listDatasets({ limit: 25, cursor: page1.nextCursor, sort: "created_at_desc" })
  : null;
```

## Listing tags

```ts
const tags = await client.listTags({ isPublic: true });
console.table(tags.items);
```

## Authentication

```ts
const client = new SdkClient({
  baseUrl: "https://api.atmos.example",
  auth: {
    getAccessToken: async () => "token",
  },
});
```

## Storage adapters

### IPFS

```ts
import { createIpfsAdapter } from "@atmos/sdk";

const storage = createIpfsAdapter({
  endpoint: "https://ipfs.example",
  headers: {
    authorization: "Basic ...",
  },
  pin: true,
  timeoutMs: 30_000,
  cidVersion: 1,
  cidBase: "base32",
  mfsRoot: "/atmos",
});
```

### S3

```ts
import { createS3Adapter } from "@atmos/sdk";

const storage = createS3Adapter({
  bucket: "atmos-datasets",
  region: "us-east-1",
});
```

## Errors

All SDK errors throw `SdkError` with `code`, `message`, and optional `status`.

```ts
import { SdkError } from "@atmos/sdk";

try {
  await client.download("bad-id");
} catch (error) {
  if (error instanceof SdkError) {
    console.error(error.code, error.status, error.message);
  }
}
```

## Environment notes

- Browser: `Blob` and `ReadableStream` are available.
- Node.js: use `undici` or a fetch polyfill if needed.

## API reference

See `docs/API.md` for the full API surface.
