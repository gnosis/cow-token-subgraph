import {
  clearStore,
  test,
  assert,
  logStore,
} from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { handleTransfer, COW_TOKEN } from "../src/mapping";
import {
  mockTransferEvent,
  handleMultipleTransfers,
  REGULAR_ACCOUNT,
  NON_CIRCULATING,
} from "./utils";
import { Holder, Supply } from "../generated/schema";

const TWO = BigInt.fromI32(2);

class TestStore {
  holders: Holder[];
  supply: Supply;
}

function setupStore(): TestStore {
  /// Two Mint 2000 tokens with half going to a regular account
  //  and the other half in a non-circulating account: Store Results in
  // {
  //   "Holder": {
  //     "0x0000000000000000000000000000000000000001": {
  //       "balance": {
  //         "type": "BigInt",
  //         "data": "1000"
  //       },
  //       "id": {
  //         "type": "String",
  //         "data": "0x0000000000000000000000000000000000000001"
  //       }
  //     },
  //     "0xd057b63f5e69cf1b929b356b579cba08d7688048": {
  //       "id": {
  //         "type": "String",
  //         "data": "0xd057b63f5e69cf1b929b356b579cba08d7688048"
  //       },
  //       "balance": {
  //         "type": "BigInt",
  //         "data": "1000"
  //       }
  //     }
  //   },
  //   "Supply": {
  //     "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB": {
  //       "circulating": {
  //         "type": "BigInt",
  //         "data": "1000"
  //       },
  //       "id": {
  //         "type": "String",
  //         "data": "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB"
  //       },
  //       "total": {
  //         "type": "BigInt",
  //         "data": "2000"
  //       }
  //     }
  //   }
  // }
  const amount = BigInt.fromI32(1000);
  let transferEvents = [
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[0], amount, "0x"),
    mockTransferEvent(Address.zero(), NON_CIRCULATING[0], amount, "0x"),
  ];
  handleMultipleTransfers(transferEvents);

  const holder1 = new Holder(REGULAR_ACCOUNT[0].toHex());
  holder1.balance = amount;
  const holder2 = new Holder(NON_CIRCULATING[0].toHex());
  holder2.balance = amount;

  const supply = new Supply(COW_TOKEN);
  supply.circulating = amount;
  supply.total = amount.times(TWO);

  return {
    holders: [holder1, holder2],
    supply,
  };
}

test("Test Setup", () => {
  const testStore = setupStore();
  logStore();
  assert.fieldEquals(
    "Holder",
    REGULAR_ACCOUNT[0].toHex(),
    "balance",
    testStore.holders[0].balance.toString()
  );
  assert.fieldEquals(
    "Holder",
    NON_CIRCULATING[0].toHex(),
    "balance",
    testStore.holders[1].balance.toString()
  );
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "total",
    testStore.supply.total.toString()
  );
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "circulating",
    testStore.supply.circulating.toString()
  );
  clearStore();
});

test("Minting correctly updates the supply", () => {
  const amount = BigInt.fromI32(1337);
  let transferEvents = [
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[0], amount, "0x"),
    mockTransferEvent(Address.zero(), NON_CIRCULATING[0], amount, "0x"),
  ];

  // mint 1337 to Regular account & Non circulating account
  handleMultipleTransfers(transferEvents);
  assert.fieldEquals(
    "Holder",
    REGULAR_ACCOUNT[0].toHex(),
    "balance",
    amount.toString()
  );
  assert.fieldEquals(
    "Holder",
    NON_CIRCULATING[0].toHex(),
    "balance",
    amount.toString()
  );
  // Total supply is 2 * amount
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "total",
    amount.times(TWO).toString()
  );
  // But circulating supply is only amount
  assert.fieldEquals("Supply", COW_TOKEN, "circulating", amount.toString());
  clearStore();
});

test("Burning correctly updates the supply", () => {
  const testStore = setupStore();

  const amount = BigInt.fromI32(400);
  const burnTransfer = mockTransferEvent(
    REGULAR_ACCOUNT[0],
    Address.zero(),
    amount,
    "0x"
  );
  handleTransfer(burnTransfer, NON_CIRCULATING);
  const expectedCirculating = testStore.supply.circulating.minus(amount);
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "circulating",
    expectedCirculating.toString()
  );

  clearStore();
});

test("Generic Transfers update balances and do not affect supply", () => {
  const testStore = setupStore();
  const circulatingSupply = testStore.supply.circulating.toString();
  const totalSupply = testStore.supply.total.toString();
  const amount = BigInt.fromI32(500);
  const regularTransfer = mockTransferEvent(
    REGULAR_ACCOUNT[0],
    REGULAR_ACCOUNT[1],
    amount,
    "0x"
  );
  handleTransfer(regularTransfer, NON_CIRCULATING);
  // Holder balances
  assert.fieldEquals(
    "Holder",
    REGULAR_ACCOUNT[0].toHex(),
    "balance",
    testStore.holders[0].balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    REGULAR_ACCOUNT[1].toHex(),
    "balance",
    amount.toString()
  );
  // Supply Unchanged
  assert.fieldEquals("Supply", COW_TOKEN, "circulating", circulatingSupply);
  assert.fieldEquals("Supply", COW_TOKEN, "total", totalSupply);

  clearStore();
});

test("Transfers between non-circulating supply update balances and do not affect supply", () => {
  const testStore = setupStore();
  const circulatingSupply = testStore.supply.circulating.toString();
  const totalSupply = testStore.supply.total.toString();
  const amount = BigInt.fromI32(500);
  const regularTransfer = mockTransferEvent(
    NON_CIRCULATING[0],
    NON_CIRCULATING[1],
    amount,
    "0x"
  );
  handleTransfer(regularTransfer, NON_CIRCULATING);
  // Holder balances
  assert.fieldEquals(
    "Holder",
    NON_CIRCULATING[0].toHex(),
    "balance",
    testStore.holders[0].balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    NON_CIRCULATING[1].toHex(),
    "balance",
    amount.toString()
  );
  // Supply Unchanged
  assert.fieldEquals("Supply", COW_TOKEN, "circulating", circulatingSupply);
  assert.fieldEquals("Supply", COW_TOKEN, "total", totalSupply);

  clearStore();
});

test("Transfers from non-circulating to regular accounts supply update balances and update supply", () => {
  const testStore = setupStore();
  const circulatingSupply = testStore.supply.circulating;
  const totalSupply = testStore.supply.total.toString();
  const amount = BigInt.fromI32(500);
  const regularTransfer = mockTransferEvent(
    NON_CIRCULATING[0],
    REGULAR_ACCOUNT[1],
    amount,
    "0x"
  );
  handleTransfer(regularTransfer, NON_CIRCULATING);
  // Holder balances
  assert.fieldEquals(
    "Holder",
    NON_CIRCULATING[0].toHex(),
    "balance",
    testStore.holders[0].balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    REGULAR_ACCOUNT[1].toHex(),
    "balance",
    amount.toString()
  );
  // Total Supply Unchanged
  assert.fieldEquals("Supply", COW_TOKEN, "total", totalSupply);
  // Circulating supply increase
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "circulating",
    circulatingSupply.plus(amount).toString()
  );

  clearStore();
});
