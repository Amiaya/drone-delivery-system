import "reflect-metadata";
import "../../src/http/controllers/drones/drone.controller";

import { Drone, DroneRepository } from "@app/drones";
import Environment, { EnvConfig, envSchema, setupEnv } from "@app/internal/env";
import { Logger, defaultSerializers } from "@risemaxi/octonet";
import chai, { expect } from "chai";
import { getError, getSuccess, repeat } from "../helper";

import APP_TYPES from "@app/config/types";
import { App } from "../../src/app";
import { Application } from "express";
import { Container } from "inversify";
import INTERNAL_TYPES from "@app/internal/types";
import { Knex } from "knex";
import { Order } from "orders/order.model";
import { StatusCodes } from "http-status-codes";
import chaiAsPromised from "chai-as-promised";
import { createDrone } from "../helpers/drone";
import { createMedication } from "../helpers/medication";
import { createOrder } from "../helpers/order";
import { createOrderMedication } from "../helpers/order-medication";
import { createPostgres } from "@app/config/postgres";
import { faker } from "@faker-js/faker";
import request from "supertest";
import { seedDrones } from "@app/config/bootstrap";

chai.use(chaiAsPromised);

const baseURL = "/api/v1/drones";

let container: Container;
let app: Application;
let env: EnvConfig;
let pg: Knex;

beforeAll(async () => {
  const envvars = setupEnv(envSchema);
  const environment = new Environment(envvars);
  env = environment.env();
  const logger = new Logger({
    name: env.app_name,
    serializers: defaultSerializers()
  });
  container = new Container();

  pg = await createPostgres(logger, env);

  container.bind<Knex>(INTERNAL_TYPES.KnexDB).toConstantValue(pg);
  container.bind<Logger>(INTERNAL_TYPES.Logger).toConstantValue(logger);
  container.bind<EnvConfig>(INTERNAL_TYPES.Env).toConstantValue(env);

  container
    .bind<DroneRepository>(APP_TYPES.DroneRepository)
    .to(DroneRepository);

  app = new App(container, logger, env).server.build();
});

afterAll(async () => {
  await pg.destroy();
});

afterEach(async () => {
  await pg("drones").del();
});

describe("DroneController#list", () => {
  it("should list out all drones", async () => {
    await seedDrones(container);

    const response = await getSuccess<Drone[]>(
      request(app).get(baseURL).query({
        nopaginate: true
      })
    );

    expect(response.length).to.eq(10);
  });
});

describe("DroneController#getByID", () => {
  it("should get drone by ID", async () => {
    const drone = await createDrone(pg);
    const response = await getSuccess<Drone>(
      request(app).get(`${baseURL}/${drone.id}`)
    );

    expect(response.id).to.eq(drone.id);
    expect(response.model).to.eq(drone.model);
    expect(response.state).to.eq(drone.state);
  });

  it("should fail if drone not found", async () => {
    const errorMessage = await getError(
      StatusCodes.NOT_FOUND,
      request(app).get(`${baseURL}/${faker.string.uuid()}`)
    );

    expect(errorMessage).to.eq("Drone not found");
  });
});

describe("DroneController#loadOrUnloadDrone", () => {
  it("should start the loading process for a drone", async () => {
    const drone = await createDrone(pg, {
      battery_capacity: 95,
      state: "idle"
    });

    const response = await getSuccess<Drone>(
      request(app).post(`${baseURL}/${drone.id}/load`)
    );

    expect(drone.state).to.not.eq(response.state);
    expect(response.state).to.eq("loading");
  });

  it("should move the state back to idle", async () => {
    const drone = await createDrone(pg, {
      battery_capacity: 95,
      state: "loading"
    });

    const response = await getSuccess<Drone>(
      request(app).post(`${baseURL}/${drone.id}/unload`)
    );

    expect(drone.state).to.not.eq(response.state);
    expect(response.state).to.eq("idle");
  });

  it("should fail to load if battery is below 25%", async () => {
    const drone = await createDrone(pg, {
      battery_capacity: 20,
      state: "idle"
    });

    const errorMessage = await getError(
      StatusCodes.BAD_REQUEST,
      request(app).post(`${baseURL}/${drone.id}/load`)
    );

    expect(errorMessage).to.eq("Drone battery is below 25%, cannot load");
  });

  it("should fail if drone is not on idle before starting the loading process", async () => {
    const drone = await createDrone(pg, {
      battery_capacity: 30,
      state: "loading"
    });

    const errorMessage = await getError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      request(app).post(`${baseURL}/${drone.id}/load`)
    );

    expect(errorMessage).to.eq(
      `Drone is currently ${drone.state}, cannot be moved to loading state`
    );
  });

  it("should fail drone is not in loading state", async () => {
    const drone = await createDrone(pg, {
      battery_capacity: 20,
      state: "delivering"
    });

    const errorMessage = await getError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      request(app).post(`${baseURL}/${drone.id}/unload`)
    );

    expect(errorMessage).to.eq(
      `Drone is currently ${drone.state}, cannot be moved to unloading state`
    );
  });

  it("should fail if drone not found", async () => {
    const errorMessage = await getError(
      StatusCodes.NOT_FOUND,
      request(app).post(`${baseURL}/${faker.string.uuid()}/load`)
    );

    expect(errorMessage).to.eq("Drone not found");
  });
});

describe("DroneController#makeReady", () => {
  it("should move drone state to delivering", async () => {
    const drone = await createDrone(pg, {
      battery_capacity: 80,
      state: "loaded"
    });
    const response = await getSuccess<Drone>(
      request(app).post(`${baseURL}/${drone.id}/ready`)
    );

    expect(drone.state).to.not.eq(response.state);
    expect(response.state).to.eq("delivering");
  });

  it("should fail if drone not found", async () => {
    const errorMessage = await getError(
      StatusCodes.NOT_FOUND,
      request(app).post(`${baseURL}/${faker.string.uuid()}/ready`)
    );

    expect(errorMessage).to.eq("Drone not found");
  });
});

describe("DroneController#getDetails", () => {
  it.only("should fetch drone items if the drone is loaded", async () => {
    const drone = await createDrone(pg, {
      state: "loaded",
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
      request(app).get(`${baseURL}/${drone.id}/details`)
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
    expect(errorMessage).to.eq("Drone not found");
  });
});
