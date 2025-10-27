import { Order, OrderDTO, OrderStatus } from "./order.model";

import { Knex } from "knex";
import { Repository } from "@app/internal/postgres";

export class OrderRepository extends Repository<Order> {
  private db = this.setup("orders");

  async create(dto: OrderDTO, trx?: Knex) {
    const db = trx ? () => trx("orders") : this.db;
    const [order] = await db().insert(dto, "*");
    return order;
  }

  async getById(id: string) {
    let db = await this.db().where("id", id).first();

    return db;
  }

  async fetchOrdersByStatus(status: string, date: Date) {
    let db = await this.db()
      .where("status", status)
      .andWhere("created_at", "<", date);

    return db;
  }

  async fetchByDroneID(droneID: string, status?: OrderStatus) {
    let db = this.db().where("drone_id", droneID);

    if (status) {
      db = db.andWhere("status", status);
    }

    return await db.first();
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const [order] = await this.db().where("id", id).update({ status }, "*");
    return order;
  }
}
