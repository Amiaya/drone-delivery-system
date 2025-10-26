import { DRONE_MODEL, DRONE_STATE, Drone } from "@app/drones";

import { Knex } from "knex";
import { faker } from "@faker-js/faker";

export function newDrone(dto?: Partial<Drone>) {
  return {
    serial_number: faker.word.words(),
    model: faker.helpers.arrayElement([...DRONE_MODEL]),
    weight_limit: faker.number.int({ min: 100, max: 500 }),
    battery_capacity: faker.number.int({ min: 0, max: 100 }),
    state: faker.helpers.arrayElement([...DRONE_STATE]),
    ...dto
  };
}

export async function createDrone(pg: Knex, dto?: Partial<Drone>) {
  const [account] = await pg<Drone>("drones").insert(
    {
      ...newDrone(),
      ...dto
    },
    "*"
  );
  return account;
}

export async function fetchDrone(pg: Knex, id: string) {
  const drone = await pg<Drone>("drones")
    .where({
      id
    })
    .first();

  return drone;
}
