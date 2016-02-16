
jest.dontMock('../run');
var run = require('../run').default;

describe('"run" middleware', () => {
  pit('should evaluate and resolve commands', () => {
    let ok = false;
    let stack = [{
      command: {
        run: () => {
          ok = true;
          return Promise.resolve('ok');
        }
      },
      context: {}
    }];
    return run(stack).then(() => {
      expect(ok).toBeTruthy();
    });
  });

  pit('should resolve even with no return value', function() {
    let ok = false;
    let stack = [{
      command: {
        run: () => {
          ok = true;
        },
      },
      context: {}
    }];
    return run(stack).then(() => {
      expect(ok).toBeTruthy();
    });
  });

});
