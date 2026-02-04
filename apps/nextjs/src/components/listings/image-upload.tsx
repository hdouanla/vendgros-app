"use client";

import { useState, useRef } from "react";
import { getStorageUrl } from "~/lib/storage";

interface ImageUploadTranslations {
  photosCount: string;
  coverPhoto: string;
  uploading: string;
  addPhotos: string;
  imageUploadHelp: string;
  maxPhotosAllowed: string;
  invalidFileType: (type: string) => string;
  fileTooLarge: (name: string) => string;
  uploadFailed: string;
}

interface ImageUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  translations: ImageUploadTranslations;
}

// Compress image to target size (2MB by default)
async function compressImage(
  file: File,
  maxSizeMB: number = 2,
  maxWidthOrHeight: number = 2048
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if image is too large
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to achieve target size
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              // If still too large and quality can be reduced further, try again
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                tryCompress(quality - 0.1);
                return;
              }

              // Convert blob to file
              const compressedFile = new File([blob], file.name, {
                type: file.type === "image/png" ? "image/jpeg" : file.type,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            file.type === "image/png" ? "image/jpeg" : file.type,
            quality
          );
        };

        // Start with 0.9 quality
        tryCompress(0.9);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

export function ImageUpload({ photos, onChange, maxPhotos = 10, translations }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed max
    if (photos.length + files.length > maxPhotos) {
      setError(translations.maxPhotosAllowed);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          throw new Error(translations.invalidFileType(file.type));
        }

        // Compress image if needed (target 2MB max)
        let processedFile = file;
        if (file.size > 2 * 1024 * 1024) {
          console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          processedFile = await compressImage(file, 2);
          console.log(`Compressed to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }

        // Final validation - should not happen after compression
        if (processedFile.size > 5 * 1024 * 1024) {
          throw new Error(translations.fileTooLarge(file.name));
        }

        // Upload file via API route (server-side upload)
        const formData = new FormData();
        formData.append("file", processedFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || `Upload failed for ${file.name}`);
        }

        const { path } = await uploadResponse.json();
        return path;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...photos, ...uploadedUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : translations.uploadFailed);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPhotos = [...photos];
    const draggedPhoto = newPhotos[draggedIndex];

    if (!draggedPhoto) return;

    // Remove from old position
    newPhotos.splice(draggedIndex, 1);
    // Insert at new position
    newPhotos.splice(dropIndex, 0, draggedPhoto);

    onChange(newPhotos);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          {translations.photosCount}
        </label>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square cursor-move transition-all ${
                  draggedIndex === index ? "opacity-50 scale-95" : ""
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? "ring-2 ring-green-500 ring-offset-2"
                    : ""
                }`}
              >
                <img
                  src={getStorageUrl(photo)}
                  alt={`Photo ${index + 1}`}
                  className="h-full w-full rounded-lg object-cover pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {/* Drag handle indicator */}
                <div className="absolute left-2 top-2 rounded bg-gray-900/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 rounded bg-green-600 px-2 py-1 text-xs text-white">
                    {translations.coverPhoto}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {photos.length < maxPhotos && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-8 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg
                    className="mr-2 h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {translations.uploading}...
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {translations.addPhotos}
                </>
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {/* Help Text */}
        <p className="mt-2 text-xs text-gray-500">
          {translations.imageUploadHelp}
        </p>
      </div>
    </div>
  );
}
