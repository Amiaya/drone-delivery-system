import sinon, { SinonFakeTimers } from "sinon";

import { StatusCodes } from "http-status-codes";
import { Test } from "supertest";
import ms from "ms";
import parser from "cron-parser";
import { promisify } from "util";

export const sleep = promisify(setTimeout);
type JumpFn = (time: string) => void;
let sinonClock: SinonFakeTimers | null;

export async function getSuccess<T>(t: Test) {
  const { body } = await t.expect(StatusCodes.OK);
  return body as T;
}

export async function getError(code: number, t: Test): Promise<string> {
  const { body } = await t.expect(code);
  return body.message;
}

/**
 * Generate multiple version using a mock data function.
 * @param n number of values to generate
 * @param fn mock data function
 */
export function multiply<T>(n: number, fn: () => T): T[] {
  const results: T[] = [];

  for (let i = 0; i < n; i++) {
    results.push(fn());
  }

  return results;
}

/**
 * Run async job `fn` `n` times.
 * @param n number of times to run it
 * @param fn job to run
 */
export async function repeat(
  n: number,
  fn: (i?: number) => Promise<any>
): Promise<any[]> {
  const jobs = Array.from({ length: n }).map((_x, i) => fn(i));
  return Promise.all(jobs);
}

/**
 * Run async jobs using array as job source.
 * @param s source arry
 * @param fn job to run
 */
export async function mapAsync<T>(
  s: T[],
  fn: (t: T) => Promise<any>
): Promise<any[]> {
  return Promise.all(s.map(x => fn(x)));
}

/**
 * Runs the given function while time is reset to the beginning
 * @param f function to be run with paused time. It accepts a function that can be
 * used to jump further
 */
export async function withTimePaused(f: (j: JumpFn) => Promise<void>) {
  sinonClock = sinon.useFakeTimers();
  try {
    await f((t: string) => {
      sinonClock?.tick(ms(t));
    });
  } catch (err) {
    throw err;
  } finally {
    sinonClock?.restore();
    sinonClock = null;
  }
}

/**
 * Jump to specific time and pass it by `extra`. It restores time once you call
 * the `jump` method.
 * @param cronExpr cron expression used to determine where to jump to
 * @param extra how long past the execution time should it jump to
 * @returns a function you call to actually jump time
 */
export function jumpBy(cronExpr: string, extra = "1m") {
  const gap = ms("1m");
  const interval = parser.parseExpression(cronExpr);
  const nextExec = interval.next().toDate();
  const preface = new Date(nextExec.getTime() - gap);

  sinonClock = sinon.useFakeTimers(preface);
  const extraTime = gap + ms(extra);

  return async function (ms?: number) {
    sinonClock?.tick(extraTime);
    sinonClock?.restore();
    sinonClock = null;
    if (ms) {
      return sleep(ms);
    }
  };
}
