import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Upload Service Interface
 * Defines the contract for image upload and management operations
 */
export interface IUploadService {
  /**
   * Uploads an image file to the server
   * Validates file type and size before saving
   * @param file - The image file buffer
   * @param filename - The original filename (used for extension detection)
   * @param mimetype - The MIME type of the file
   * @returns Promise that resolves to the URL path of the uploaded image
   * @throws Error if file validation fails
   */
  uploadImage(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string>;

  /**
   * Deletes an image file from the server
   * Handles non-existent files gracefully without throwing errors
   * @param url - The URL path of the image to delete (format: /uploads/{uuid}.{ext})
   * @returns Promise that resolves when deletion is complete
   */
  deleteImage(url: string): Promise<void>;

  /**
   * Validates an image file
   * Checks MIME type and file size constraints
   * @param file - The image file buffer to validate
   * @param mimetype - The MIME type to validate
   * @returns Promise that resolves if validation passes
   * @throws Error if MIME type is invalid or file size exceeds 5MB
   */
  validateImage(file: Buffer, mimetype: string): Promise<void>;
}

/**
 * Upload Service Implementation
 * Handles image file uploads, validation, and deletion
 * Stores files locally in the uploads/ directory with UUID-based filenames
 */
export class UploadService implements IUploadService {
  private readonly uploadsDir: string;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  private readonly MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  constructor() {
    this.uploadsDir = resolve(process.cwd(), "uploads");
    this.ensureUploadsDirExists();
  }

  /**
   * Ensures the uploads directory exists
   * Creates the directory if it doesn't exist
   */
  private ensureUploadsDirExists(): void {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Validates an image file against MIME type and size constraints
   * @param file - The image file buffer
   * @param mimetype - The MIME type of the file
   * @throws Error if MIME type is not allowed or file size exceeds limit
   */
  async validateImage(file: Buffer, mimetype: string): Promise<void> {
    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new Error("Invalid file type. Only JPG, PNG, and WEBP are allowed");
    }

    // Check file size (5MB max)
    if (file.length > this.MAX_FILE_SIZE) {
      throw new Error("Image must be under 5MB. Please choose a smaller file");
    }
  }

  /**
   * Uploads an image file to the uploads directory
   * Generates a UUID-based filename and saves the file
   * @param file - The image file buffer
   * @param _filename - The original filename (not used, kept for interface compatibility)
   * @param mimetype - The MIME type of the file
   * @returns The URL path to access the uploaded image
   */
  async uploadImage(
    file: Buffer,
    _filename: string,
    mimetype: string,
  ): Promise<string> {
    // Validate image first
    await this.validateImage(file, mimetype);

    // Ensure uploads directory exists
    this.ensureUploadsDirExists();

    // Generate UUID filename with appropriate extension
    const uuid = randomUUID();
    const extension = this.MIME_TO_EXT[mimetype];
    const filename_generated = `${uuid}${extension}`;
    const filePath = resolve(this.uploadsDir, filename_generated);

    // Save file to disk
    writeFileSync(filePath, file);

    // Return URL path
    return `/uploads/${filename_generated}`;
  }

  /**
   * Deletes an image file from the uploads directory
   * Extracts filename from URL path and deletes the file
   * Handles non-existent files gracefully
   * @param url - The URL path of the image (format: /uploads/{uuid}.{ext})
   */
  async deleteImage(url: string): Promise<void> {
    // Extract filename from URL path
    const filename = url.split("/").pop();
    if (!filename) {
      return;
    }

    const filePath = resolve(this.uploadsDir, filename);

    // Delete file if it exists
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Silently handle errors (e.g., file already deleted)
      // This makes the operation idempotent
    }
  }
}

/**
 * Singleton instance of the upload service
 * Use this instance throughout the application
 */
export const uploadService = new UploadService();
