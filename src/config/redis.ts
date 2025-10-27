import { EnvConfig } from "@app/internal/env";
import { Logger } from "@risemaxi/octonet";
import Redis from "ioredis";

let redis: Redis;

export async function createRedis(logger: Logger, env: EnvConfig) {
  redis = redis ?? new Redis(env.redis_url, { password: env.redis_password });
  redis.on("error", err => logger.error(err));

  return redis;
}

export function getRedisConnection() {
  return redis;
}
