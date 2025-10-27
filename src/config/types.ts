const APP_TYPES = {
  DroneRepository: Symbol.for("DroneRepository"),
  MedicationRepository: Symbol.for("MedicationRepository"),
  OrderRepository: Symbol.for("OrderRepository"),
  OrderMedicationRepository: Symbol.for("OrderMedicationRepository"),
  DroneCronJob: Symbol.for("DroneCronJob")
};

export default APP_TYPES;
