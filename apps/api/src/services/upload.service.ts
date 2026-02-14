import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { env } from "@/config/env.js";
import { InvalidFileTypeError, FileTooLargeError } from "../errors.js";
import type { IStorageService } from "./storage.service.js";

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
   * Checks MIME type, file size, and magic bytes
   * @param file - The image file buffer to validate
   * @param mimetype - The MIME type to validate
   * @returns Promise that resolves if validation passes
   * @throws Error if MIME type is invalid, magic bytes don't match, or file size exceeds 5MB
   */
  validateImage(file: Buffer, mimetype: string): Promise<void>;
}

/**
 * Upload Service Implementation
 * Handles image file uploads, validation, and deletion.
 * Delegates storage operations to a StorageService backend.
 */
export class UploadService implements IUploadService {
  private readonly storage: IStorageService;
  private readonly MAX_FILE_SIZE: number;
  private readonly ALLOWED_MIME_TYPES: string[];
  private readonly MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  constructor(storage: IStorageService) {
    this.storage = storage;
    this.MAX_FILE_SIZE = env.MAX_FILE_SIZE;
    this.ALLOWED_MIME_TYPES = env.ALLOWED_MIME_TYPES;
  }

  /**
   * Validates an image file against MIME type, size, and magic byte constraints
   * @param file - The image file buffer
   * @param mimetype - The MIME type of the file
   * @throws Error if MIME type is not allowed or file size exceeds limit
   */
  async validateImage(file: Buffer, mimetype: string): Promise<void> {
    // Check declared MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new InvalidFileTypeError(
        "Invalid file type. Only JPG, PNG, and WEBP are allowed",
      );
    }

    // Check file size (5MB max)
    if (file.length > this.MAX_FILE_SIZE) {
      throw new FileTooLargeError(
        "Image must be under 5MB. Please choose a smaller file",
      );
    }

    // Verify magic bytes match declared MIME type
    const detectedType = await fileTypeFromBuffer(file);
    if (!detectedType || detectedType.mime !== mimetype) {
      throw new InvalidFileTypeError(
        "File content does not match declared type. Only JPG, PNG, and WEBP are allowed",
      );
    }
  }

  /**
   * Uploads an image file via the storage backend
   * Generates a UUID-based filename and delegates to storage
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

    // Generate UUID filename with appropriate extension
    const uuid = randomUUID();
    const extension = this.MIME_TO_EXT[mimetype];
    const generatedFilename = `${uuid}${extension}`;

    // Delegate to storage backend
    return this.storage.upload(file, generatedFilename, mimetype);
  }

  /**
   * Deletes an image file via the storage backend
   * @param url - The URL path of the image (format: /uploads/{uuid}.{ext})
   */
  async deleteImage(url: string): Promise<void> {
    await this.storage.delete(url);
  }
}
