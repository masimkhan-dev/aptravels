
/**
 * Utility to compress images on the client side before upload to Supabase
 * to save storage space and improve performance.
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob conversion failed'));
                    },
                    'image/jpeg',
                    quality
                );
            };
        };
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Generates a SHA-256 hash of a file to prevent duplicate uploads.
 */
export async function generateFileHash(file: Blob): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
