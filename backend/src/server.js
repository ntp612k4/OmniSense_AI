import { createServer } from 'node:http';
import { appHandler } from './app.js';

const port = Number(process.env.PORT || 3000);

createServer(appHandler).listen(port, () => {
  console.log(`OmniSense backend listening on ${port}`);
});
