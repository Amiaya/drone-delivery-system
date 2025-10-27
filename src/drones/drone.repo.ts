import { Drone, DroneDTO, DroneQuery, DroneState } from "./drone.model";
import { PaginatedResult, Repository } from "@app/internal/postgres";
import { isEmpty, omit } from "lodash";

import { Knex } from "knex";

export class DroneRepository extends Repository<Drone> {
  private db = this.setup("drones");

  async create(dto: DroneDTO) {
    const [drone] = await this.db().insert(dto).returning("*");
    return drone;
  }

  /**
   * List all product categories
   * @params query procuct category query
   * @returns product categories
   */
  async list(query?: DroneQuery): Promise<Drone[] | PaginatedResult<Drone>> {
    let db = isEmpty(query)
      ? this.db()
      : this.db().where(
          omit(query, [
            "limit",
            "offset",
            "nopaginate",
            "order_by",
            "order",
            "keyword"
          ])
        );

    db = db.orderBy(query.order_by, query.order);

    if (query.nopaginate) {
      return await db;
    }

    return await this.paginated(db.select("*"), query.limit, query.offset);
  }

  async updateState(id: string, state: DroneState, trx?: Knex) {
    const db = trx ? () => trx("drones") : this.db;
    const [drone] = await db().where("id", id).update({ state }, "*");
    return drone;
  }

  async getById(id: string) {
    let db = await this.db().where("id", id).first();

    return db;
  }

  async fetchAvailableDrones() {
    let db = await this.db()
      .whereNot("state", "idle")
      .where("battery_capacity", ">", 0);

    return db;
  }

  async fetchIdleDrones() {
    let db = await this.db()
      .where("state", "idle")
      .where("battery_capacity", "<", 100);

    return db;
  }

  async fetchDronesInDelivered(date: Date) {
    let db = await this.db()
      .where("state", "delivered")
      .andWhere("updated_at", "<", date);

    return db;
  }

  async updateBatteryCapacity(id: string, battery_capacity: number) {
    const [drone] = await this.db()
      .where("id", id)
      .update({ battery_capacity }, "*");

    return drone;
  }
}
