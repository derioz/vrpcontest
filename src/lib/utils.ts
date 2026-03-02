import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function pixelateImage(dataUrl: string, pixelSize: number = 80): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Failed to get 2d context');

      // Draw small image to a temporary canvas (downscale)
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = Math.max(1, canvas.width / pixelSize);
      smallCanvas.height = Math.max(1, canvas.height / pixelSize);
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return reject('Failed to get 2d context');

      // Draw image downscaled
      smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);

      // Disable smoothing and fill black to prevent transparency issues
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Draw small image back up to full size canvas
      ctx.drawImage(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height, 0, 0, canvas.width, canvas.height);

      // Add a lock/blur overlay if desired, but pixelation should be enough
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
