/**
 * Utility to reliably download images across browsers, handling CORS, blob conversion,
 * canvas conversion, and direct anchor fallbacks.
 */

export async function downloadPhoto(imageUrl: string, filename: string): Promise<boolean> {
  if (!imageUrl) return false;

  // 1. Data URLs & Blob URLs
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch (e) {
      console.error('Data URL download error:', e);
    }
  }

  // 2. Standard Fetch -> Blob
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return true;
    }
  } catch (err) {
    console.warn('CORS/fetch blob download blocked, trying canvas fallback...', err);
  }

  // 3. Canvas Drawing Fallback (works if CORS is supported by image element)
  const canvasSuccess = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(false);
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          resolve(true);
        }, 'image/png');
      } catch (e) {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });

  if (canvasSuccess) return true;

  // 4. Direct Anchor Fallback / Open in new window if download attribute is restricted
  try {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.target = '_blank';
    link.download = filename;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (err) {
    console.error('All download fallbacks failed:', err);
    window.open(imageUrl, '_blank');
    return false;
  }
}
