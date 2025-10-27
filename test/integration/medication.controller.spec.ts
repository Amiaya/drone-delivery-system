import "module-alias/register";
import "reflect-metadata";
import "../helpers/multer";
import "../../src/http/controllers/medications/medication.controller";

import Environment, { EnvConfig, envSchema, setupEnv } from "@app/internal/env";
import { Logger, defaultSerializers } from "@risemaxi/octonet";
import { Medication, MedicationRepository } from "@app/medications";
import chai, { expect } from "chai";
import { createMedication, newMedication } from "../helpers/medication";
import { getError, getSuccess, repeat } from "../helper";

import APP_TYPES from "@app/config/types";
import { App } from "../../src/app";
import { Application } from "express";
import { Container } from "inversify";
import INTERNAL_TYPES from "@app/internal/types";
import { Knex } from "knex";
import { StatusCodes } from "http-status-codes";
import chaiAsPromised from "chai-as-promised";
import { createPostgres } from "@app/config/postgres";
import { faker } from "@faker-js/faker";
import request from "supertest";

chai.use(chaiAsPromised);

const baseURL = "/api/v1/medications";

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
    .bind<MedicationRepository>(APP_TYPES.MedicationRepository)
    .to(MedicationRepository);

  app = new App(container, logger, env).server.build();
});

afterAll(async () => {
  await pg.destroy();
});

afterEach(async () => {
  await pg("medications").del();
});

describe("MedicationController#create", () => {
  it("should create a new medication", async () => {
    const dto = newMedication();

    const response = await getSuccess<Medication>(
      request(app).post(baseURL).send(dto)
    );

    expect(response.medication_name).to.eq(dto.medication_name);
  });

  it("should create a new medication", async () => {
    const dto = newMedication();
    const code = "MED-123456";
    await createMedication(pg, { medication_name: dto.medication_name, code });

    const errorMessage = await getError(
      StatusCodes.CONFLICT,
      request(app).post(baseURL).send(dto)
    );

    expect(errorMessage).to.eq(
      "A medication with the given details already exists"
    );
  });
});

describe("MedicationController#list", () => {
  it("should list all medications", async () => {
    await repeat(3, async () => {
      const code = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
      await createMedication(pg, {
        code
      });
    });

    const response = await getSuccess<Medication[]>(
      request(app).get(baseURL).query({
        nopaginate: true
      })
    );

    expect(response.length).to.eq(3);
  });
});

describe("MedicationController#fetch", () => {
  it("should fetch a medication", async () => {
    const dto = newMedication();
    const code = "MED-123456";
    const medication = await createMedication(pg, {
      medication_name: dto.medication_name,
      code
    });

    const response = await getSuccess<Medication>(
      request(app).get(`${baseURL}/${medication.id}`)
    );

    expect(response.medication_name).to.eq(dto.medication_name);
  });

  it("should fail if medication not found", async () => {
    const errorMessage = await getError(
      StatusCodes.NOT_FOUND,
      request(app).get(`${baseURL}/${faker.string.uuid()}`)
    );

    expect(errorMessage).to.eq("Medication not found");
  });
});
