import { Model } from "@app/internal/postgres";

export interface OrderMedication extends Model {
  order_id: string;
  medication_id: string;
  quantity: number;
  metadata?: Metadata;
}

export interface Metadata {
  medication_name: string;
}

export type OrderMedicationDTO = Omit<OrderMedication, keyof Model>;
