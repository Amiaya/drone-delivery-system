import { NextFunction, Request, Response } from "express";

import { ApplicationError } from "@app/internal/errors";
import Logger from "bunyan";
import Status from "http-status-codes";

/**
 * Middleware for handling `ApplicationError`s. It responses
 * with `INTERNAL_SERVER_ERROR` if the error is not an application error.
 * @param logger logger
 */
export function errors(logger: Logger) {
  return function (err: any, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) return next(err);

    if (err instanceof ApplicationError) {
      res.status(err.code).json({ message: err.message, data: err.data });
    } else {
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        message:
          "This is a system level issue. We are fixing it. Please bear with us"
      });
    }

    logger.error({ err, res, req });
  };
}
