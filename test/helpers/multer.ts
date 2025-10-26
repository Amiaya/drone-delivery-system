import { MOCKED_FILE } from "./upload";

jest.mock("multer", () => {
  return jest.fn().mockImplementation(() => {
    return {
      single: jest.fn().mockImplementation(() => {
        return (req: any, _res: any, next: any) => {
          req.file = MOCKED_FILE;
          next();
        };
      })
    };
  });
});
