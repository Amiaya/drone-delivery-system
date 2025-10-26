import { isOrderByQuery, isPaginationQuery } from "@app/internal/validator";

import joi from "joi";

export const isMedicationQuery = isPaginationQuery.concat(isOrderByQuery).keys({
  medication_name: joi.string().optional(),
  code: joi.string().optional()
});

export const isMedicationDTO = joi.object({
  medication_name: joi
    .string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .message(
      "Name can only contain letters, numbers, hyphens (-), and underscores (_)"
    )
    .required(),
  weight: joi.number().required().required()
});
