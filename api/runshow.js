import { route } from './_lib/http.js';
import { runRunshow } from './_lib/more.js';

export const config = { maxDuration: 60 };

export default route((body, env) => runRunshow(body, env));
