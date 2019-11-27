import run from "../run";

describe('"run" middleware', () => {
  const updateContext = (ctx, update) => Object.assign({}, ctx, update);

  it("should evaluate and resolve the return value of commands", () => {
    let ok = false;
    const context = {};
    const properties = {};
    const commands = {
      run: (c, p, u) => {
        expect(c).toBe(context);
        expect(p).toBe(properties);
        expect(u).toBe(updateContext);
        ok = true;
        return Promise.resolve("ok");
      },
    };

    return Promise.resolve(run(commands, context, properties, updateContext)).then(() => {
      expect(ok).toBeTruthy();
    });
  });

  it("should resolve even with no return value", function() {
    let ok = false;
    const context = {};
    const properties = {};
    const commands = {
      run: (c, p, u) => {
        expect(c).toBe(context);
        expect(p).toBe(properties);
        expect(u).toBe(updateContext);
        ok = true;
      },
    };

    return Promise.resolve(run(commands, context, properties, updateContext)).then(() => {
      expect(ok).toBeTruthy();
    });
  });
});
