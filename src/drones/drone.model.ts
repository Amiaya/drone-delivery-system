import { Model, OrderByQuery, PaginatedQuery } from "@app/internal/postgres";

export const DRONE_MODEL = <const>[
  "lightweight",
  "middleweight",
  "cruiserweight",
  "heavyweight"
];
export type DroneModel = (typeof DRONE_MODEL)[number];

export const DRONE_STATE = <const>[
  "idle",
  "loading",
  "loaded",
  "delivering",
  "delivered",
  "returning"
];

export type DroneState = (typeof DRONE_STATE)[number];

export interface Drone extends Model {
  serial_number: string;
  weight_limit: number;
  model: DroneModel;
  state: DroneState;
  battery_capacity: number;
}

export type DroneDTO = Omit<Drone, keyof Model>;

export interface DroneQuery extends PaginatedQuery, OrderByQuery {
  serial_number: string;
  model: DroneModel;
  state: DroneState;
  is_available?: boolean;
}
