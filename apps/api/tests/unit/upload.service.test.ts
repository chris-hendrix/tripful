import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { uploadService } from '@/services/upload.service.js';

describe('upload.service', () => {
  const testUploadsDir = resolve(process.cwd(), 'uploads');

  // Clean up test uploads directory after each test
  const cleanup = () => {
    if (existsSync(testUploadsDir)) {
      const files = readdirSync(testUploadsDir);
      files.forEach((file) => {
        unlinkSync(resolve(testUploadsDir, file));
      });
    }
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  describe('validateImage', () => {
    it('should accept valid MIME type: image/jpeg', async () => {
      const buffer = Buffer.from('fake image data');
      await expect(uploadService.validateImage(buffer, 'image/jpeg')).resolves.not.toThrow();
    });

    it('should accept valid MIME type: image/png', async () => {
      const buffer = Buffer.from('fake image data');
      await expect(uploadService.validateImage(buffer, 'image/png')).resolves.not.toThrow();
    });

    it('should accept valid MIME type: image/webp', async () => {
      const buffer = Buffer.from('fake image data');
      await expect(uploadService.validateImage(buffer, 'image/webp')).resolves.not.toThrow();
    });

    it('should reject invalid MIME type', async () => {
      const buffer = Buffer.from('fake image data');
      await expect(uploadService.validateImage(buffer, 'image/gif')).rejects.toThrow(
        'Invalid file type. Only JPG, PNG, and WEBP are allowed'
      );
    });

    it('should reject invalid MIME type: text/plain', async () => {
      const buffer = Buffer.from('fake text data');
      await expect(uploadService.validateImage(buffer, 'text/plain')).rejects.toThrow(
        'Invalid file type. Only JPG, PNG, and WEBP are allowed'
      );
    });

    it('should reject file larger than 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await expect(uploadService.validateImage(largeBuffer, 'image/jpeg')).rejects.toThrow(
        'Image must be under 5MB. Please choose a smaller file'
      );
    });

    it('should accept file exactly at 5MB', async () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // Exactly 5MB
      await expect(uploadService.validateImage(buffer, 'image/jpeg')).resolves.not.toThrow();
    });

    it('should accept file smaller than 5MB', async () => {
      const buffer = Buffer.alloc(1 * 1024 * 1024); // 1MB
      await expect(uploadService.validateImage(buffer, 'image/png')).resolves.not.toThrow();
    });

    it('should reject file just over 5MB', async () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024 + 1); // 5MB + 1 byte
      await expect(uploadService.validateImage(buffer, 'image/webp')).rejects.toThrow(
        'Image must be under 5MB. Please choose a smaller file'
      );
    });
  });

  describe('uploadImage', () => {
    it('should create uploads directory if it does not exist', async () => {
      // Remove uploads directory if it exists
      if (existsSync(testUploadsDir)) {
        rmSync(testUploadsDir, { recursive: true });
      }

      const buffer = Buffer.from('test image data');
      const url = await uploadService.uploadImage(buffer, 'test.jpg', 'image/jpeg');

      expect(existsSync(testUploadsDir)).toBe(true);
      expect(url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.jpg$/);
    });

    it('should save file with UUID filename for JPEG', async () => {
      const buffer = Buffer.from('test jpeg image data');
      const url = await uploadService.uploadImage(buffer, 'photo.jpg', 'image/jpeg');

      expect(url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.jpg$/);
      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);
      expect(existsSync(filepath)).toBe(true);
    });

    it('should save file with UUID filename for PNG', async () => {
      const buffer = Buffer.from('test png image data');
      const url = await uploadService.uploadImage(buffer, 'photo.png', 'image/png');

      expect(url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.png$/);
      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);
      expect(existsSync(filepath)).toBe(true);
    });

    it('should save file with UUID filename for WEBP', async () => {
      const buffer = Buffer.from('test webp image data');
      const url = await uploadService.uploadImage(buffer, 'photo.webp', 'image/webp');

      expect(url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.webp$/);
      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);
      expect(existsSync(filepath)).toBe(true);
    });

    it('should return correct URL path format', async () => {
      const buffer = Buffer.from('test image data');
      const url = await uploadService.uploadImage(buffer, 'test.jpg', 'image/jpeg');

      expect(url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.jpg$/);
      expect(url.startsWith('/uploads/')).toBe(true);
    });

    it('should generate unique filenames for multiple uploads', async () => {
      const buffer = Buffer.from('test image data');
      const url1 = await uploadService.uploadImage(buffer, 'test1.jpg', 'image/jpeg');
      const url2 = await uploadService.uploadImage(buffer, 'test2.jpg', 'image/jpeg');
      const url3 = await uploadService.uploadImage(buffer, 'test3.jpg', 'image/jpeg');

      expect(url1).not.toBe(url2);
      expect(url2).not.toBe(url3);
      expect(url1).not.toBe(url3);
    });

    it('should save file contents correctly', async () => {
      const testContent = 'test image data content';
      const buffer = Buffer.from(testContent);
      const url = await uploadService.uploadImage(buffer, 'test.png', 'image/png');

      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);
      const fs = await import('node:fs');
      const savedContent = fs.readFileSync(filepath, 'utf-8');
      expect(savedContent).toBe(testContent);
    });

    it('should validate image before uploading', async () => {
      const buffer = Buffer.from('test image data');
      await expect(
        uploadService.uploadImage(buffer, 'test.txt', 'text/plain')
      ).rejects.toThrow('Invalid file type. Only JPG, PNG, and WEBP are allowed');
    });

    it('should not save file if validation fails', async () => {
      const buffer = Buffer.from('test image data');
      const beforeFiles = existsSync(testUploadsDir) ? readdirSync(testUploadsDir) : [];

      await expect(
        uploadService.uploadImage(buffer, 'test.gif', 'image/gif')
      ).rejects.toThrow();

      const afterFiles = existsSync(testUploadsDir) ? readdirSync(testUploadsDir) : [];
      expect(afterFiles.length).toBe(beforeFiles.length);
    });
  });

  describe('deleteImage', () => {
    it('should delete existing file', async () => {
      const buffer = Buffer.from('test image data');
      const url = await uploadService.uploadImage(buffer, 'test.jpg', 'image/jpeg');

      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);
      expect(existsSync(filepath)).toBe(true);

      await uploadService.deleteImage(url);
      expect(existsSync(filepath)).toBe(false);
    });

    it('should handle non-existent file gracefully', async () => {
      const nonExistentUrl = '/uploads/non-existent-file.jpg';
      await expect(uploadService.deleteImage(nonExistentUrl)).resolves.not.toThrow();
    });

    it('should extract filename from URL path correctly', async () => {
      const buffer = Buffer.from('test image data');
      const url = await uploadService.uploadImage(buffer, 'test.png', 'image/png');

      await uploadService.deleteImage(url);

      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);
      expect(existsSync(filepath)).toBe(false);
    });

    it('should only delete the specified file', async () => {
      const buffer = Buffer.from('test image data');
      const url1 = await uploadService.uploadImage(buffer, 'test1.jpg', 'image/jpeg');
      const url2 = await uploadService.uploadImage(buffer, 'test2.jpg', 'image/jpeg');

      await uploadService.deleteImage(url1);

      const filename1 = url1.split('/').pop();
      const filename2 = url2.split('/').pop();
      const filepath1 = resolve(testUploadsDir, filename1!);
      const filepath2 = resolve(testUploadsDir, filename2!);

      expect(existsSync(filepath1)).toBe(false);
      expect(existsSync(filepath2)).toBe(true);
    });
  });

  describe('integration: complete upload lifecycle', () => {
    it('should handle full upload-delete cycle', async () => {
      const buffer = Buffer.from('lifecycle test image data');

      // Upload
      const url = await uploadService.uploadImage(buffer, 'lifecycle.jpg', 'image/jpeg');
      expect(url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.jpg$/);

      const filename = url.split('/').pop();
      const filepath = resolve(testUploadsDir, filename!);

      // Verify file exists
      expect(existsSync(filepath)).toBe(true);

      // Delete
      await uploadService.deleteImage(url);

      // Verify file deleted
      expect(existsSync(filepath)).toBe(false);
    });

    it('should handle multiple uploads and selective deletion', async () => {
      const buffer = Buffer.from('test image data');

      // Upload multiple files
      const url1 = await uploadService.uploadImage(buffer, 'file1.jpg', 'image/jpeg');
      const url2 = await uploadService.uploadImage(buffer, 'file2.png', 'image/png');
      const url3 = await uploadService.uploadImage(buffer, 'file3.webp', 'image/webp');

      // Verify all exist
      const allFiles = readdirSync(testUploadsDir);
      expect(allFiles.length).toBe(3);

      // Delete middle file
      await uploadService.deleteImage(url2);

      // Verify selective deletion
      const filename1 = url1.split('/').pop();
      const filename2 = url2.split('/').pop();
      const filename3 = url3.split('/').pop();

      expect(existsSync(resolve(testUploadsDir, filename1!))).toBe(true);
      expect(existsSync(resolve(testUploadsDir, filename2!))).toBe(false);
      expect(existsSync(resolve(testUploadsDir, filename3!))).toBe(true);

      const remainingFiles = readdirSync(testUploadsDir);
      expect(remainingFiles.length).toBe(2);
    });
  });
});
