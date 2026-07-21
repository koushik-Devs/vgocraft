/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  const sanitizedFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (hasCloudinary) {
    try {
      // Lazy import cloudinary to avoid crash if not installed/configured
      const cloudinary = await import("cloudinary");
      cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            resource_type: "auto",
            public_id: path.parse(sanitizedFileName).name,
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary Upload Error, falling back to local:", error);
              // Fallback to local save
              saveLocally(fileBuffer, sanitizedFileName);
              resolve(`/uploads/${sanitizedFileName}`);
            } else {
              resolve(result?.secure_url || `/uploads/${sanitizedFileName}`);
            }
          }
        );
        uploadStream.end(fileBuffer);
      });
    } catch (e) {
      console.error("Cloudinary initialization failed, falling back to local:", e);
    }
  }

  // Local fallback save
  saveLocally(fileBuffer, sanitizedFileName);
  return `/uploads/${sanitizedFileName}`;
}

function saveLocally(buffer: Buffer, fileName: string) {
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`💾 Saved file locally to ${filePath}`);
}
