import { describe, expect, test } from "vitest";
import { getDatasetLinksFromMetadata } from "../src/utils/datasetLinks";
import type { DatasetMetadata } from "../src/types";

const baseMetadata = (): DatasetMetadata => ({
  id: 123,
  name: "Delta Wind Profile",
  description: "Hourly lower-atmosphere wind measurements over the delta.",
  dataType: "wind",
  owner: "SP1WINDPROFILE000000000000000000000001",
  status: "verified",
  isPublic: true,
  collectionDate: 1704067200,
  createdAt: 865432,
  altitudeMin: 120,
  altitudeMax: 3200,
  latitude: 23.65,
  longitude: 90.55,
  ipfsHash: "QmWindProfileExampleHash",
});

describe("dataset links utils", () => {
  test("builds useful links from metadata", () => {
    const links = getDatasetLinksFromMetadata(baseMetadata(), {
      ipfsGatewayBase: "https://cloudflare-ipfs.com",
    });

    expect(links.ownerExplorerUrl).toContain("https://explorer.hiro.so/address/");
    expect(links.ipfsUri).toBe("ipfs://QmWindProfileExampleHash");
    expect(links.ipfsGatewayUrl).toBe("https://cloudflare-ipfs.com/ipfs/QmWindProfileExampleHash");
    expect(links.openStreetMapUrl).toContain("https://www.openstreetmap.org/");
    expect(links.googleMapsUrl).toContain("https://www.google.com/maps");
    expect(links.geoUri).toBe("geo:23.65,90.55?q=23.65%2C90.55(Delta%20Wind%20Profile)");
  });

  test("supports geoUri disabling", () => {
    const links = getDatasetLinksFromMetadata(baseMetadata(), { geoUri: false });
    expect(links.geoUri).toBeNull();
  });

  test("nulls map + geo when coords invalid", () => {
    const links = getDatasetLinksFromMetadata({ ...baseMetadata(), longitude: 181 });
    expect(links.openStreetMapUrl).toBeNull();
    expect(links.googleMapsUrl).toBeNull();
    expect(links.geoUri).toBeNull();
  });
});

