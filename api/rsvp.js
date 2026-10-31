import { route } from './_lib/http.js';
import { runRsvp } from './_lib/more.js';

export const config = { maxDuration: 60 };

export default route((body, env) => runRsvp(body, env));
