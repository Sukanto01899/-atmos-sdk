import type { DatasetMetadata } from "../types";
import type { StacksExplorerOptions } from "./stacksExplorer";
import type { OpenStreetMapOptions } from "./openStreetMap";
import type { GoogleMapsOptions } from "./googleMaps";
import { toStacksExplorerAddressUrl } from "./stacksExplorer";
import { toIpfsGatewayUrl, toIpfsUri } from "./ipfs";
import { toOpenStreetMapUrl } from "./openStreetMap";
import { toGoogleMapsUrl } from "./googleMaps";
import { toGeoUri } from "./geoUri";
import { isValidLatLonDegrees } from "./coords";

export type DatasetLinksOptions = {
  stacksExplorer?: StacksExplorerOptions;
  ipfsGatewayBase?: string;
  openStreetMap?: OpenStreetMapOptions;
  googleMaps?: GoogleMapsOptions;
  geoUri?: { label?: string; query?: string } | boolean;
};

export type DatasetLinks = {
  ownerExplorerUrl: string | null;
  ipfsUri: string | null;
  ipfsGatewayUrl: string | null;
  openStreetMapUrl: string | null;
  googleMapsUrl: string | null;
  geoUri: string | null;
};

export const getDatasetLinksFromMetadata = (
  metadata: DatasetMetadata,
  options?: DatasetLinksOptions,
): DatasetLinks => {
  const coordsOk = isValidLatLonDegrees(metadata.latitude, metadata.longitude);

  const geoOpt = options?.geoUri;
  const geoEnabled = geoOpt === true || typeof geoOpt === "object" || geoOpt === undefined;
  const geoLabel =
    typeof geoOpt === "object" ? geoOpt.label : metadata.name;
  const geoQuery = typeof geoOpt === "object" ? geoOpt.query : undefined;

  return {
    ownerExplorerUrl: metadata.owner
      ? toStacksExplorerAddressUrl(metadata.owner, options?.stacksExplorer)
      : null,
    ipfsUri: metadata.ipfsHash ? toIpfsUri(metadata.ipfsHash) : null,
    ipfsGatewayUrl: metadata.ipfsHash
      ? toIpfsGatewayUrl(metadata.ipfsHash, options?.ipfsGatewayBase)
      : null,
    openStreetMapUrl: coordsOk
      ? toOpenStreetMapUrl(metadata.latitude, metadata.longitude, options?.openStreetMap)
      : null,
    googleMapsUrl: coordsOk
      ? toGoogleMapsUrl(metadata.latitude, metadata.longitude, options?.googleMaps)
      : null,
    geoUri:
      geoEnabled && coordsOk
        ? toGeoUri(metadata.latitude, metadata.longitude, {
            label: geoLabel,
            query: geoQuery,
          })
        : null,
  };
};

