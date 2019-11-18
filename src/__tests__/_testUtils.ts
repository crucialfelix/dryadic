
import DryadPlayer from '../DryadPlayer';

export function makeApp(classes=[]) {
  let app = new DryadPlayer();
  classes.forEach((c) => app.addClass(c));
  return app;
}
