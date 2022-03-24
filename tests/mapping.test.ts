import {
  clearStore,
  test,
  assert,
  logStore,
} from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { handleTransfer, NON_CIRCULATING, COW_TOKEN } from "../src/mapping";
import { mockTransferEvent, handleMultipleTransfers } from "./utils";
import { Holder, Supply } from "../generated/schema";

const REGULAR_ACCOUNT = [
  Address.fromString("0x0000000000000000000000000000000000000001"),
  Address.fromString("0x0000000000000000000000000000000000000002"),
  Address.fromString("0x0000000000000000000000000000000000000003"),
];

const TWO = BigInt.fromI32(2);

class TestStore {
  holders: Holder[];
  nonCirculatingHolders: Holder[];
  supply: Supply;
}

function setupStore(): TestStore {
  // Mint 4000 tokens
  // - 1000 to each of the first two regular accounts and
  // - 1000 to each of the first two non-circulating accounts
  // Yields an initial store as follows:
  // {
  //   "Holder": {
  //     "0x0000000000000000000000000000000000000001": {
  //       "id": {
  //         "type": "String",
  //         "data": "0x0000000000000000000000000000000000000001"
  //       },
  //       "balance": {
  //         "type": "BigInt",
  //         "data": "1000"
  //       }
  //     },
  //     "0xca771eda0c70aa7d053ab1b25004559b918fe662": {
  //       "id": {
  //         "type": "String",
  //         "data": "0xca771eda0c70aa7d053ab1b25004559b918fe662"
  //       },
  //       "balance": {
  //         "type": "BigInt",
  //         "data": "1000"
  //       }
  //     },
  //     "0x0000000000000000000000000000000000000002": {
  //       "id": {
  //         "type": "String",
  //         "data": "0x0000000000000000000000000000000000000002"
  //       },
  //       "balance": {
  //         "type": "BigInt",
  //         "data": "1000"
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
  //         "data": "2000"
  //       },
  //       "total": {
  //         "type": "BigInt",
  //         "data": "4000"
  //       },
  //       "id": {
  //         "type": "String",
  //         "data": "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB"
  //       }
  //     }
  //   }
  // }

  const amount = BigInt.fromI32(1000);
  let transferEvents = [
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[0], amount, "0x"),
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[1], amount, "0x"),
    mockTransferEvent(Address.zero(), NON_CIRCULATING[0], amount, "0x"),
    mockTransferEvent(Address.zero(), NON_CIRCULATING[1], amount, "0x"),
  ];
  handleMultipleTransfers(transferEvents);

  const holder1 = new Holder(REGULAR_ACCOUNT[0].toHex());
  holder1.balance = amount;
  const holder2 = new Holder(REGULAR_ACCOUNT[1].toHex());
  holder2.balance = amount;

  const nonCirculating1 = new Holder(NON_CIRCULATING[0].toHex());
  nonCirculating1.balance = amount;
  const nonCirculating2 = new Holder(NON_CIRCULATING[1].toHex());
  nonCirculating2.balance = amount;

  const supply = new Supply(COW_TOKEN);
  supply.circulating = amount.times(TWO);
  supply.total = amount.times(TWO).times(TWO);

  return {
    holders: [holder1, holder2],
    nonCirculatingHolders: [nonCirculating1, nonCirculating2],
    supply,
  };
}

test("Test Setup", () => {
  const testStore = setupStore();
  const holders = testStore.holders;
  const nonCirculatingHolders = testStore.nonCirculatingHolders;

  for (let i = 0; i < holders.length; i++) {
    assert.fieldEquals(
      "Holder",
      holders[i].id,
      "balance",
      holders[i].balance.toString()
    );
  }
  for (let i = 0; i < nonCirculatingHolders.length; i++) {
    assert.fieldEquals(
      "Holder",
      nonCirculatingHolders[i].id,
      "balance",
      nonCirculatingHolders[i].balance.toString()
    );
  }

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

test("Burning correctly updates the supply and balance", () => {
  const testStore = setupStore();
  const amount = BigInt.fromI32(400);
  const tokenBurner = testStore.holders[0];
  const burnTransfer = mockTransferEvent(
    Address.fromString(tokenBurner.id),
    Address.zero(),
    amount,
    "0x"
  );
  handleTransfer(burnTransfer);
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "total",
    testStore.supply.total.minus(amount).toString()
  );
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "circulating",
    testStore.supply.circulating.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    testStore.holders[0].id,
    "balance",
    tokenBurner.balance.minus(amount).toString()
  );

  clearStore();
});

