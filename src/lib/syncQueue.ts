import {
  deleteIngredient,
  deleteRecipe,
  isAccessDeniedError,
  safeRecipeImageUrl,
  saveIngredient,
  saveRecipe,
  uploadRecipeImage
} from "./appsScriptApi";
import type {
  AppData,
  SaveIngredientInput,
  SaveRecipeInput,
  UploadImageInput
} from "./appsScriptApi";
import type { Recipe } from "../types/app";

const DB_NAME = "drink-cost-studio-sync";
const DB_VERSION = 1;
const MUTATION_STORE = "mutations";

export type SyncState = {
  pendingCount: number;
  syncing: boolean;
  lastError: string;
  lastSyncedAt: number | null;
};

type SaveRecipeWithImagePayload = {
  recipe: SaveRecipeInput;
  image: UploadImageInput;
  uploaded?: { image_url: string; file_id: string };
};

export type SyncMutation = {
  id: string;
  action: "saveIngredient" | "saveRecipe" | "saveRecipeWithImage" | "deleteIngredient" | "deleteRecipe";
  entityId: string;
  payload: SaveIngredientInput | SaveRecipeInput | SaveRecipeWithImagePayload | { id: string };
  createdAt: number;
  attempts: number;
  status: "pending" | "syncing" | "failed";
  lastError: string;
};

export type NewSyncMutation = Pick<SyncMutation, "action" | "entityId" | "payload">;
export type FlushResult = { completed: number; pending: number; error: string; unauthorized: boolean };

let databasePromise: Promise<IDBDatabase> | null = null;
let activeFlush: Promise<FlushResult> | null = null;
let currentState: SyncState = { pendingCount: 0, syncing: false, lastError: "", lastSyncedAt: null };
const listeners = new Set<(state: SyncState) => void>();

export function subscribeSyncState(listener: (state: SyncState) => void) {
  listeners.add(listener);
  void publishState();
  return () => listeners.delete(listener);
}

export function getSyncState() {
  return currentState;
}

export async function enqueueMutation(input: NewSyncMutation) {
  const mutation: SyncMutation = {
    ...input,
    id: createMutationId(),
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
    lastError: ""
  };
  await putMutation(mutation);
  currentState = { ...currentState, lastError: "" };
  await publishState();
  return mutation;
}

export async function getPendingMutationCount() {
  return (await listMutations()).length;
}

