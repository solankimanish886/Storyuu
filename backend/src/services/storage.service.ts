/**
 * Object storage service — stubbed in Phase 0.
 * Master Prompt §3 lists AWS S3 / Cloudinary as the candidates; selected via
 * STORAGE_PROVIDER env var. Real impls land when avatar / cover / audio uploads
 * are needed (Phase 3 onwards).
 */
import { logger } from '../config/logger.js';

export interface SignedUploadInput {
  userId: string;
  contentType: string;
  purpose: 'avatar' | 'cover' | 'episode-audio' | 'episode-hero';
}

export interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
  expiresAt: Date;
}

export interface StorageService {
  createSignedUpload(input: SignedUploadInput): Promise<SignedUpload>;
  delete(publicUrl: string): Promise<void>;
}

class StubStorageService implements StorageService {
  async createSignedUpload(input: SignedUploadInput): Promise<SignedUpload> {
    logger.warn({ input }, 'stub storage: createSignedUpload');
    const fakeKey = `${input.purpose}/${input.userId}/${Date.now()}`;
    return {
      uploadUrl: `https://stub.storage.local/upload/${fakeKey}`,
      publicUrl: `https://stub.storage.local/${fakeKey}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }
  async delete(publicUrl: string) {
    logger.warn({ publicUrl }, 'stub storage: delete');
  }
}

export const storageService: StorageService = new StubStorageService();