test("Generic Transfers update balances and do not affect supply", () => {
  const testStore = setupStore();
  const circulatingSupply = testStore.supply.circulating.toString();
  const totalSupply = testStore.supply.total.toString();
  const regularHolder1 = testStore.holders[0];
  const regularHolder2 = testStore.holders[1];

  const amount = BigInt.fromI32(500);
  const regularTransfer = mockTransferEvent(
    Address.fromString(regularHolder1.id),
    Address.fromString(regularHolder2.id),
    amount,
    "0x"
  );
  handleTransfer(regularTransfer);

  // Holder balances
  assert.fieldEquals(
    "Holder",
    regularHolder1.id,
    "balance",
    regularHolder1.balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    regularHolder2.id,
    "balance",
    regularHolder2.balance.plus(amount).toString()
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
  const nonCirculating1 = testStore.nonCirculatingHolders[0];
  const nonCirculating2 = testStore.nonCirculatingHolders[1];

  const amount = BigInt.fromI32(500);
  const regularTransfer = mockTransferEvent(
    Address.fromString(nonCirculating1.id),
    Address.fromString(nonCirculating2.id),
    amount,
    "0x"
  );
  handleTransfer(regularTransfer);
  // Holder balances
  assert.fieldEquals(
    "Holder",
    nonCirculating1.id,
    "balance",
    nonCirculating1.balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    nonCirculating2.id,
    "balance",
    nonCirculating2.balance.plus(amount).toString()
  );
  // Supply Unchanged
  assert.fieldEquals("Supply", COW_TOKEN, "circulating", circulatingSupply);
  assert.fieldEquals("Supply", COW_TOKEN, "total", totalSupply);

  clearStore();
});

test("Transfers from non-circulating to regular accounts updates balances and supply", () => {
  const testStore = setupStore();
  const circulatingSupplyBefore = testStore.supply.circulating;
  const totalSupply = testStore.supply.total.toString();
  const nonCirculatingHolder = testStore.nonCirculatingHolders[0];
  const regularHolder = testStore.holders[0];

  const amount = BigInt.fromI32(500);
  const irregularTransfer = mockTransferEvent(
    Address.fromString(nonCirculatingHolder.id),
    Address.fromString(regularHolder.id),
    amount,
    "0x"
  );
  handleTransfer(irregularTransfer);

  // Holder balances
  assert.fieldEquals(
    "Holder",
    nonCirculatingHolder.id,
    "balance",
    nonCirculatingHolder.balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    regularHolder.id,
    "balance",
    regularHolder.balance.plus(amount).toString()
  );
  // Total Supply Unchanged
  assert.fieldEquals("Supply", COW_TOKEN, "total", totalSupply);
  // Circulating supply increase
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "circulating",
    circulatingSupplyBefore.plus(amount).toString()
  );

  clearStore();
});

test("Transfers from regular to non-circulating accounts updates balances and supply", () => {
  const testStore = setupStore();
  const circulatingSupplyBefore = testStore.supply.circulating;
  const totalSupply = testStore.supply.total.toString();
  const nonCirculatingHolder = testStore.nonCirculatingHolders[0];
  const regularHolder = testStore.holders[0];

  const amount = BigInt.fromI32(500);
  const irregularTransfer = mockTransferEvent(
    Address.fromString(regularHolder.id),
    Address.fromString(nonCirculatingHolder.id),
    amount,
    "0x"
  );
  handleTransfer(irregularTransfer);

  // Holder balances
  assert.fieldEquals(
    "Holder",
    regularHolder.id,
    "balance",
    regularHolder.balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    nonCirculatingHolder.id,
    "balance",
    nonCirculatingHolder.balance.plus(amount).toString()
  );
  // Total Supply Unchanged
  assert.fieldEquals("Supply", COW_TOKEN, "total", totalSupply);
  // Circulating supply increase
  assert.fieldEquals(
    "Supply",
    COW_TOKEN,
    "circulating",
    circulatingSupplyBefore.minus(amount).toString()
  );

  clearStore();
});
