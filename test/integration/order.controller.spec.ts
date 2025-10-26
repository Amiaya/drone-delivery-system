import "reflect-metadata";
import "../../src/http/controllers/orders/order.controller";

import Environment, { EnvConfig, envSchema, setupEnv } from "@app/internal/env";
import { Order, OrderRepository } from "@app/orders";
import chai, { expect } from "chai";
import { createDrone, fetchDrone } from "../helpers/drone";
import {
  createOrderMedication,
  fetchOrderMedicationByOrderID
} from "../helpers/order-medication";
import { getError, getSuccess, repeat } from "../helper";

import APP_TYPES from "@app/config/types";
import { App } from "../../src/app";
import { Application } from "express";
import { Container } from "inversify";
import { DroneRepository } from "@app/drones";
import INTERNAL_TYPES from "@app/internal/types";
import { Knex } from "knex";
import Logger from "bunyan";
import { MedicationRepository } from "@app/medications";
import { OrderMedicationRepository } from "@app/order-medications";
import { StatusCodes } from "http-status-codes";
import chaiAsPromised from "chai-as-promised";
import { createMedication } from "../helpers/medication";
import { createOrder } from "../helpers/order";
import { createPostgres } from "@app/config/postgres";
import { faker } from "@faker-js/faker";
import request from "supertest";

chai.use(chaiAsPromised);

const baseURL = "/api/v1/orders";

let container: Container;
let app: Application;
let env: EnvConfig;
let pg: Knex;

beforeAll(async () => {
  const envvars = setupEnv(envSchema);
  const environment = new Environment(envvars);
  env = environment.env();
  const logger = new Logger({
    name: env.app_name
  });
  container = new Container();

  pg = await createPostgres(logger, env);

  container.bind<Knex>(INTERNAL_TYPES.KnexDB).toConstantValue(pg);
  container.bind<Logger>(INTERNAL_TYPES.Logger).toConstantValue(logger);
  container.bind<EnvConfig>(INTERNAL_TYPES.Env).toConstantValue(env);

  container
    .bind<DroneRepository>(APP_TYPES.DroneRepository)
    .to(DroneRepository);
  container
    .bind<OrderRepository>(APP_TYPES.OrderRepository)
    .to(OrderRepository);
  container
    .bind<MedicationRepository>(APP_TYPES.MedicationRepository)
    .to(MedicationRepository);
  container
    .bind<OrderMedicationRepository>(APP_TYPES.OrderMedicationRepository)
    .to(OrderMedicationRepository);

  app = new App(container, logger, env).server.build();
});

afterAll(async () => {
  await pg.destroy();
});

afterEach(async () => {
  await pg("drones").del();
  await pg("medications").del();
  await pg("orders").del();
  await pg("order_medications").del();
});

