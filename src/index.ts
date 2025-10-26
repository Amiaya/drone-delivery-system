import "module-alias/register";
import "reflect-metadata";
import "./http/controllers";

import Environment, { EnvConfig, envSchema, setupEnv } from "./internal/env";

import APP_TYPES from "./config/types";
import { App } from "./app";
import { Container } from "inversify";
import { DroneRepository } from "@app/drones";
import INTERNAL_TYPES from "./internal/types";
import { Knex } from "knex";
import Logger from "bunyan";
import { MedicationRepository } from "@app/medications";
import { createPostgres } from "./config/postgres";
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
    name: env.app_name
  });

  try {
    const container = new Container();

    container.bind<Logger>(INTERNAL_TYPES.Logger).toConstantValue(logger);
    container.bind<EnvConfig>(INTERNAL_TYPES.Env).toConstantValue(env);

    // setup postgres
    const pg = await createPostgres(logger, env);
    container.bind<Knex>(INTERNAL_TYPES.KnexDB).toConstantValue(pg);
    logger.info("successfully connected to postgres and has run migration");

    // setup app bindings
    container
      .bind<DroneRepository>(APP_TYPES.DroneRepository)
      .to(DroneRepository);
    container
      .bind<MedicationRepository>(APP_TYPES.MedicationRepository)
      .to(MedicationRepository);

    const app = new App(container, logger, env, () => isHealthy(pg));

    const appServer = app.server.build();
    // start server
    const httpServer = http.createServer(appServer);
    httpServer.listen(env.port);
    httpServer.on("listening", async () => {
      logger.info(`${env.app_name} listening on ${env.port}`);
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
      logger.info("exiting aplication...");

      httpServer.close(() => {
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error(err);
  }
};

start();
