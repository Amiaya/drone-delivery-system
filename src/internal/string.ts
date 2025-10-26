import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export function generateDatedShortCode(prefix = "EZ", len = 6) {
  const uuid = uuidv4().replace(/-/g, "");
  const short = parseInt(uuid, 16).toString(36).toUpperCase().substring(0, len);
  return `${prefix}-${format(new Date(), "yyMMdd")}-${short}`;
}
