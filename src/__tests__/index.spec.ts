import DryadicPackage from "../../";

describe('"dryadic index"', () => {
  it("should define exports", function() {
    expect(DryadicPackage.Dryad).toBeTruthy();
    expect(DryadicPackage.dryadic).toBeTruthy();
  });
});
