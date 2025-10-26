import {
  Archivable,
  Model,
  OrderByQuery,
  PaginatedQuery
} from "@app/internal/postgres";

export interface Medication extends Model, Archivable {
  medication_name: string;
  weight: number;
  image: string;
  code: string;
}

export type MedicationDTO = Omit<Medication, keyof Model | "is_archived">;

export interface MedicationQuery extends PaginatedQuery, OrderByQuery {
  medication_name: string;
  code: string;
}
