import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/CowProtocolToken/CowProtocolToken";
import { Holder, Supply } from "../generated/schema";

export const COW_ADDRESS_STRING = "0x177127622c4A00F3d409B75571e12cB3c8973d3c";
export const VCOW_ADDRESS_STRING = "0xc20C9C13E853fc64d054b73fF21d3636B2d97eaB";
export const VCOW_TOKEN = Address.fromString(VCOW_ADDRESS_STRING);

export function loadOrCreateHolder(address: Address): Holder {
  let holder = Holder.load(address.toHex());
  if (!holder) {
    holder = new Holder(address.toHex());
  }
  if (address != Address.zero()) {
    // Skip creation of burn address holder.
    holder.save();
  }
  return holder;
}

export function saveNonZero(holder: Holder): void {
  if (holder.id != Address.zero().toHex()) {
    holder.save();
  }
  // do not save updates to null address balance.
}

export function loadOrCreateSupply(): Supply {
  let supply = Supply.load(COW_ADDRESS_STRING);
  if (!supply) {
    // This will only ever happen once!
    supply = new Supply(COW_ADDRESS_STRING);
  }
  supply.save();
  return supply;
}

export function supplyTriggeringTransfer(from: Address, to: Address): bool {
  const mintOrBurn = from == Address.zero() || to == Address.zero();
  const involvesVestingContract = VCOW_TOKEN == from || VCOW_TOKEN == to;
  return mintOrBurn || involvesVestingContract;
}

export function updateSupply(from: Address, to: Address, amount: BigInt): void {
  const supply = loadOrCreateSupply();
  if (from == Address.zero()) {
    log.info("Token Minted {}", [amount.toString()]);
    supply.total = supply.total.plus(amount);
    supply.circulating = supply.circulating.plus(amount);
  }
  if (to == Address.zero()) {
    log.info("Token Burned {}", [amount.toString()]);
    supply.total = supply.total.minus(amount);
    supply.circulating = supply.circulating.minus(amount);
  }

  if (from == VCOW_TOKEN) {
    log.info("Circulating Supply Increase {}", [amount.toString()]);
    supply.circulating = supply.circulating.plus(amount);
  }

  if (to == VCOW_TOKEN) {
    log.info("Circulating Supply Decrease {}", [amount.toString()]);
    supply.circulating = supply.circulating.minus(amount);
  }
  supply.save();
}

export function handleTransfer(event: Transfer): void {
  const from = event.params.from;
  const to = event.params.to;
  const sender = loadOrCreateHolder(from);
  const receiver = loadOrCreateHolder(to);
  const amount = event.params.value;

  if (supplyTriggeringTransfer(from, to)) {
    updateSupply(from, to, amount);
  }

  sender.balance = sender.balance.minus(amount);
  receiver.balance = receiver.balance.plus(amount);
  saveNonZero(sender);
  saveNonZero(receiver);
}
