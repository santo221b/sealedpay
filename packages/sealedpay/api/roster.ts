import { adapt } from "../server/adapter.js";
import { handleRoster } from "../server/handlers.js";

export default adapt(handleRoster);
