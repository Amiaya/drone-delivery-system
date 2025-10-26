import joi from "joi";

export const isOrderItem = joi.object({
  medication_id: joi.string().uuid({ version: "uuidv4" }).required(),
  quantity: joi.number().integer().min(1).required()
});

export const isOrderDTO = joi.object({
  drone_id: joi.string().uuid({ version: "uuidv4" }).required(),
  items: joi.array().items(isOrderItem).min(1).required()
});
