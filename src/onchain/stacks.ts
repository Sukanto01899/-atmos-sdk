import type { DatasetMetadata, OnChainPublisher } from "../types";
import { SdkError } from "../types";
import { boolCV, intCV, stringAsciiCV, stringUtf8CV, uintCV } from "@stacks/transactions";

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

const toMicroDegrees = (degrees: number) => Math.round(degrees * 1_000_000);

export const createStacksOnChainPublisher = (
  options: StacksOnChainPublisherOptions,
): OnChainPublisher => {
  return {
    buildRegisterDatasetTx(metadata: DatasetMetadata): StacksRegisterDatasetTx {
      if (!metadata.ipfsHash) {
        throw new SdkError("E_ONCHAIN", "metadata.ipfsHash is required for on-chain registration.");
      }

      const latitude = toMicroDegrees(metadata.latitude);
      const longitude = toMicroDegrees(metadata.longitude);

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