describe("OrderController#create", () => {
  it("should create a new order", async () => {
    const drone = await createDrone(pg, {
      state: "loading",
      battery_capacity: 100,
      weight_limit: 500
    });

    const medications = await repeat(2, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      return await createMedication(pg, {
        weight: faker.number.int({ min: 50, max: 100 }),
        code
      });
    });

    const dto = {
      drone_id: drone.id,
      items: [
        { medication_id: medications[0].id, quantity: 2 },
        { medication_id: medications[1].id, quantity: 1 }
      ]
    };

    const response = await getSuccess<Order>(
      request(app).post(baseURL).send(dto)
    );

    expect(response.drone_id).to.eq(dto.drone_id);
    expect(response.status).to.be.eq("pending");

    const itemMeds = await fetchOrderMedicationByOrderID(pg, response.id);

    expect(itemMeds.length).to.eq(2);

    const updateddDrone = await fetchDrone(pg, drone.id);

    expect(updateddDrone?.state).to.eq("loaded");
  });

  it("should fail if total weight exceeds the drones weight", async () => {
    const drone = await createDrone(pg, {
      state: "loading",
      battery_capacity: 100,
      weight_limit: 500
    });

    const medications = await repeat(2, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      return await createMedication(pg, {
        weight: faker.number.int({ min: 300, max: 400 }),
        code
      });
    });

    const dto = {
      drone_id: drone.id,
      items: [
        { medication_id: medications[0].id, quantity: 2 },
        { medication_id: medications[1].id, quantity: 1 }
      ]
    };

    const errorMessage = await getError(
      StatusCodes.BAD_REQUEST,
      request(app).post(baseURL).send(dto)
    );

    expect(errorMessage).to.eq(
      "Total medication weight exceeds drone's weight limit"
    );
  });

  it("should fail if the battery capacity is less down 25 percent", async () => {
    const drone = await createDrone(pg, {
      state: "loading",
      battery_capacity: 20,
      weight_limit: 500
    });

    const medications = await repeat(2, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      return await createMedication(pg, {
        weight: faker.number.int({ min: 300, max: 400 }),
        code
      });
    });

    const dto = {
      drone_id: drone.id,
      items: [
        { medication_id: medications[0].id, quantity: 2 },
        { medication_id: medications[1].id, quantity: 1 }
      ]
    };

    const errorMessage = await getError(
      StatusCodes.BAD_REQUEST,
      request(app).post(baseURL).send(dto)
    );

    expect(errorMessage).to.eq(
      "Drone battery is below 25%, cannot create an order"
    );
  });

  it("should fail if the drone is not in loading state", async () => {
    const drone = await createDrone(pg, {
      state: "loaded",
      battery_capacity: 20,
      weight_limit: 500
    });

    const medications = await repeat(2, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      return await createMedication(pg, {
        weight: faker.number.int({ min: 300, max: 400 }),
        code
      });
    });

    const dto = {
      drone_id: drone.id,
      items: [
        { medication_id: medications[0].id, quantity: 2 },
        { medication_id: medications[1].id, quantity: 1 }
      ]
    };

    const errorMessage = await getError(
      StatusCodes.BAD_REQUEST,
      request(app).post(baseURL).send(dto)
    );

    expect(errorMessage).to.eq("Drone is not in LOADING state");
  });

  it("should fail if the drone is not found", async () => {
    const medications = await repeat(2, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      return await createMedication(pg, {
        weight: faker.number.int({ min: 300, max: 400 }),
        code
      });
    });

    const dto = {
      drone_id: faker.string.uuid(),
      items: [
        { medication_id: medications[0].id, quantity: 2 },
        { medication_id: medications[1].id, quantity: 1 }
      ]
    };

    const errorMessage = await getError(
      StatusCodes.NOT_FOUND,
      request(app).post(baseURL).send(dto)
    );

    expect(errorMessage).to.eq("Drone not found");
  });
});

describe("OrderController#getDetails", () => {
  it("should fetch order details", async () => {
    const drone = await createDrone(pg, {
      state: "loading",
      battery_capacity: 100,
      weight_limit: 500
    });

    const medications = await repeat(2, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      return await createMedication(pg, {
        weight: faker.number.int({ min: 50, max: 100 }),
        code
      });
    });

    const order = await createOrder(pg, {
      drone_id: drone.id
    });

    await repeat(2, async i => {
      await createOrderMedication(pg, {
        order_id: order.id,
        medication_id: medications[i].id,
        quantity: i + 1
      });
    });

    const response = await getSuccess<Order>(
      request(app).get(`${baseURL}/${order.id}/details`)
    );

    expect(response.id).to.eq(order.id);

    response.items.forEach(item => {
      expect(item.order_id).to.eq(order.id);
    });
  });

  it("should fail if order is not found", async () => {
    const errorMessage = await getError(
      StatusCodes.NOT_FOUND,
      request(app).get(`${baseURL}/${faker.string.uuid()}/details`)
    );
    expect(errorMessage).to.eq("Order not found");
  });
});
