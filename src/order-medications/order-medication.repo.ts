import { OrderMedication, OrderMedicationDTO } from "./order-medication.model";

import { Knex } from "knex";
import { Repository } from "@app/internal/postgres";

export class OrderMedicationRepository extends Repository<OrderMedication> {
  private db = this.setup("order_medications");

  async create(dto: OrderMedicationDTO[], trx?: Knex) {
    const db = trx ? () => trx("order_medications") : this.db;
    const [order] = await db().insert(dto, "*");
    return order;
  }

  async getByOrderId(orderId: string) {
    let db = await this.db().where("order_id", orderId);

    return db;
  }
}
