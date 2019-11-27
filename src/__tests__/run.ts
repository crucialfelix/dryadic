import run from "../run";

describe('"run" middleware', () => {
  it("should evaluate and resolve the return value of commands", () => {
    let ok = false;
    const context = {};
    const properties = {};
    const commands = {
      run: (c, p) => {
        expect(c).toBe(context);
        expect(p).toBe(properties);
        ok = true;
        return Promise.resolve("ok");
      },
    };

    return Promise.resolve(run(commands, context, properties)).then(() => {
      expect(ok).toBeTruthy();
    });
  });

  it("should resolve even with no return value", function() {
    let ok = false;
    const context = {};
    const properties = {};
    const commands = {
      run: (c, p) => {
        expect(c).toBe(context);
        expect(p).toBe(properties);
        ok = true;
      },
    };

    return Promise.resolve(run(commands, context, properties)).then(() => {
      expect(ok).toBeTruthy();
    });
  });
});