import { expect } from "chai";
import { describe } from "mocha";
import { handleSupplyQuery } from "../src/routes";

// Based on the events logged in deployment transaction:
// 0x39d9737ec1241ae892b726b962e7c9103a8048398c4e3b3b36cb9adb8e457a13
const deployBlock = 14186722;

// The following tests are async and depend on third party API.
// Usually these tests would be end to end tests only run on main branch.
describe("handleSupplyQuery", function() {
  it("request returns expected results at deployment block", async function() {
    const result = await handleSupplyQuery(deployBlock.toString());
    expect(result).to.deep.equal({
      total: "1000000000000000000000000000",
      circulating: "1000000000000000000",
    });
  });

  it("request returns expected results before deployment block", async function() {
    const result = await handleSupplyQuery((deployBlock - 1).toString());
    expect(result).to.deep.equal(null);
  });

  it("request returns null for future blocks", async function() {
    // Temporarily disable console error.
    const err = console.error;
    console.error = () => {};
    const result = await handleSupplyQuery("99999999999999999999999");
    expect(result).to.deep.equal(null);
    // restore console error
    console.error = err;
  });
});
