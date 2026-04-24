import type { DatasetMetadata, OnChainPublisher } from "../types";
import { SdkError } from "../types";
import { boolCV, intCV, stringAsciiCV, stringUtf8CV, uintCV } from "@stacks/transactions";
import { isValidLatLonDegrees, toMicroDegrees } from "../utils/coords";

export interface StacksRegisterDatasetTx {
  contractAddress: string;
  contractName: string;
  functionName: "register-dataset";
  functionArgs: unknown[];
}

export interface StacksOnChainPublisherOptions {
  contractAddress: string;
  contractName: string;
}

export const createStacksOnChainPublisher = (
  options: StacksOnChainPublisherOptions,
): OnChainPublisher => {
  return {
    buildRegisterDatasetTx(metadata: DatasetMetadata): StacksRegisterDatasetTx {
      if (!metadata.ipfsHash) {
        throw new SdkError("E_ONCHAIN", "metadata.ipfsHash is required for on-chain registration.");
      }

      if (!isValidLatLonDegrees(metadata.latitude, metadata.longitude)) {
        throw new SdkError(
          "E_ONCHAIN",
          "metadata.latitude/metadata.longitude must be valid degrees (lat [-90,90], lon [-180,180]).",
        );
      }

      const latitude = toMicroDegrees(metadata.latitude);
      if (latitude === null) {
        throw new SdkError("E_ONCHAIN", "metadata.latitude must be a finite number (degrees).");
      }
      const longitude = toMicroDegrees(metadata.longitude);
      if (longitude === null) {
        throw new SdkError("E_ONCHAIN", "metadata.longitude must be a finite number (degrees).");
      }

      return {
        contractAddress: options.contractAddress,
        contractName: options.contractName,
        functionName: "register-dataset",
        functionArgs: [
          stringUtf8CV(metadata.name),
          stringUtf8CV(metadata.description),
          stringUtf8CV(metadata.dataType),
          uintCV(BigInt(metadata.collectionDate)),
          uintCV(BigInt(Math.max(0, Math.floor(metadata.altitudeMin)))),
          uintCV(BigInt(Math.max(0, Math.floor(metadata.altitudeMax)))),
          intCV(BigInt(latitude)),
          intCV(BigInt(longitude)),
          stringAsciiCV(metadata.ipfsHash),
          boolCV(metadata.isPublic),
        ],
      };
    },
  };
};
