import { Transfer } from "../generated/CowProtocolToken/CowProtocolToken";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";
import { handleTransfer } from "../src/mapping";

export function arrayStringLiteral(arr: string[]): string {
  return "[" + arr.join(", ") + "]";
}

// Helpers for unit testing.
export function handleMultipleTransfers(events: Transfer[]): void {
  events.forEach((event) => {
    handleTransfer(event);
  });
}

export function mockTransferEvent(
  from: Address,
  to: Address,
  value: BigInt,
  data: string
): Transfer {
  let mockEvent = newMockEvent();

  mockEvent.parameters = new Array();

  mockEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  );
  mockEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  );
  mockEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromSignedBigInt(value))
  );
  mockEvent.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromString(data))
  );

  return new Transfer(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters
  );
}
