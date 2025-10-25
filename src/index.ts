import "module-alias/register";
import "reflect-metadata";
import "./http/controllers";

import Environment, { EnvConfig, envSchema, setupEnv } from "./internal/env";

import { App } from "./app";
import { Container } from "inversify";
import INTERNAL_TYPES from "./internal/types";
import { Knex } from "knex";
import Logger from "bunyan";
import { createPostgres } from "./config/postgres";
import { getRouteInfo } from "inversify-express-utils";
import http from "http";
import prettyjson from "prettyjson";

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

    const app = new App(container, logger, env, () => isHealthy(pg));

    const appServer = app.server.build();
    // start server
    const httpServer = http.createServer(appServer);
    httpServer.listen(env.port);
    httpServer.on("listening", async () => {
      logger.info(`${env.app_name} listening on ${env.port}`);
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
