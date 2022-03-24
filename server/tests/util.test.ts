import { expect } from "chai";
import { formatTokenUnit } from "../src/util";

describe("formatTokenUnits", function() {
  it("Works on large values", async function() {
    expect(formatTokenUnit("1000000000000000000")).equal(
      "1.000000000000000000"
    );

    expect(formatTokenUnit("9999991000000000000000000")).equal(
      "9999991.000000000000000000"
    );
  });

  it("Works on small values", async function() {
    expect(formatTokenUnit("1")).equal("0.000000000000000001");
    expect(formatTokenUnit("2")).equal("0.000000000000000002");
  });

  it("Works on zero", async function() {
    expect(formatTokenUnit("0")).equal("0.000000000000000000");
  });
});
