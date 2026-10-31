import { route } from './_lib/http.js';
import { runChange } from './_lib/tasks.js';

export const config = { maxDuration: 60 };

export default route((body, env) => runChange(body, env));
