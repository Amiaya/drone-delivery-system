import { faker } from "@faker-js/faker";

interface FileMock {
  originalname: string;
  path: string;
}

export let MOCKED_FILE: FileMock = {
  originalname: faker.internet.url(),
  path: faker.internet.url()
};

export function mockFileUpload(file: FileMock): void {
  MOCKED_FILE = file;
}
