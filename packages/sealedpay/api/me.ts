import { adapt } from "../server/adapter.js";
import { handleMe } from "../server/handlers.js";

// /api/me is GET-only; the adapter passes method through and the handler
// rejects anything else with a 405.
export default adapt((auth, method) => handleMe(auth, method));
