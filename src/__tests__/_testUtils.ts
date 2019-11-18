import DryadPlayer from "../DryadPlayer";

export function makeApp(classes = []): DryadPlayer {
  const app = new DryadPlayer();
  classes.forEach(c => app.addClass(c));
  return app;
}
