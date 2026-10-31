import { route } from './_lib/http.js';
import { runQuote } from './_lib/writing.js';

export const config = { maxDuration: 60 };

export default route((body, env) => runQuote(body, env));
