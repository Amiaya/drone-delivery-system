import { Model } from "@app/internal/postgres";
import { OrderMedication } from "@app/order-medications";

export const ORDER_STATUS = <const>[
  "pending",
  "successful",
  "aborted",
  "delivered",
  "failed"
];

export type OrderStatus = (typeof ORDER_STATUS)[number];

export interface Order extends Model {
  drone_id: string;
  status: OrderStatus;
  total_weight: number;
  items?: OrderMedication[];
}

export type OrderDTO = Omit<Order, keyof Model>;

export interface Item {
  medication_id: string;
  quantity: number;
}

export interface MedicationOrder {
  drone_id: string;
  items: Item[];
}
