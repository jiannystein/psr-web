export async function getStorageEstimate(): Promise<{ usageRatio: number }> {
  if (!navigator.storage?.estimate) {
    return { usageRatio: 0 };
  }

  const estimate = await navigator.storage.estimate();
    const usageRatio = estimate.quota && typeof estimate.usage === "number" ? estimate.usage / estimate.quota : 0;
  return { usageRatio };
}
