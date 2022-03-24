import { Router } from "express";
import { GraphQLClient, gql } from "graphql-request";

import { formatTokenUnit } from "./util";

const API_URL =
  "https://api.thegraph.com/subgraphs/name/bh2smith/cow-token-mainnet";
const COW_TOKEN = "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB";

export function supplyQuery(blockNum?: string): string {
  const whereClause =
    blockNum === undefined
      ? `(id: "${COW_TOKEN}")`
      : ` (id: "${COW_TOKEN}" block: {number: ${blockNum}})`;
  return gql`
  {
    supply ${whereClause} {
      total
      circulating
    }
  }`;
}

const routes = Router();

export type Supply = {
  total: string;
  circulating: string;
};

// Queries the subgraph for Supply.
export async function handleSupplyQuery(
  blockNum?: string
): Promise<Supply | null> {
  const query = supplyQuery(blockNum);
  const client = new GraphQLClient(API_URL);
  try {
    const { supply } = await client.request(query);
    return supply;
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Returns current Token Supply (i.e. at latest block)
routes.get("/supply", async (_, res) => {
  return res.json(await handleSupplyQuery());
});

// Return Token Supply at given block
routes.get("/supply/:blockNum", async (req, res) => {
  return res.json(await handleSupplyQuery(req.params.blockNum));
});

routes.get("/total-supply", async (_, res) => {
  const supply = await handleSupplyQuery();
  res.setHeader("content-type", "text/plain");
  return res.json(formatTokenUnit(supply.total));
});

routes.get("/circulating-supply", async (_, res) => {
  const supply = await handleSupplyQuery();
  res.setHeader("content-type", "text/plain");
  return res.json(formatTokenUnit(supply.circulating));
});

export default routes;
