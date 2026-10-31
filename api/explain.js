import { route } from './_lib/http.js';
import { runExplain } from './_lib/more.js';

export const config = { maxDuration: 60 };

export default route((body, env) => runExplain(body, env));
