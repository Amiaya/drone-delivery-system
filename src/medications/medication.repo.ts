import { Medication, MedicationQuery } from "./medication.model";
import { PaginatedResult, Repository } from "@app/internal/postgres";
import { isEmpty, omit } from "lodash";

export class DuplicateMedication extends Error {
  constructor() {
    super("A medication with the given details already exists");
  }
}

export class MedicationRepository extends Repository<Medication> {
  private db = this.setup("medications");

  async create(dto: Partial<Medication>) {
    try {
      const [medication] = await this.db().insert(dto).returning("*");
      return medication;
    } catch (err) {
      if (err.code === "23505") {
        throw new DuplicateMedication();
      }
      throw err;
    }
  }

  async isOrderCodeAvailable(code: string) {
    const { count } = await this.db()
      .where("code", code)
      .count<{ count: number }>()
      .first();

    return Number(count ?? 0) === 0;
  }

  /**
   * List all product categories
   * @params query procuct category query
   * @returns product categories
   */
  async list(
    query?: MedicationQuery
  ): Promise<Medication[] | PaginatedResult<Medication>> {
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

  async getById(id: string) {
    let db = await this.db().where("id", id).first();

    return db;
  }
}
