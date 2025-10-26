import { DRONE_MODEL, DRONE_STATE } from "@app/drones";
import { isOrderByQuery, isPaginationQuery } from "@app/internal/validator";

import joi from "joi";

export const isDroneQuery = isPaginationQuery.concat(isOrderByQuery).keys({
  model: joi.string().valid(...DRONE_MODEL),
  serial_number: joi.string().optional(),
  state: joi
    .string()
    .valid(...DRONE_STATE)
    .optional()
});

export const isDroneParams = joi.object({
  id: joi.string().uuid({ version: "uuidv4" }).required(),
  action: joi.string().valid("load", "unload").required()
});
