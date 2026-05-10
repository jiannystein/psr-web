export function computeSampleHash(ctx, width, height) {
    const sampleSize = 16;
    const sampleWidth = Math.max(1, Math.floor(width / sampleSize));
    const sampleHeight = Math.max(1, Math.floor(height / sampleSize));
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let hash = 0;
    for (let i = 0; i < sampleSize; i++) {
        for (let j = 0; j < sampleSize; j++) {
            const pixelIndex = (i * sampleHeight * width + j * sampleWidth) * 4;
            const r = data[pixelIndex] || 0;
            const g = data[pixelIndex + 1] || 0;
            const b = data[pixelIndex + 2] || 0;
            const avg = (r + g + b) / 3;
            hash = hash * 31 + Math.round(avg);
        }
    }
    return Math.abs(hash).toString(36);
}
export function compareHashes(hash, prevHash) {
    if (!prevHash) {
        return { duplicate: false, similarity: 0 };
    }
    if (hash === prevHash) {
        return { duplicate: true, similarity: 1 };
    }
    return { duplicate: false, similarity: 0.7 };
}
