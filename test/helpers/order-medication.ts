import { Knex } from "knex";
import { OrderMedicationDTO } from "@app/order-medications";
import { faker } from "@faker-js/faker";

export function newOrderMedicationDTO(
  dto?: Partial<OrderMedicationDTO>
): OrderMedicationDTO {
  return {
    order_id: faker.string.uuid(),
    medication_id: faker.string.uuid(),
    quantity: faker.number.int({ min: 1, max: 10 }),
    ...dto
  };
}

export async function createOrderMedication(
  pg: Knex,
  dto?: Partial<OrderMedicationDTO>
) {
  const [orderMed] = await pg<OrderMedicationDTO>("order_medications").insert(
    {
      ...newOrderMedicationDTO(),
      ...dto
    },
    "*"
  );

  return orderMed;
}

export async function fetchOrderMedicationByOrderID(pg: Knex, orderID: string) {
  const orderMeds = await pg<OrderMedicationDTO>("order_medications").where({
    order_id: orderID
  });

  return orderMeds;
}
