import { Controller } from "@app/internal/http";
import { Request, Response } from "express";

import { Drone, DroneQuery, DroneRepository } from "@app/drones";
import { PaginatedResult } from "@app/internal/postgres";
import {
  controller,
  httpGet,
  httpPost,
  queryParam,
  request,
  requestParam,
  response
} from "inversify-express-utils";
import { autoValidate, isEntityId } from "@app/internal/validator";
import { isDroneParams, isDroneQuery } from "./drone.validator";
import { inject } from "inversify";
import APP_TYPES from "@app/config/types";
import { ApplicationError } from "@app/internal/errors";
import { StatusCodes } from "http-status-codes";

export type ControllerResponse = Drone | Drone[] | PaginatedResult<Drone>;

@controller("/drones")
export class DroneController extends Controller<ControllerResponse> {
  @inject(APP_TYPES.DroneRepository) private repo: DroneRepository;

  @httpGet("/", autoValidate(isDroneQuery, "query"))
  async list(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: DroneQuery
  ) {
    const drones = await this.repo.list(query);
    this.send(req, res, drones);
  }

  @httpGet("/:id", autoValidate(isEntityId, "params"))
  async getByID(
    @request() req: Request,
    @response() res: Response,
    @requestParam("id") id: string
  ) {
    const drone = await this.repo.getById(id);

    if (!drone) {
      throw new ApplicationError(StatusCodes.NOT_FOUND, "Drone not found");
    }

    this.send(req, res, drone);
  }

  @httpPost("/:id/ready", autoValidate(isEntityId, "params"))
  async makeReady(
    @request() req: Request,
    @response() res: Response,
    @requestParam("id") id: string
  ) {
    const drone = await this.repo.getById(id);

    if (!drone) {
      throw new ApplicationError(StatusCodes.NOT_FOUND, "Drone not found");
    }

    if (drone.state !== "loaded") {
      throw new ApplicationError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `Drone is currently ${drone.state}, you can only make drones in 'loaded' state ready for delivery`
      );
    }

    const updatedDrone = await this.repo.updateState(id, "delivering");

    this.send(req, res, updatedDrone);
  }

  @httpPost("/:id/:action", autoValidate(isDroneParams, "params"))
  async loadOrUnloadDrone(
    @request() req: Request,
    @response() res: Response,
    @requestParam("id") id: string,
    @requestParam("action") action: "load" | "unload"
  ) {
    const drone = await this.repo.getById(id);

    if (!drone) {
      throw new ApplicationError(StatusCodes.NOT_FOUND, "Drone not found");
    }

    let updatedDrone: Drone;

    switch (action) {
      case "load":
        if (drone.battery_capacity < 25) {
          throw new ApplicationError(
            StatusCodes.BAD_REQUEST,
            "Drone battery is below 25%, cannot load"
          );
        }

        if (drone.state !== "idle") {
          throw new ApplicationError(
            StatusCodes.UNPROCESSABLE_ENTITY,
            `Drone is currently ${drone.state}, cannot be moved to loading state`
          );
        }

        updatedDrone = await this.repo.updateState(id, "loading");
        break;

      case "unload":
        if (drone.state !== "loading") {
          throw new ApplicationError(
            StatusCodes.UNPROCESSABLE_ENTITY,
            `Drone is currently ${drone.state}, cannot be moved to unloading state`
          );
        }

        updatedDrone = await this.repo.updateState(id, "idle");
        break;
    }

    this.send(req, res, updatedDrone);
  }
}
