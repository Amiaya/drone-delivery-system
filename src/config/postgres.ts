import { EnvConfig } from "@app/internal/env";
import { Logger } from "@risemaxi/octonet";
import Postgrator from "postgrator";
import { excludeProperties } from "@app/internal/postgres";
import knex from "knex";
import path from "path";
import pgql from "pg";

// parse numeric types as floats
pgql.types.setTypeParser(pgql.types.builtins.NUMERIC, parseFloat);

export async function createPostgres(logger: Logger, env: EnvConfig) {
  if (env.is_production) {
    pgql.defaults.ssl = true;
  }

  const pg = knex({
    client: "pg",
    connection: {
      host: env.postgres_host,
      port: env.postgres_port,
      user: env.postgres_user,
      password: env.postgres_password,
      database:
        env.node_env === "test" ? env.test_postgres_db : env.postgres_db,
      ssl: env.is_production ? { rejectUnauthorized: false } : false,
      application_name: env.app_name
    },
    searchPath: [env.postgres_schema],
    postProcessResponse: (result, queryContext) => {
      return excludeProperties(result, queryContext);
    }
  });
  pg.on("error", err => logger.error(err));

  // Create postgrator instance
  const postgrator = new Postgrator({
    migrationPattern: path.join(process.cwd(), "db/migrations/*"),
    driver: "pg",
    database: env.node_env === "test" ? env.test_postgres_db : env.postgres_db,
    schemaTable: "schema_migrations",
    currentSchema: env.postgres_schema,
    execQuery: query => pg.raw(query)
  });

  await pg.raw(
    `
     create schema if not exists ${env.postgres_schema} authorization ${env.postgres_user};
     set search_path to public;
     create extension if not exists pgcrypto;
    `
  );

  await postgrator.migrate();

  return pg;
}
