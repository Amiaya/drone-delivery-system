import { Order, OrderDTO } from "./order.model";

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
}
