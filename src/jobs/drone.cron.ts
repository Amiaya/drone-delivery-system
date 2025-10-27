import { inject, injectable } from "inversify";

import APP_TYPES from "@app/config/types";
import { DroneRepository } from "@app/drones";
import INTERNAL_TYPES from "@app/internal/types";
import Logger from "bunyan";
import { OrderRepository } from "@app/orders";
import cron from "node-cron";
import { subMinutes } from "date-fns";

@injectable()
export class DroneCronJob {
  @inject(APP_TYPES.OrderRepository) private repo: OrderRepository;
  @inject(APP_TYPES.DroneRepository) private drones: DroneRepository;
  @inject(INTERNAL_TYPES.Logger) private logger: Logger;

  /**
   * Start all cron jobs
   */
  start() {
    // Battery drain job
    cron.schedule("*/15 * * * *", () => this.batteryDrain());

    // Battery charge job
    cron.schedule("*/15 * * * *", () => this.batteryCharge());

    // Process pending orders job
    cron.schedule("*/5 * * * *", () => this.processPendingOrders());

    // Reset delivered drones job
    cron.schedule("*/10 * * * *", () => this.fetchDeliveredDrones());

    this.logger.info("🕒 Drone cron jobs scheduled successfully.");
  }

  private async batteryDrain() {
    this.logger.info("🚁 Starting battery drain simulation...");

    const drones = await this.drones.fetchAvailableDrones();
    this.logger.info(`Found ${drones.length} active drones to drain.`);

    for (const drone of drones) {
      const newBatteryLevel = Math.max(
        0,
        drone.battery_capacity - Math.floor(Math.random() * 10)
      );
      await this.drones.updateBatteryCapacity(drone.id, newBatteryLevel);
      this.logger.info(
        `🔋 Drone ${drone.id} battery reduced from ${drone.battery_capacity}% → ${newBatteryLevel}%.`
      );
    }

    this.logger.info("✅ Battery drain simulation completed.");
  }

  private async batteryCharge() {
    this.logger.info("🔌 Starting battery charge simulation...");

    const drones = await this.drones.fetchIdleDrones();
    this.logger.info(`Found ${drones.length} idle drones to charge.`);

    for (const drone of drones) {
      const newBatteryLevel = Math.min(
        100,
        drone.battery_capacity + Math.floor(Math.random() * 10)
      );
      await this.drones.updateBatteryCapacity(drone.id, newBatteryLevel);
      this.logger.info(
        `⚡ Drone ${drone.id} battery increased from ${drone.battery_capacity}% → ${newBatteryLevel}%.`
      );
    }

    this.logger.info("✅ Battery charge simulation completed.");
  }

  private async processPendingOrders() {
    this.logger.info("📦 Checking for pending orders to process...");

    const last5Mins = subMinutes(new Date(), 5);
    const pendingOrders = await this.repo.fetchOrdersByStatus(
      "pending",
      last5Mins
    );
    this.logger.info(`Found ${pendingOrders.length} pending orders.`);

    for (const order of pendingOrders) {
      const drone = await this.drones.getById(order.drone_id);

      await this.repo.updateOrderStatus(order.id, "successful");
      await this.drones.updateState(drone.id, "delivered");

      this.logger.info(
        `✅ Order ${order.id} marked successful. Drone ${drone.id} set to delivered.`
      );
    }

    this.logger.info("🚀 Pending order processing completed.");
  }

  private async fetchDeliveredDrones() {
    this.logger.info("🔄 Checking for drones in 'delivered' state to reset...");

    const last10Mins = subMinutes(new Date(), 10);
    const deliveredDrones = await this.drones.fetchDronesInDelivered(
      last10Mins
    );
    this.logger.info(
      `Found ${deliveredDrones.length} drones to reset to idle.`
    );

    for (const drone of deliveredDrones) {
      await this.drones.updateState(drone.id, "idle");
      this.logger.info(`♻️ Drone ${drone.id} state updated to idle.`);
    }

    this.logger.info("✅ Delivered drone reset completed.");
  }
}
