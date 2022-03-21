import {
  clearStore,
  test,
  assert,
  logStore,
} from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { handleTransfer, VCOW_TOKEN, COW_ADDRESS_STRING } from "../src/mapping";
import { mockTransferEvent, handleMultipleTransfers } from "./utils";
import { Holder, Supply } from "../generated/schema";

const REGULAR_ACCOUNT = [
  Address.fromString("0x0000000000000000000000000000000000000001"),
  Address.fromString("0x0000000000000000000000000000000000000002"),
  Address.fromString("0x0000000000000000000000000000000000000003"),
];

class TestStore {
  holders: Holder[];
  supply: Supply;
}

function setupStore(): TestStore {
  /// Mint 3000 tokens with 1000 going to two regular accounts
  //  and the last 1000 in a vesting contract.
  const amount = BigInt.fromI32(1000);
  let transferEvents = [
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[0], amount, "0x"),
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[1], amount, "0x"),
    mockTransferEvent(Address.zero(), VCOW_TOKEN, amount, "0x"),
  ];
  handleMultipleTransfers(transferEvents);

  const holder1 = new Holder(REGULAR_ACCOUNT[0].toHex());
  const holder2 = new Holder(REGULAR_ACCOUNT[1].toHex());
  const vestingContract = new Holder(VCOW_TOKEN.toHex());

  holder1.balance = amount;
  holder2.balance = amount;
  vestingContract.balance = amount;

  const supply = new Supply(COW_ADDRESS_STRING);
  supply.circulating = amount.times(BigInt.fromI32(2));
  supply.total = amount.times(BigInt.fromI32(3));

  return {
    holders: [holder1, holder2, vestingContract],
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
    REGULAR_ACCOUNT[1].toHex(),
    "balance",
    testStore.holders[1].balance.toString()
  );
  assert.fieldEquals(
    "Holder",
    VCOW_TOKEN.toHex(),
    "balance",
    testStore.holders[2].balance.toString()
  );
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
    "total",
    testStore.supply.total.toString()
  );
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
    "circulating",
    testStore.supply.circulating.toString()
  );
  clearStore();
});

test("Minting correctly updates the supply", () => {
  const amount = BigInt.fromI32(1337);
  let transferEvents = [
    mockTransferEvent(Address.zero(), REGULAR_ACCOUNT[0], amount, "0x"),
    mockTransferEvent(Address.zero(), VCOW_TOKEN, amount, "0x"),
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
    VCOW_TOKEN.toHex(),
    "balance",
    amount.toString()
  );
  // Total supply is 2 * amount
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
    "total",
    amount.times(BigInt.fromI32(2)).toString()
  );
  // But circulating supply is only amount
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
    "circulating",
    amount.toString()
  );
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
  handleTransfer(burnTransfer);
  const expectedCirculating = testStore.supply.circulating.minus(amount);
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
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
    Address.fromString(testStore.holders[0].id),
    Address.fromString(testStore.holders[1].id),
    amount,
    "0x"
  );
  handleTransfer(regularTransfer);
  // Holder balances
  assert.fieldEquals(
    "Holder",
    testStore.holders[0].id,
    "balance",
    testStore.holders[0].balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    testStore.holders[1].id,
    "balance",
    testStore.holders[1].balance.plus(amount).toString()
  );

  // Supply Unchanged
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
    "circulating",
    circulatingSupply
  );
  assert.fieldEquals("Supply", COW_ADDRESS_STRING, "total", totalSupply);

  clearStore();
});

test("Transfers from non-circulating to regular accounts supply update balances and update supply", () => {
  const testStore = setupStore();
  const holder = testStore.holders[1];
  const vestingContract = testStore.holders[2];
  const circulatingSupply = testStore.supply.circulating;
  const totalSupply = testStore.supply.total.toString();
  const amount = BigInt.fromI32(500);
  const transfer = mockTransferEvent(
    Address.fromString(vestingContract.id),
    Address.fromString(holder.id),
    amount,
    "0x"
  );
  handleTransfer(transfer);
  // Holder balances
  assert.fieldEquals(
    "Holder",
    vestingContract.id,
    "balance",
    vestingContract.balance.minus(amount).toString()
  );
  assert.fieldEquals(
    "Holder",
    holder.id,
    "balance",
    holder.balance.plus(amount).toString()
  );
  // Total Supply Unchanged
  assert.fieldEquals("Supply", COW_ADDRESS_STRING, "total", totalSupply);
  // Circulating supply increase
  assert.fieldEquals(
    "Supply",
    COW_ADDRESS_STRING,
    "circulating",
    circulatingSupply.plus(amount).toString()
  );

  clearStore();
});
