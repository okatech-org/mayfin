/**
 * Image compression utility for reducing file sizes before upload
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.8,
    maxSizeMB: 2,
};

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

/**
 * Compress an image file
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Skip if not an image or already small enough
    if (!isImageFile(file)) {
        return file;
    }

    const maxSizeBytes = (opts.maxSizeMB || 2) * 1024 * 1024;
    if (file.size <= maxSizeBytes) {
        console.log(`[Compression] ${file.name} already small enough (${(file.size / 1024).toFixed(1)} Ko)`);
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        img.onload = () => {
            URL.revokeObjectURL(img.src);

            // Calculate new dimensions
            let { width, height } = img;
            const maxW = opts.maxWidth || 2048;
            const maxH = opts.maxHeight || 2048;

            if (width > maxW || height > maxH) {
                const ratio = Math.min(maxW / width, maxH / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Compression failed'));
                        return;
                    }

                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
                    console.log(
                        `[Compression] ${file.name}: ${(file.size / 1024).toFixed(1)} Ko → ${(compressedFile.size / 1024).toFixed(1)} Ko (-${reduction}%)`
                    );

                    resolve(compressedFile);
                },
                'image/jpeg',
                opts.quality || 0.8
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            // Return original file if compression fails
            console.warn(`[Compression] Failed to load ${file.name}, using original`);
            resolve(file);
        };

        img.src = URL.createObjectURL(file);
    });
}

/**
 * Compress multiple files (only images)
 */
export async function compressFiles(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (current: number, total: number, fileName: string) => void
): Promise<File[]> {
    const result: File[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(i + 1, files.length, file.name);

        if (isImageFile(file)) {
            const compressed = await compressImage(file, options);
            result.push(compressed);
        } else {
            result.push(file);
        }
    }

    return result;
}
