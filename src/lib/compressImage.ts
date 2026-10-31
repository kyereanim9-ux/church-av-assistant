/**
 * Compression des photos côté téléphone avant l'envoi (navigateur uniquement).
 * Une photo de smartphone fait souvent 3 à 8 Mo ; on la redimensionne à 1600 px max
 * et on la ré-encode en JPEG (~300 Ko). Résultat : envoi rapide même en 4G faible, et on
 * reste sous la limite de taille des requêtes de Vercel (4,5 Mo).
 * Si le navigateur ne sait pas décoder l'image (ex : HEIC sur Android), on envoie l'original.
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
