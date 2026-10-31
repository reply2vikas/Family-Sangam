import { route } from './_lib/http.js';
import { runMessage } from './_lib/writing.js';

export const config = { maxDuration: 60 };

export default route((body, env) => runMessage(body, env));
