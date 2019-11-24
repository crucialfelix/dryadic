import DryadPlayer from "../DryadPlayer";
import { DryadType } from "../types";

export function makeApp(classes: DryadType[] = []): DryadPlayer {
  const app = new DryadPlayer();
  classes.forEach(c => app.addClass(c));
  return app;
}

describe("makeApp", function() {
  it("should make an app", () => {
    const app = makeApp();
    expect(app).toBeDefined();
  });
});
