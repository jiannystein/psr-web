const SESSION_DB_NAME = "psrweb-sessions";
const SESSIONS_STORE = "sessions";
const STEPS_STORE = "steps";
const BLOBS_STORE = "blobs";
export class QuotaExceededStorageError extends Error {
    constructor(message) {
        super(message);
        this.name = "QuotaExceededStorageError";
    }
}
function getDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SESSION_DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
                db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(STEPS_STORE)) {
                db.createObjectStore(STEPS_STORE, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(BLOBS_STORE)) {
                db.createObjectStore(BLOBS_STORE, { keyPath: "key" });
            }
        };
    });
}
export async function upsertSession(session) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], "readwrite");
        const store = transaction.objectStore(SESSIONS_STORE);
        const request = store.put(session);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}
export async function storeStep(params) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STEPS_STORE, BLOBS_STORE], "readwrite");
        const stepsStore = transaction.objectStore(STEPS_STORE);
        const blobsStore = transaction.objectStore(BLOBS_STORE);
        const stepReq = stepsStore.put(params.step);
        const blobReq = blobsStore.put({ key: params.step.image.blobKey, blob: params.blob });
        stepReq.onerror = () => reject(stepReq.error);
        blobReq.onerror = () => reject(blobReq.error);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
export async function updateStepDescription(stepId, description, editedAt) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STEPS_STORE], "readwrite");
        const store = transaction.objectStore(STEPS_STORE);
        const getReq = store.get(stepId);
        getReq.onsuccess = () => {
            const step = getReq.result;
            if (step) {
                step.annotation.description = description;
                step.annotation.editedAt = editedAt;
                const updateReq = store.put(step);
                updateReq.onsuccess = () => resolve();
                updateReq.onerror = () => reject(updateReq.error);
            }
            else {
                resolve();
            }
        };
        getReq.onerror = () => reject(getReq.error);
    });
}
export async function deleteStepAndReindex(sessionId, stepId) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STEPS_STORE, BLOBS_STORE], "readwrite");
        const stepsStore = transaction.objectStore(STEPS_STORE);
        const deleteReq = stepsStore.delete(stepId);
        deleteReq.onerror = () => reject(deleteReq.error);
        // Removed unused _blobsStore variable
        transaction.oncomplete = async () => {
            const allSteps = await new Promise((res, rej) => {
                const getAllReq = stepsStore.getAll();
                getAllReq.onsuccess = () => res(getAllReq.result);
                getAllReq.onerror = () => rej(getAllReq.error);
            });
            const filtered = allSteps.filter((s) => s.sessionId === sessionId);
            resolve({ steps: filtered, storageBytes: filtered.length * 500000 });
        };
        transaction.onerror = () => reject(transaction.error);
    });
}
export async function getBlob(key) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([BLOBS_STORE], "readonly");
        const store = transaction.objectStore(BLOBS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.blob ?? null);
        request.onerror = () => reject(request.error);
    });
}
