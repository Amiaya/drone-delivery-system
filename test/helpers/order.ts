import { ORDER_STATUS, Order } from "@app/orders";

import { Knex } from "knex";
import { faker } from "@faker-js/faker";

export function newOrder(dto?: Partial<Order>) {
  return {
    drone_id: faker.string.uuid(),
    status: faker.helpers.arrayElement([...ORDER_STATUS]),
    total_weight: faker.number.int({ min: 1, max: 500 }),
    ...dto
  };
}
export async function createOrder(pg: Knex, dto?: Partial<Order>) {
  const [order] = await pg<Order>("orders").insert(
    {
      ...newOrder(),
      ...dto
    },
    "*"
  );
  return order;
}
