import { Knex } from "knex";
import { Medication } from "medications/medication.model";
import { faker } from "@faker-js/faker";

export function newMedication(dto?: Partial<Medication>) {
  return {
    medication_name: faker.string.alpha({ length: { min: 3, max: 20 } }),
    weight: faker.number.int({ min: 1, max: 500 }),
    image: faker.image.url(),
    ...dto
  };
}
export async function createMedication(pg: Knex, dto?: Partial<Medication>) {
  const [medication] = await pg<Medication>("medications").insert(
    {
      ...newMedication(),
      ...dto
    },
    "*"
  );
  return medication;
}
