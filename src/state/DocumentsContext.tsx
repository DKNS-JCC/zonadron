import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  expiringDocuments,
  normaliseDocument,
  sortDocuments,
  titleFromFileName,
  type DocCategory,
  type StoredDocument,
} from '../logic/documents';
import { deleteStored, pickAndStore } from '../documents/files';

const KEY = 'zonadron.documentos.v1';

/**
 * La carpeta de documentos.
 *
 * Guarda la *ficha* de cada papel (qué es, de qué dron, cuándo caduca) y
 * mantiene esa lista a la par con los archivos que hay en disco, que los mueve
 * `src/documents/files.ts`. Borrar aquí borra también el archivo: una app que
 * dice tenerlo todo en local no puede dejar basura invisible ocupando sitio.
 *
 * Los papeles del piloto (carnet, registro de operador) llevan `droneId: null`.
 * Los del aparato —declaración de conformidad, seguro, factura— llevan el id
 * de su dron, que es lo que permite tener varios drones sin mezclar sus
 * seguros.
 */

interface DocumentsContextValue {
  documents: StoredDocument[];
  ready: boolean;
  /** Los de un dueño concreto, ya ordenados: null = los tuyos. */
  forOwner: (droneId: string | null) => StoredDocument[];
  /** Abre el selector del sistema y guarda lo que se elija. Devuelve cuántos. */
  addFromPicker: (droneId: string | null, category: DocCategory) => Promise<number>;
  updateDocument: (id: string, patch: Partial<StoredDocument>) => void;
  removeDocument: (id: string) => void;
  /** Se lleva por delante los papeles de un dron que ya no está. */
  removeForDrone: (droneId: string) => void;
  /** Caducados o a punto de caducar, lo primero arriba. */
  expiring: StoredDocument[];
}

const Ctx = createContext<DocumentsContextValue>({
  documents: [],
  ready: false,
  forOwner: () => [],
  addFromPicker: async () => 0,
  updateDocument: () => {},
  removeDocument: () => {},
  removeForDrone: () => {},
  expiring: [],
});

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setDocuments(
              parsed
                .map(normaliseDocument)
                .filter((d: StoredDocument | null): d is StoredDocument => d !== null),
            );
          }
        } catch {
          /* índice corrupto: los archivos siguen en disco, la lista se rehace */
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: StoredDocument[]) => {
    setDocuments(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addFromPicker = useCallback(
    async (droneId: string | null, category: DocCategory) => {
      const picked = await pickAndStore();
      if (picked.length === 0) return 0;
      const now = new Date().toISOString();
      const created: StoredDocument[] = picked.map((f) => ({
        id: f.id,
        title: titleFromFileName(f.fileName),
        category,
        droneId,
        fileName: f.fileName,
        storedName: f.storedName,
        mimeType: f.mimeType,
        size: f.size,
        addedAt: now,
        expiresAt: null,
        notes: '',
      }));
      // Se lee del estado dentro del setter: entre elegir el archivo y
      // copiarlo puede haber pasado un rato y haber cambiado la lista.
      setDocuments((prev) => {
        const next = [...created, ...prev];
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return created.length;
    },
    [],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<StoredDocument>) => {
      persist(documents.map((d) => (d.id === id ? { ...d, ...patch, id: d.id } : d)));
    },
    [documents, persist],
  );

  const removeDocument = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (doc) deleteStored(doc.storedName);
      persist(documents.filter((d) => d.id !== id));
    },
    [documents, persist],
  );

  const removeForDrone = useCallback(
    (droneId: string) => {
      const keep: StoredDocument[] = [];
      for (const doc of documents) {
        if (doc.droneId === droneId) deleteStored(doc.storedName);
        else keep.push(doc);
      }
      persist(keep);
    },
    [documents, persist],
  );

  const value = useMemo<DocumentsContextValue>(
    () => ({
      documents,
      ready,
      forOwner: (droneId) => sortDocuments(documents.filter((d) => d.droneId === droneId)),
      addFromPicker,
      updateDocument,
      removeDocument,
      removeForDrone,
      expiring: expiringDocuments(documents),
    }),
    [documents, ready, addFromPicker, updateDocument, removeDocument, removeForDrone],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocuments() {
  return useContext(Ctx);
}
