import { Container } from "inversify";
import { Drone } from "@app/drones";
import INTERNAL_TYPES from "@app/internal/types";
import { Knex } from "knex";

export async function seedDrones(container: Container) {
  const pg = container.get<Knex>(INTERNAL_TYPES.KnexDB);

  await pg<Drone>("drones")
    .insert([
      {
        serial_number: "DRONE001",
        model: "lightweight",
        weight_limit: 200,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE002",
        model: "middleweight",
        weight_limit: 300,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE003",
        model: "cruiserweight",
        weight_limit: 400,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE004",
        model: "heavyweight",
        weight_limit: 500,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE005",
        model: "heavyweight",
        weight_limit: 500,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE006",
        model: "cruiserweight",
        weight_limit: 400,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE007",
        model: "middleweight",
        weight_limit: 300,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE008",
        model: "lightweight",
        weight_limit: 200,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE009",
        model: "cruiserweight",
        weight_limit: 400,
        battery_capacity: 100,
        state: "idle"
      },
      {
        serial_number: "DRONE010",
        model: "middleweight",
        weight_limit: 300,
        battery_capacity: 100,
        state: "idle"
      }
    ])
    .onConflict("serial_number")
    .ignore();
}
