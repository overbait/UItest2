// src/services/imageDb.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'Aoe4LayoutImages';
const STORE_NAME = 'backgroundImages';
const DB_VERSION = 1;

// Определяем схему базы данных
interface Aoe4ImageDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // Ключ для доступа к файлу (например, `bg-${Date.now()}-random`)
    value: File; // Сам объект File
  };
}

// Переменная для хранения промиса базы данных, чтобы избежать многократной инициализации
let dbPromise: Promise<IDBPDatabase<Aoe4ImageDB>> | null = null;

const initDb = (): Promise<IDBPDatabase<Aoe4ImageDB>> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<Aoe4ImageDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`[ImageDB] Upgrading DB from version ${oldVersion} to ${newVersion}`);
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // Ключи будут предоставляться явно, не autoIncrement
        console.log(`[ImageDB] Object store "${STORE_NAME}" created.`);
      }
    },
  });
  return dbPromise;
};

/**
 * Сохраняет файл изображения в IndexedDB.
 * @param file Объект File для сохранения.
 * @returns Промис, который разрешается уникальным ключом сохраненного файла.
 */
export const saveImageToDb = async (file: File): Promise<string> => {
  const db = await initDb();
  // Генерируем простой, но достаточно уникальный ключ
  const key = `bg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    await db.put(STORE_NAME, file, key);
    console.log(`[ImageDB] Saved image with key: ${key}, name: ${file.name}, size: ${file.size}`);
    return key;
  } catch (error) {
    console.error(`[ImageDB] Error saving image with key ${key}:`, error);
    throw error; // Перебрасываем ошибку для обработки выше
  }
};

/**
 * Получает файл изображения из IndexedDB по ключу.
 * @param key Ключ файла для получения.
 * @returns Промис, который разрешается объектом File или undefined, если файл не найден.
 */
export const getImageFromDb = async (key: string): Promise<File | undefined> => {
  if (!key || typeof key !== 'string' || !key.startsWith('bg-')) {
    console.warn(`[ImageDB] getImageFromDb: Invalid or non-standard key provided: "${key}". Skipping DB lookup.`);
    return undefined;
  }
  const db = await initDb();
  try {
    const file = await db.get(STORE_NAME, key);
    if (file) {
      console.log(`[ImageDB] Retrieved image with key: ${key}, name: ${file.name}, size: ${file.size}`);
    } else {
      console.log(`[ImageDB] Image not found for key: ${key}`);
    }
    return file;
  } catch (error) {
    console.error(`[ImageDB] Error retrieving image with key ${key}:`, error);
    throw error;
  }
};

/**
 * Удаляет файл изображения из IndexedDB по ключу.
 * @param key Ключ файла для удаления.
 * @returns Промис, который разрешается, когда операция завершена.
 */
export const deleteImageFromDb = async (key: string): Promise<void> => {
  if (!key || typeof key !== 'string' || !key.startsWith('bg-')) {
    console.warn(`[ImageDB] deleteImageFromDb: Invalid or non-standard key provided: "${key}". Skipping DB operation.`);
    return;
  }
  const db = await initDb();
  try {
    await db.delete(STORE_NAME, key);
    console.log(`[ImageDB] Deleted image with key: ${key}`);
  } catch (error) {
    console.error(`[ImageDB] Error deleting image with key ${key}:`, error);
    throw error;
  }
};

// Вызовем initDb() один раз при загрузке модуля, чтобы база данных была готова как можно раньше.
// Это не обязательно, но может немного ускорить первую операцию.
initDb().then(() => {
  console.log('[ImageDB] Database initialized on module load.');
}).catch(error => {
  console.error('[ImageDB] Failed to initialize database on module load:', error);
});
