import CloudinaryStorage from "multer-storage-cloudinary";
import URL from "url";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();
const uri = URL.parse(process.env.CLOUDINARY_URL, true);

cloudinary.config({
  cloud_name: uri.host,
  api_key: uri.auth && uri.auth.split(":")[0],
  api_secret: uri.auth && uri.auth.split(":")[1],
  private_cdn: uri.pathname != null,
  secure_distribution: uri.pathname && uri.pathname.substring(1),
  secure: true
});

export const multerCloudinaryStorage = (dirname: string) => {
  return CloudinaryStorage({
    cloudinary,
    params: {
      folder: (req: Express.Request) => `${dirname}`,
      format: async (_req: Express.Request, file: Express.Multer.File) => {
        return file.mimetype?.includes("image") ? "jpg" : "";
      },
      resource_type: async (
        _req: Express.Request,
        file: Express.Multer.File
      ) => {
        let resourceType = "raw";
        if (file.mimetype?.includes("image")) resourceType = "image";
        if (file.mimetype?.includes("video")) resourceType = "video";
        return resourceType;
      },
      transformation: async (
        _req: Express.Request,
        file: Express.Multer.File
      ) => {
        return file.mimetype?.includes("image")
          ? [{ width: 500, height: 500, crop: "limit" }]
          : undefined;
      }
    } as any
  });
};

export function multerCloudinaryUpload(dirname: string) {
  return multer({
    storage: multerCloudinaryStorage(dirname),
    limits: { fileSize: 10485760 }
  });
}
