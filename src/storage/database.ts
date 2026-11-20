export const DATABASE_NAME = import.meta.env.DEV ? "sistemaestudos-local-sandbox" : "sistemaestudos-local";
export const DATABASE_VERSION = 3;

export const STORE_NAMES = [
  "disciplines",
  "subjects",
  "subjectDependencies",
  "studyPlans",
  "studyPlanItems",
  "notebooks",
  "notebookSubjects",
  "sessions",
  "studyBlocks",
  "sessionSegments",
  "flashcardConcepts",
  "flashcards",
  "flashcardReviews",
  "essays",
  "reviewQueue",
  "settings",
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

export type BaseRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type SettingRecord<T = unknown> = {
  key: string;
  value: T;
  updatedAt: string;
};

type StoreRecord = BaseRecord | SettingRecord;
type StoreRecordMap = { [K in StoreName]: K extends "settings" ? SettingRecord : BaseRecord };

let databasePromise: Promise<IDBDatabase> | undefined;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao acessar o armazenamento local."));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador não oferece suporte ao armazenamento local necessário."));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of STORE_NAMES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: name === "settings" ? "key" : "id" });
          }
        }

        const subjects = request.transaction?.objectStore("subjects");
        if (subjects && !subjects.indexNames.contains("disciplineId")) {
          subjects.createIndex("disciplineId", "disciplineId", { unique: false });
        }
        const sessions = request.transaction?.objectStore("sessions");
        if (sessions && !sessions.indexNames.contains("startedAt")) {
          sessions.createIndex("startedAt", "startedAt", { unique: false });
        }
        const segments = request.transaction?.objectStore("sessionSegments");
        if (segments && !segments.indexNames.contains("sessionId")) {
          segments.createIndex("sessionId", "sessionId", { unique: false });
        }
        if (segments && !segments.indexNames.contains("subjectId")) {
          segments.createIndex("subjectId", "subjectId", { unique: false });
        }
        const blocks = request.transaction?.objectStore("studyBlocks");
        if (blocks && !blocks.indexNames.contains("disciplineId")) {
          blocks.createIndex("disciplineId", "disciplineId", { unique: false });
        }
        if (blocks && !blocks.indexNames.contains("notebookId")) {
          blocks.createIndex("notebookId", "notebookId", { unique: false });
        }
        if (blocks && !blocks.indexNames.contains("status")) {
          blocks.createIndex("status", "status", { unique: false });
        }
        const cards = request.transaction?.objectStore("flashcards");
        if (cards && !cards.indexNames.contains("nextReviewAt")) {
          cards.createIndex("nextReviewAt", "nextReviewAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        databasePromise = undefined;
        reject(request.error ?? new Error("Não foi possível abrir o banco local."));
      };
      request.onblocked = () => {
        databasePromise = undefined;
        reject(new Error("O banco está em uso por outra aba. Feche as outras abas do EstudosFlix e tente novamente."));
      };
    });
  }

  return databasePromise;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("A operação local foi cancelada."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Falha na transação do armazenamento local."));
  });
}

export async function withStoreTransaction<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, mode);
  const completed = transactionDone(transaction);

  try {
    const result = await operation(transaction.objectStore(storeName));
    await completed;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // A transação pode já ter sido encerrada pelo navegador.
    }
    await completed.catch(() => undefined);
    throw error;
  }
}

export async function getRecord<K extends StoreName>(
  storeName: K,
  key: K extends "settings" ? string : string,
): Promise<StoreRecordMap[K] | undefined> {
  return withStoreTransaction(storeName, "readonly", store => requestResult(store.get(key))) as Promise<StoreRecordMap[K] | undefined>;
}

export async function getAllRecords<K extends StoreName>(storeName: K): Promise<StoreRecordMap[K][]> {
  return withStoreTransaction(storeName, "readonly", store => requestResult(store.getAll())) as Promise<StoreRecordMap[K][]>;
}

export async function putRecord<K extends StoreName>(storeName: K, record: StoreRecordMap[K]): Promise<void> {
  await withStoreTransaction(storeName, "readwrite", async store => {
    await requestResult(store.put(record));
  });
}

export async function deleteRecord(storeName: StoreName, key: string): Promise<void> {
  await withStoreTransaction(storeName, "readwrite", async store => {
    await requestResult(store.delete(key));
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  await withStoreTransaction(storeName, "readwrite", async store => {
    await requestResult(store.clear());
  });
}

export function createRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `record-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createTimestamps() {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
}

export type DatabaseImportData = Partial<Record<StoreName, Array<BaseRecord | SettingRecord>>>;

/** Grava um backup inteiro em uma única transação; em caso de falha, nada é confirmado. */
export async function importRecordsAtomically(data: DatabaseImportData): Promise<void> {
  const names = Object.keys(data).filter(name => STORE_NAMES.includes(name as StoreName)) as StoreName[];
  if (names.length === 0) return;
  const db = await openDatabase();
  const transaction = db.transaction(names, "readwrite");
  const completed = transactionDone(transaction);
  try {
    for (const name of names) {
      const records = data[name] ?? [];
      const store = transaction.objectStore(name);
      for (const record of records) store.put(record);
    }
    await completed;
  } catch (error) {
    try { transaction.abort(); } catch { /* transação já encerrada */ }
    await completed.catch(() => undefined);
    throw error;
  }
}

export async function closeDatabaseForTests(): Promise<void> {
  if (!databasePromise) return;
  const db = await databasePromise.catch(() => undefined);
  db?.close();
  databasePromise = undefined;
}

/** Apaga os bancos locais de produção e de desenvolvimento após confirmação explícita na interface. */
export async function clearAllLocalDatabases(): Promise<void> {
  const open = await databasePromise?.catch(() => undefined);
  open?.close();
  databasePromise = undefined;

  const names = [...new Set([DATABASE_NAME, "sistemaestudos-local", "sistemaestudos-local-sandbox"])];
  await Promise.all(names.map(name => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Não foi possível apagar os dados locais."));
    request.onblocked = () => reject(new Error("Feche outras abas do EstudosFlix e tente apagar os dados novamente."));
  })));
}
