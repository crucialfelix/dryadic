import * as lib from "../index";

describe('"dryadic index"', () => {
  it("should define exports", function() {
    expect(lib.Dryad).toBeTruthy();
    expect(lib.DryadPlayer).toBeTruthy();
    expect(lib.dryadic).toBeTruthy();
    expect(lib.hyperscript).toBeTruthy();
  });
});
