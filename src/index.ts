import { MatchingEngine } from './engine.js';
import { createApi } from './api.js';

const engine = new MatchingEngine();
const port = Number(process.env.PORT ?? 3000);
createApi(engine, port);
