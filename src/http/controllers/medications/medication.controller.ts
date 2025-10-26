import {
  DuplicateMedication,
  Medication,
  MedicationDTO,
  MedicationQuery,
  MedicationRepository
} from "@app/medications";
import { Request, Response } from "express";

import APP_TYPES from "@app/config/types";
import { Controller } from "@app/internal/http";
import { PaginatedResult } from "@app/internal/postgres";
import {
  controller,
  httpGet,
  httpPost,
  queryParam,
  request,
  requestBody,
  requestParam,
  response
} from "inversify-express-utils";
import { inject } from "inversify";
import { autoValidate, isEntityId } from "@app/internal/validator";
import { isMedicationDTO, isMedicationQuery } from "./medication.validator";
import { multerCloudinaryUpload } from "@app/http/middlewares/upload";
import { ApplicationError } from "@app/internal/errors";
import { StatusCodes } from "http-status-codes";
import { generateDatedShortCode } from "@app/internal/string";

export type ControllerResponse =
  | Medication
  | Medication[]
  | PaginatedResult<Medication>;

@controller("/medications")
export class MedicationController extends Controller<ControllerResponse> {
  @inject(APP_TYPES.MedicationRepository) private repo: MedicationRepository;

  @httpPost(
    "/",
    multerCloudinaryUpload("medication-pictures").single("image"),
    autoValidate(isMedicationDTO)
  )
  async create(
    @request() req: Request,
    @response() res: Response,
    @requestBody() dto: MedicationDTO
  ) {
    try {
      const orderCode = await this.getOrderCode();
      const medication = await this.repo.create({
        ...dto,
        code: orderCode,
        image: req.file?.path
      });

      this.send(req, res, medication);
    } catch (error) {
      if (error instanceof DuplicateMedication) {
        throw new ApplicationError(StatusCodes.CONFLICT, error.message);
      }

      throw error;
    }
  }

  @httpGet("/", autoValidate(isMedicationQuery, "query"))
  async list(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: MedicationQuery
  ) {
    const medications = await this.repo.list(query);
    this.send(req, res, medications);
  }

  @httpGet("/:id", autoValidate(isEntityId, "params"))
  async getByID(
    @request() req: Request,
    @response() res: Response,
    @requestParam("id") id: string
  ) {
    const medication = await this.repo.getById(id);

    if (!medication) {
      throw new ApplicationError(StatusCodes.NOT_FOUND, "Medication not found");
    }

    this.send(req, res, medication);
  }

  private async getOrderCode() {
    let orderCode = generateDatedShortCode();
    let retries = 0;
    const maxRetries = 10;
    let isAvailable = await this.repo.isOrderCodeAvailable(orderCode);

    while (retries < maxRetries && !isAvailable) {
      orderCode = generateDatedShortCode();
      isAvailable = await this.repo.isOrderCodeAvailable(orderCode);
      retries++;
    }

    return isAvailable ? orderCode : null;
  }
}
