import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Storage Service Interface
 * Abstracts file storage operations to allow swapping between
 * local filesystem, S3, R2, or other storage backends.
 */
export interface IStorageService {
  /**
   * Uploads a file to storage
   * @param file - The file buffer
   * @param filename - The generated filename (e.g., UUID-based)
   * @param mimetype - The MIME type (used for Content-Type in cloud storage)
   * @returns The URL or path to access the uploaded file
   */
  upload(file: Buffer, filename: string, mimetype: string): Promise<string>;

  /**
   * Deletes a file from storage
   * @param url - The URL or path of the file to delete
   */
  delete(url: string): Promise<void>;

  /**
   * Generates a signed URL for temporary access (optional, cloud storage only)
   * @param key - The storage key or path
   * @param expiresIn - Expiration time in seconds
   * @returns A signed URL with temporary access
   */
  getSignedUrl?(key: string, expiresIn: number): Promise<string>;
}

/**
 * Local filesystem storage implementation
 * Stores files in a local directory and serves them via static file routes.
 */
export class LocalStorageService implements IStorageService {
  private readonly uploadsDir: string;

  constructor(uploadsDir: string) {
    this.uploadsDir = uploadsDir;
    this.ensureUploadsDirExists();
  }

  private ensureUploadsDirExists(): void {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async upload(
    file: Buffer,
    filename: string,
    _mimetype: string,
  ): Promise<string> {
    this.ensureUploadsDirExists();
    const filePath = resolve(this.uploadsDir, filename);
    writeFileSync(filePath, file);
    return `/uploads/${filename}`;
  }

  async delete(url: string): Promise<void> {
    const filename = url.split("/").pop();
    if (!filename) {
      return;
    }

    const filePath = resolve(this.uploadsDir, filename);

    // Security check: prevent path traversal attacks
    if (!filePath.startsWith(this.uploadsDir)) {
      return;
    }

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Silently handle errors (idempotent deletion)
    }
  }
}

/**
 * S3/R2 storage implementation (placeholder)
 * To be implemented when moving to cloud storage.
 */
export class S3StorageService implements IStorageService {
  async upload(
    _file: Buffer,
    _filename: string,
    _mimetype: string,
  ): Promise<string> {
    throw new Error("S3StorageService not implemented");
  }

  async delete(_url: string): Promise<void> {
    throw new Error("S3StorageService not implemented");
  }

  async getSignedUrl(_key: string, _expiresIn: number): Promise<string> {
    throw new Error("S3StorageService not implemented");
  }
}
