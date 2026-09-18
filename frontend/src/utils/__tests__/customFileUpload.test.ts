import { describe, it, expect } from 'vitest';
import {
  detectCustomFileType,
  validateProductCustomFile,
  MAX_CUSTOM_FILE_SIZE,
} from '../uploadFile';

describe('Custom File Upload Validation', () => {
  describe('detectCustomFileType', () => {
    it('identifies image files correctly (JPG, JPEG, PNG, WEBP)', () => {
      expect(detectCustomFileType(new File([], 'photo.jpg'))).toBe('image');
      expect(detectCustomFileType(new File([], 'photo.jpeg'))).toBe('image');
      expect(detectCustomFileType(new File([], 'photo.png'))).toBe('image');
      expect(detectCustomFileType(new File([], 'photo.webp'))).toBe('image');
      expect(detectCustomFileType(new File([], 'PHOTO.JPG'))).toBe('image');
      expect(detectCustomFileType(new File([], 'graphic.PNG'))).toBe('image');
      expect(detectCustomFileType(new File([], 'banner.WebP'))).toBe('image');
    });

    it('identifies CAD files correctly (STL, OBJ, 3MF)', () => {
      expect(detectCustomFileType(new File([], 'bracket.stl'))).toBe('cad');
      expect(detectCustomFileType(new File([], 'model.obj'))).toBe('cad');
      expect(detectCustomFileType(new File([], 'assembly.3mf'))).toBe('cad');
      expect(detectCustomFileType(new File([], 'PART.STL'))).toBe('cad');
      expect(detectCustomFileType(new File([], 'FIGURE.OBJ'))).toBe('cad');
      expect(detectCustomFileType(new File([], 'MULTI.3MF'))).toBe('cad');
    });

    it('returns null for unsupported file formats', () => {
      expect(detectCustomFileType(new File([], 'document.pdf'))).toBeNull();
      expect(detectCustomFileType(new File([], 'archive.zip'))).toBeNull();
      expect(detectCustomFileType(new File([], 'animation.gif'))).toBeNull();
      expect(detectCustomFileType(new File([], 'script.js'))).toBeNull();
      expect(detectCustomFileType(new File([], 'malware.exe'))).toBeNull();
      expect(detectCustomFileType(new File([], 'notes.txt'))).toBeNull();
      expect(detectCustomFileType(new File([], 'blender.blend'))).toBeNull();
      expect(detectCustomFileType(new File([], 'noextension'))).toBeNull();
    });
  });

  describe('validateProductCustomFile', () => {
    it('accepts valid image within 5 MB', () => {
      const file = new File(['mock content'], 'sample.jpg', { type: 'image/jpeg' });
      const result = validateProductCustomFile(file);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('image');
      expect(result.error).toBeUndefined();
    });

    it('accepts valid CAD file within 5 MB', () => {
      const file = new File(['solid model'], 'sample.stl', { type: 'application/octet-stream' });
      const result = validateProductCustomFile(file);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('cad');
      expect(result.error).toBeUndefined();
    });

    it('rejects files larger than 5 MB', () => {
      const oversizeFile = new File([''], 'huge_photo.jpg');
      Object.defineProperty(oversizeFile, 'size', { value: MAX_CUSTOM_FILE_SIZE + 1 });

      const result = validateProductCustomFile(oversizeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/File is too large/i);
    });

    it('rejects unsupported extensions with clear message', () => {
      const pdfFile = new File(['pdf data'], 'manual.pdf');
      const result = validateProductCustomFile(pdfFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unsupported file type/i);
      expect(result.error).toMatch(/JPG, PNG, WEBP/i);
      expect(result.error).toMatch(/STL, OBJ, 3MF/i);
    });

    it('handles null/undefined file gracefully', () => {
      const result = validateProductCustomFile(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/No file selected/i);
    });
  });
});
