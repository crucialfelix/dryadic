
var index = require('../../index');

describe('"dryadic index"', () => {
  it('should define exports', function() {
    expect(index.Dryad).toBeTruthy();
    expect(index.dryadic).toBeTruthy();
  });
});
