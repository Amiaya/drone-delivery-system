import { Request, Response } from "express";
import { inject, injectable } from "inversify";

import INTERNAL_TYPES from "./types";
import Logger from "bunyan";
import StatusCodes from "http-status-codes";

export interface GenericMessage {
  message: string;
}

@injectable()
export class Controller<T> {
  @inject(INTERNAL_TYPES.Logger) protected logger: Logger;

  protected send(req: Request, res: Response, body: T) {
    this.logger.info({ req, res });
    res.status(StatusCodes.OK).send(body);
  }
}