export function flushSyncQueue(): Promise<FlushResult> {
  if (activeFlush) return activeFlush;
  activeFlush = runFlush().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

export async function applyQueuedMutations(data: AppData): Promise<AppData> {
  const queued = await listMutations();
  let ingredients = data.ingredients.map((ingredient) => ({ ...ingredient }));
  let recipes = data.recipes.map((recipe) => ({ ...recipe, items: recipe.items.map((item) => ({ ...item })) }));

  queued.forEach((mutation) => {
    if (mutation.action === "saveIngredient") {
      const ingredient = mutation.payload as SaveIngredientInput;
      const costPerUnit = ingredient.costPerUnit ?? (ingredient.buyQty > 0 ? ingredient.buyPrice / ingredient.buyQty : 0);
      const nextIngredient = { ...ingredient, costPerUnit };
      ingredients = ingredients.some((item) => item.id === ingredient.id)
        ? ingredients.map((item) => (item.id === ingredient.id ? nextIngredient : item))
        : [nextIngredient, ...ingredients];
      return;
    }

    if (mutation.action === "deleteIngredient") {
      ingredients = ingredients.filter((ingredient) => ingredient.id !== mutation.entityId);
      recipes = recipes.map((recipe) => ({
        ...recipe,
        items: recipe.items.filter((item) => item.ingredientId !== mutation.entityId)
      }));
      return;
    }

    if (mutation.action === "saveRecipe" || mutation.action === "saveRecipeWithImage") {
      const payload = mutation.payload as SaveRecipeInput | SaveRecipeWithImagePayload;
      const recipe = mutation.action === "saveRecipeWithImage" ? (payload as SaveRecipeWithImagePayload).recipe : (payload as SaveRecipeInput);
      const imagePayload = mutation.action === "saveRecipeWithImage" ? (payload as SaveRecipeWithImagePayload) : null;
      const imageUrl = imagePayload?.uploaded?.image_url || (imagePayload ? imageDataUrl(imagePayload.image) : safeRecipeImageUrl(recipe.imageUrl));
      const existing = recipes.find((item) => item.id === mutation.entityId);
      const nextRecipe: Recipe = {
        id: recipe.id || mutation.entityId,
        name: recipe.name,
        categoryId: recipe.categoryId,
        imageKey: existing?.imageKey || "thai",
        imageUrl,
        status: recipe.status,
        prepTime: recipe.prepTime,
        sweetness: recipe.sweetness,
        sizeOz: recipe.sizeOz,
        sellingPrice: recipe.sellingPrice,
        favorite: recipe.favorite || false,
        rating: recipe.rating || 0,
        items: recipe.items || [],
        steps: recipe.steps || []
      };
      recipes = recipes.some((item) => item.id === recipe.id)
        ? recipes.map((item) => (item.id === recipe.id ? { ...item, ...nextRecipe } : item))
        : [nextRecipe, ...recipes];
      return;
    }

    if (mutation.action === "deleteRecipe") {
      recipes = recipes.filter((recipe) => recipe.id !== mutation.entityId);
    }
  });

  return { ...data, ingredients, recipes };
}

async function runFlush(): Promise<FlushResult> {
  currentState = { ...currentState, syncing: true, lastError: "" };
  await publishState();
  let completed = 0;
  let errorMessage = "";
  let unauthorized = false;
  const mutations = await listMutations();

  for (const mutation of mutations) {
    try {
      mutation.status = "syncing";
      mutation.attempts += 1;
      mutation.lastError = "";
      await putMutation(mutation);
      await executeMutation(mutation);
      await deleteStoredMutation(mutation.id);
      completed += 1;
    } catch (error) {
      unauthorized = isAccessDeniedError(error);
      errorMessage = error instanceof Error ? error.message : "ซิงก์ข้อมูลไม่สำเร็จ";
      mutation.status = "failed";
      mutation.lastError = errorMessage;
      await putMutation(mutation);
      break;
    }
  }

  const pending = await getPendingMutationCount();
  currentState = {
    pendingCount: pending,
    syncing: false,
    lastError: errorMessage,
    lastSyncedAt: pending === 0 && completed > 0 ? Date.now() : currentState.lastSyncedAt
  };
  await publishState();
  return { completed, pending, error: errorMessage, unauthorized };
}

async function executeMutation(mutation: SyncMutation) {
  if (mutation.action === "saveIngredient") {
    await saveIngredient(mutation.payload as SaveIngredientInput);
    return;
  }
  if (mutation.action === "saveRecipe") {
    const payload = sanitizeSaveRecipePayload(mutation.payload as SaveRecipeInput);
    mutation.payload = payload;
    await putMutation(mutation);
    await saveRecipe(payload);
    return;
  }
  if (mutation.action === "deleteIngredient") {
    await deleteIngredient(mutation.entityId);
    return;
  }
  if (mutation.action === "deleteRecipe") {
    await deleteRecipe(mutation.entityId);
    return;
  }

  const payload = mutation.payload as SaveRecipeWithImagePayload;
  if (!payload.uploaded) {
    payload.uploaded = await uploadRecipeImage({ ...payload.image, mutationId: mutation.id });
    mutation.payload = payload;
    await putMutation(mutation);
  }
  await saveRecipe({
    ...payload.recipe,
    imageUrl: payload.uploaded.image_url,
    imageFileId: payload.uploaded.file_id
  });
}

function sanitizeSaveRecipePayload(payload: SaveRecipeInput): SaveRecipeInput {
  return {
    ...payload,
    imageUrl: safeRecipeImageUrl(payload.imageUrl)
  };
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MUTATION_STORE)) {
          database.createObjectStore(MUTATION_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("เปิดฐานข้อมูลคิวซิงก์ไม่สำเร็จ"));
    });
  }
  return databasePromise;
}

async function listMutations(): Promise<SyncMutation[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MUTATION_STORE, "readonly");
    const request = transaction.objectStore(MUTATION_STORE).getAll();
    request.onsuccess = () => resolve((request.result as SyncMutation[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error || new Error("อ่านคิวซิงก์ไม่สำเร็จ"));
  });
}

async function putMutation(mutation: SyncMutation) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MUTATION_STORE, "readwrite");
    transaction.objectStore(MUTATION_STORE).put(mutation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("บันทึกคิวซิงก์ไม่สำเร็จ"));
    transaction.onabort = () => reject(transaction.error || new Error("บันทึกคิวซิงก์ถูกยกเลิก"));
  });
}

async function deleteStoredMutation(id: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MUTATION_STORE, "readwrite");
    transaction.objectStore(MUTATION_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("ลบคิวที่ซิงก์แล้วไม่สำเร็จ"));
    transaction.onabort = () => reject(transaction.error || new Error("ลบคิวที่ซิงก์แล้วถูกยกเลิก"));
  });
}

async function publishState() {
  const pendingCount = await getPendingMutationCount().catch(() => currentState.pendingCount);
  currentState = { ...currentState, pendingCount };
  listeners.forEach((listener) => listener(currentState));
}

function createMutationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `mutation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function imageDataUrl(image: UploadImageInput) {
  return `data:${image.mimeType};base64,${image.base64}`;
}
