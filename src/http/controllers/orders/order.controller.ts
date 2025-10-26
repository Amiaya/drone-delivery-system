import { MedicationOrder, Order, OrderRepository } from "@app/orders";
import {
  controller,
  httpGet,
  httpPost,
  request,
  requestBody,
  requestParam,
  response
} from "inversify-express-utils";
import { Request, Response } from "express";

import APP_TYPES from "@app/config/types";
import { Controller } from "@app/internal/http";
import { PaginatedResult } from "@app/internal/postgres";
import { autoValidate, isEntityId } from "@app/internal/validator";
import { inject } from "inversify";
import { isOrderDTO } from "./order.validator";
import { DroneRepository } from "@app/drones";
import { ApplicationError } from "@app/internal/errors";
import { StatusCodes } from "http-status-codes";
import { MedicationRepository } from "@app/medications";
import { keyBy } from "lodash";
import INTERNAL_TYPES from "@app/internal/types";
import { Knex } from "knex";
import { OrderMedicationDTO } from "order-medications/order-medication.model";
import { OrderMedicationRepository } from "@app/order-medications";

type ControllerResponse = Order | Order[] | PaginatedResult<Order>;

@controller("/orders")
export class OrderController extends Controller<ControllerResponse> {
  @inject(APP_TYPES.OrderRepository) private repo: OrderRepository;
  @inject(APP_TYPES.OrderMedicationRepository)
  private orderMedRepo: OrderMedicationRepository;
  @inject(APP_TYPES.DroneRepository) private drones: DroneRepository;
  @inject(APP_TYPES.MedicationRepository) private medRepo: MedicationRepository;
  @inject(INTERNAL_TYPES.KnexDB) private knex: Knex;

  @httpPost("/", autoValidate(isOrderDTO))
  async createOrder(
    @request() req: Request,
    @response() res: Response,
    @requestBody() dto: MedicationOrder
  ) {
    const drone = await this.drones.getById(dto.drone_id);

    if (!drone) {
      throw new ApplicationError(StatusCodes.NOT_FOUND, "Drone not found");
    }

    if (drone.state !== "loading") {
      throw new ApplicationError(
        StatusCodes.BAD_REQUEST,
        "Drone is not in LOADING state"
      );
    }

    if (drone.battery_capacity < 25) {
      throw new ApplicationError(
        StatusCodes.BAD_REQUEST,
        "Drone battery is below 25%, cannot create an order"
      );
    }

    const medicationIDs = dto.items.map(med => med.medication_id);

    const medications = await this.medRepo.getByIds(medicationIDs);

    const medicationMap = keyBy(medications, "id");

    let totalWeight = dto.items.reduce((sum, item) => {
      const med = medicationMap[item.medication_id];
      if (!med) {
        throw new ApplicationError(
          StatusCodes.BAD_REQUEST,
          `Medication with ID ${item.medication_id} not found`
        );
      }
      return sum + med.weight * item.quantity;
    }, 0);

    if (totalWeight > drone.weight_limit) {
      throw new ApplicationError(
        StatusCodes.BAD_REQUEST,
        "Total medication weight exceeds drone's weight limit"
      );
    }
    let order: Order;

    await this.knex.transaction(async trx => {
      order = await this.repo.create(
        {
          total_weight: totalWeight,
          drone_id: dto.drone_id,
          status: "pending"
        },
        trx
      );

      const orderItems = dto.items.map(item => {
        return {
          order_id: order.id,
          medication_id: item.medication_id,
          quantity: item.quantity,
          metadata: {
            medication_name: medicationMap[item.medication_id].medication_name,
            drone_name: drone.serial_number
          }
        };
      }) as OrderMedicationDTO[];

      await this.orderMedRepo.create(orderItems, trx);

      await this.drones.updateState(dto.drone_id, "loaded", trx);
    });

    this.send(req, res, order);
  }

  @httpGet("/:id/details", autoValidate(isEntityId, "params"))
  async getDetails(
    @request() req: Request,
    @response() res: Response,
    @requestParam("id") id: string
  ) {
    const order = await this.repo.getById(id);

    if (!order) {
      throw new ApplicationError(StatusCodes.NOT_FOUND, "Order not found");
    }

    const orderMeds = await this.orderMedRepo.getByOrderId(id);

    this.send(req, res, {
      ...order,
      items: orderMeds
    });
  }
}
