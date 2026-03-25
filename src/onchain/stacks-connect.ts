import { showContractCall } from "@stacks/connect";
import type { OnChainPublisher } from "../types";
import { SdkError } from "../types";
import type { StacksRegisterDatasetTx, StacksOnChainPublisherOptions } from "./stacks";
import { createStacksOnChainPublisher } from "./stacks";

export interface StacksConnectContractCallBaseOptions {
  userSession: unknown;
  appDetails: unknown;
  network: unknown;
  redirectTo?: string;
  manifestPath?: string;
  defaultProviders?: unknown;
  stxAddress?: string;
  postConditions?: unknown[];
  postConditionMode?: unknown;
}

export interface StacksConnectOnChainPublisherOptions extends StacksOnChainPublisherOptions {
  contractCall: StacksConnectContractCallBaseOptions;
}

export const createStacksConnectOnChainPublisher = (
  options: StacksConnectOnChainPublisherOptions,
): OnChainPublisher => {
  const basePublisher = createStacksOnChainPublisher({
    contractAddress: options.contractAddress,
    contractName: options.contractName,
  });

  return {
    buildRegisterDatasetTx: basePublisher.buildRegisterDatasetTx,

    async submitTx(tx: unknown) {
      const call = tx as Partial<StacksRegisterDatasetTx>;
      if (
        !call ||
        typeof call !== "object" ||
        typeof call.contractAddress !== "string" ||
        typeof call.contractName !== "string" ||
        typeof call.functionName !== "string" ||
        !Array.isArray(call.functionArgs)
      ) {
        throw new SdkError("E_ONCHAIN", "Invalid contract-call tx payload.");
      }

      return await new Promise<{ txId: string; receipt?: unknown }>((resolve, reject) => {
        const onFinish = (data: { txId: string }) => resolve({ txId: data.txId, receipt: data });
        const onCancel = () => reject(new SdkError("E_CANCEL", "User cancelled transaction."));

        showContractCall({
          ...(options.contractCall as any),
          contractAddress: call.contractAddress,
          contractName: call.contractName,
          functionName: call.functionName,
          functionArgs: call.functionArgs,
          onFinish,
          onCancel,
        } as any).catch((error: unknown) => {
          reject(new SdkError("E_ONCHAIN", "showContractCall failed.", 0, error));
        });
      });
    },
  };
};

