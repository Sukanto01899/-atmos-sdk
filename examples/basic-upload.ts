import { createIpfsAdapter } from "../src/storage/ipfs";
import { SdkClient } from "../src/client/SdkClient";

const client = new SdkClient({
  baseUrl: "https://api.atmos.example",
  storage: createIpfsAdapter({ endpoint: "http://127.0.0.1:5001" }),
});

const file = new Blob(["hello world"], { type: "text/plain" });

const result = await client.upload(file, {
  metadata: {
    name: "Sample dataset",
    description: "Upload example",
    dataType: "text",
    isPublic: true,
    collectionDate: Date.now(),
    altitudeMin: 0,
    altitudeMax: 0,
    latitude: 0,
    longitude: 0,
  },
});

console.log("Uploaded", result);
const preview = await client.preview(result.id, { format: "auto" });
console.log(preview.rows);
