import { DataValidationError, validate } from "./validator";
import joi, { SchemaLike } from "joi";

import dotenv from "dotenv";
import mapKeys from "lodash/mapKeys";

const trimmedString = joi.string().trim();

class IncompleteEnvError extends Error {
  constructor(error: DataValidationError) {
    super(
      `Missing environemnt variables:\n${JSON.stringify(
        error.messages,
        null,
        2
      )}`
    );
  }
}

/**
 * Load process environment and validate the keys needed. Do make sure you
 * specify every key you plan to use in the schema as it removes unknown
 * keys.
 * @param schema schema to use for validation
 */
export function setupEnv<T extends EnvConfig>(schema: SchemaLike): T {
  dotenv.config();
  const processedEnv = mapKeys(process.env, (_, key) => {
    return key.toLowerCase();
  });

  try {
    return validate(processedEnv, schema);
  } catch (err) {
    if (err instanceof DataValidationError) {
      throw new IncompleteEnvError(err);
    }

    throw err;
  }
}

export const envSchema = {
  api_version: trimmedString.default("/api/v1"),
  node_env: trimmedString
    .valid("dev", "test", "production", "staging")
    .default("dev"),
  is_production: joi.when("node_env", {
    is: joi.valid("production"),
    then: joi.boolean().default(true),
    otherwise: joi.boolean().default(false)
  }),
  port: joi.number().required(),
  app_name: trimmedString.default("drone-app"),
  postgres_host: joi.string().required(),
  postgres_port: joi.number().required(),
  postgres_db: joi.string().required(),
  postgres_user: joi.string().required(),
  postgres_password: joi.string().required(),
  postgres_schema: joi.string().required(),
  cloudinary_url: joi.string().uri({ scheme: "cloudinary" }).trim().required(),
  redis_url: joi.string().uri({ scheme: "redis" }).trim().required(),
  redis_password: joi.when("node_env", {
    is: joi.valid("production", "staging"),
    then: trimmedString.required(),
    otherwise: trimmedString.optional()
  })
};

/**
 * Type definition of application env.
 */
export interface EnvConfig {
  /**
   * API version
   */
  api_version: string;
  /**
   * Eqivalent to `NODE_ENV`
   */
  node_env: string;
  /**
   * Is it a production environment ?
   */
  is_production: boolean;
  /**
   * What port number to serve the app
   */
  port: number;
  /**
   * Name of the app. This will appear in the logs
   */
  app_name: string;
  /**
   * Postgres Test DB Name
   */
  test_postgres_db: string;
  /**
   * Postgres host
   */
  postgres_host: string;
  /**
   * Postgres port
   */
  postgres_port: number;
  /**
   * Postgres DB name
   */
  postgres_db: string;
  /**
   * Postgres user
   */
  postgres_user: string;
  /**
   * Postgres password
   */
  postgres_password: string;
  /**
   * Postgres schema
   */
  postgres_schema: string;
  /*
   * Cloudinary URL
   */
  cloudinary_url: string;
  /**
   * Redis URL
   */
  redis_url: string;
  /**
   * Redis passord
   */
  redis_password: string;
}

export default class Environment {
  private envvars: EnvConfig;

  constructor(envConfig: EnvConfig) {
    this.envvars = envConfig;
  }

  env() {
    return this.envvars;
  }
}
