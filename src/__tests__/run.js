
var run = require('../run').default;

describe('"run" middleware', () => {
  pit('should evaluate and resolve the return value of commands', () => {
    let ok = false;
    let commands = {
        run: () => {
          ok = true;
          return Promise.resolve('ok');
        }
      };
    let context = {};

    return Promise.resolve(run(commands, context)).then(() => {
      expect(ok).toBeTruthy();
    });
  });

  pit('should resolve even with no return value', function() {
    let ok = false;
    let commands = {
        run: () => {
          ok = true;
        }
      };
    let context = {};

    return Promise.resolve(run(commands, context)).then(() => {
      expect(ok).toBeTruthy();
    });
  });

});
