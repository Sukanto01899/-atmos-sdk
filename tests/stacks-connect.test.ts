import { describe, expect, test, vi } from "vitest";

vi.mock("@stacks/connect", () => {
  return {
    showContractCall: vi.fn(async (options: any) => {
      options.onFinish?.({ txId: "0xdeadbeef" });
    }),
  };
});

import { createStacksConnectOnChainPublisher } from "../src/onchain/stacks-connect";

describe("createStacksConnectOnChainPublisher", () => {
  test("submitTx forwards call to showContractCall and resolves txId", async () => {
    const publisher = createStacksConnectOnChainPublisher({
      contractAddress: "SP000000000000000000002Q6VF78",
      contractName: "atmos-v4",
      contractCall: {
        userSession: {},
        appDetails: { name: "test" },
        network: {},
      },
    });

    const tx = publisher.buildRegisterDatasetTx({
      name: "Name",
      description: "Desc",
      dataType: "type",
      isPublic: true,
      collectionDate: 0,
      altitudeMin: 0,
      altitudeMax: 0,
      latitude: 0,
      longitude: 0,
      ipfsHash: "QmHash",
    });

    const submitted = await publisher.submitTx!(tx);
    expect(submitted.txId).toBe("0xdeadbeef");
  });
});

