import "module-alias/register";
import "reflect-metadata";
import "./http/controllers";
import "./jobs";

import Environment, { EnvConfig, envSchema, setupEnv } from "./internal/env";
import { JobRunner, Logger, defaultSerializers } from "@risemaxi/octonet";

import APP_TYPES from "./config/types";
import { App } from "./app";
import { Container } from "inversify";
import { DroneRepository } from "@app/drones";
import INTERNAL_TYPES from "./internal/types";
import { Knex } from "knex";
import { MedicationRepository } from "@app/medications";
import { OrderMedicationRepository } from "@app/order-medications";
import { OrderRepository } from "@app/orders";
import Redis from "ioredis";
import { createPostgres } from "./config/postgres";
import { createRedis } from "./config/redis";
import { getRouteInfo } from "inversify-express-utils";
import http from "http";
import prettyjson from "prettyjson";
import { seedDrones } from "./config/bootstrap";

async function isHealthy(pg: Knex) {
  try {
    await pg.raw("select now()");
  } catch (err) {
    throw new Error("postgres is not ready");
  }
}

const start = async () => {
  const envvars = setupEnv(envSchema);
  const environment = new Environment(envvars);
  const env = environment.env();

  const logger = new Logger({
    name: env.app_name,
    serializers: defaultSerializers()
  });

  try {
    const container = new Container();

    container.bind<Logger>(INTERNAL_TYPES.Logger).toConstantValue(logger);
    container.bind<EnvConfig>(INTERNAL_TYPES.Env).toConstantValue(env);

    // setup in-memory store
    const redis = await createRedis(logger, env);
    container.bind<Redis>(INTERNAL_TYPES.Redis).toConstantValue(redis);

    // setup postgres
    const pg = await createPostgres(logger, env);
    container.bind<Knex>(INTERNAL_TYPES.KnexDB).toConstantValue(pg);
    logger.log("successfully connected to postgres and has run migration");

    // setup app bindings
    container
      .bind<DroneRepository>(APP_TYPES.DroneRepository)
      .to(DroneRepository);
    container
      .bind<MedicationRepository>(APP_TYPES.MedicationRepository)
      .to(MedicationRepository);
    container
      .bind<OrderRepository>(APP_TYPES.OrderRepository)
      .to(OrderRepository);
    container
      .bind<OrderMedicationRepository>(APP_TYPES.OrderMedicationRepository)
      .to(OrderMedicationRepository);

    // create an instance of job runner
    const runner = new JobRunner(container);
    await runner.start(redis, logger);

    const app = new App(container, logger, env, () => isHealthy(pg));

    const appServer = app.server.build();
    // start server
    const httpServer = http.createServer(appServer);
    httpServer.listen(env.port);
    httpServer.on("listening", async () => {
      logger.log(`${env.app_name} listening on ${env.port}`);
      await seedDrones(container);
      const routeInfo = getRouteInfo(container);
      console.log(
        prettyjson.render(
          { routes: routeInfo },
          { keysColor: "green", dashColor: "blue", stringColor: "grey" }
        )
      );
    });

    process.on("SIGTERM", async () => {
      logger.log("exiting aplication...");

      httpServer.close(() => {
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error(err);
  }
};

start();
