import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/CowProtocolToken/CowProtocolToken";
import { Holder, Supply } from "../generated/schema";

export const COW_TOKEN = "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB";
export const NON_CIRCULATING = [
  // Vested tokens (vCOW token address)
  Address.fromString("0xD057B63f5E69CF1B929b356b579Cba08D7688048"),
  // Solver Rewards
  Address.fromString("0xA03be496e67Ec29bC62F01a428683D7F9c204930"),
  // CoW DAO Safe
  Address.fromString("0xcA771eda0c70aA7d053aB1B25004559B918FE662"),
];

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
  let supply = Supply.load(COW_TOKEN);
  if (!supply) {
    // This will only ever happen once!
    supply = new Supply(COW_TOKEN);
  }
  supply.save();
  return supply;
}

export function supplyTriggeringTransfer(from: Address, to: Address): bool {
  const zero = Address.zero();
  const mintOrBurn = from == zero || to == zero;
  const involvesIgnoredAccounts =
    NON_CIRCULATING.includes(from) || NON_CIRCULATING.includes(to);

  return mintOrBurn || involvesIgnoredAccounts;
}

export function updateSupply(from: Address, to: Address, amount: BigInt): void {
  log.info("Token Supply update {} moved from {} to {}", [
    amount.toString(),
    from.toHex(),
    to.toHex(),
  ]);
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

  if (NON_CIRCULATING.includes(from)) {
    log.info("Circulating Supply Increase {}", [amount.toString()]);
    supply.circulating = supply.circulating.plus(amount);
  }

  if (NON_CIRCULATING.includes(to)) {
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
