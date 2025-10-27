import { Application } from "express";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";

export function setupSwagger(app: Application) {
  const swaggerDocument = YAML.load("./src/docs/swagger.yaml");
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
