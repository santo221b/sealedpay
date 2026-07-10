import { adapt } from "../server/adapter.js";
import { handleProfile } from "../server/handlers.js";

export default adapt(handleProfile);
