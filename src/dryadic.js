import DryadPlayer from './DryadPlayer';
import layer from './layer';

export default function dryadic(dryad) {
  let app = new DryadPlayer(dryad);
  app.use(layer);
  return app;
}
