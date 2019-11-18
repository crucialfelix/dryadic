import assign from "lodash/assign";
import delay from "lodash/delay";

import CommandNode from "../CommandNode";
import { CallOrder } from "../types";

describe("CommandNode", function() {
  const middleware = function(commands, context, properties /*, updateFn*/) {
    if (commands.action) {
      return commands.action(context, properties);
    }
  };

  const updater = assign;

  // execute
  describe("execute", function() {
    const n = new CommandNode({ action: () => 0 }, { id: "0" }, { key: "value" }, "0", []);

    it("should execute commands", function() {
      return n.execute("add", [middleware], updater).then(got => {
        // undefined because they don't return anything
        // they just execute
        expect(got).toBe(undefined);
        expect(n.context.state).toEqual({ add: true });
      });
    });
  });

  describe("callOrder", function() {
    /**
     * Test the various callOrder modes.
     *
     * The command returns a Promise that resolves
     * after a few milliseconds. This tests that
     * the sequence of calls is correct.
     */

    function make(callOrder = undefined) {
      // action pushes the id to calls
      const calls = [];
      // create a function that returns a Promise, resolved after ms delay
      const actionary = ms => {
        return context => {
          calls.push(context.id);
          return new Promise(resolve => delay(resolve, ms));
        };
      };

      // in properties mode this is called before c
      // and c will not be called till it completes
      const b = new CommandNode({ action: actionary(100) }, { id: "b" }, {}, "b", []);

      const c = new CommandNode({ action: actionary(50) }, { id: "c" }, {}, "c", []);

      // a is called first, the other ones must wait
      const a = new CommandNode(
        {
          action: actionary(200),
          callOrder,
        },
        { id: "a" },
        {},
        "a",
        [b, c],
      );

      return { a, b, c, calls };
    }

    describe("default order", function() {
      const { a, calls } = make();

      return it("should call a b c", function() {
        return a.call("add", [middleware], assign).then(() => {
          expect(calls).toEqual(["a", "b", "c"]);
        });
      });
    });

    describe("SELF_THEN_CHILDREN", function() {
      const { a, calls } = make(CallOrder.SELF_THEN_CHILDREN);

      return it("should call a b c", function() {
        return a.call("add", [middleware], assign).then(() => {
          expect(calls).toEqual(["a", "b", "c"]);
        });
      });
    });

    describe("PROPERTIES_MODE", function() {
      const { a, calls } = make(CallOrder.PROPERTIES_MODE);

      return it("should call a b c", function() {
        return a.call("add", [middleware], assign).then(() => {
          expect(calls).toEqual(["a", "b", "c"]);
        });
      });
    });
  });
});
