import { ExcalidrawBinaryFileData, ExcalidrawElement, ExcalidrawFilesMap } from '../types';
import { getDb } from './database';

const MB = 1024 * 1024;

export const MAX_SINGLE_IMAGE_BYTES = 30 * MB;
export const MAX_CANVAS_BYTES = 500 * MB;
export const MAX_REQUEST_BODY_LIMIT = '500mb';

export class CanvasLimitError extends Error {
  public readonly status: number;

  constructor(message: string, status = 413) {
    super(message);
    this.name = 'CanvasLimitError';
    this.status = status;
  }
}

const formatBytesInMb = (bytes: number): string => `${Math.trunc(bytes / MB)}MB`;

const getUtf8Bytes = (value: string): number => Buffer.byteLength(value, 'utf8');

const getBinaryBytesFromDataUrl = (dataUrl?: string): number | null => {
  if (!dataUrl) {
    return null;
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }

  const base64Content = dataUrl.slice(commaIndex + 1);
  if (!base64Content) {
    return 0;
  }

  const paddingLength = base64Content.endsWith('==') ? 2 : base64Content.endsWith('=') ? 1 : 0;

  return Math.max(0, Math.floor((base64Content.length * 3) / 4) - paddingLength);
};

const getImageBytes = (file: Pick<ExcalidrawBinaryFileData, 'size' | 'dataURL'>): number => {
  if (typeof file.size === 'number' && Number.isFinite(file.size) && file.size >= 0) {
    return file.size;
  }

  const dataUrlBytes = getBinaryBytesFromDataUrl(file.dataURL);
  if (dataUrlBytes !== null) {
    return dataUrlBytes;
  }

  return getUtf8Bytes(file.dataURL ?? '');
};

const getElementBytes = (element: ExcalidrawElement): number => {
  if (element.isDeleted) {
    return 0;
  }

  return getUtf8Bytes(JSON.stringify(element));
};

const getCurrentElementBytes = async (boardId: string): Promise<number> => {
  const db = await getDb();
  const row = await db.get<{ total: number }>(
    `SELECT COALESCE(SUM(LENGTH(CAST(data AS BLOB))), 0) AS total
     FROM elements
     WHERE board_id = ? AND is_deleted = 0`,
    [boardId]
  );

  return row?.total ?? 0;
};

const getCurrentFileBytes = async (boardId: string): Promise<number> => {
  const db = await getDb();
  try {
    const sizedRow = await db.get<{ total: number }>(
      `SELECT COALESCE(SUM(CAST(json_extract(data, '$.size') AS INTEGER)), 0) AS total
       FROM files
       WHERE board_id = ? AND json_extract(data, '$.size') IS NOT NULL`,
      [boardId]
    );

    const fallbackRows = await db.all<{ data: string }[]>(
      `SELECT data
       FROM files
       WHERE board_id = ? AND json_extract(data, '$.size') IS NULL`,
      [boardId]
    );

    const fallbackTotal = fallbackRows.reduce((total, row) => {
      try {
        return total + getImageBytes(JSON.parse(row.data) as ExcalidrawBinaryFileData);
      } catch {
        return total + getUtf8Bytes(row.data);
      }
    }, 0);

    return (sizedRow?.total ?? 0) + fallbackTotal;
  } catch {
    const rows = await db.all<{ data: string }[]>('SELECT data FROM files WHERE board_id = ?', [
      boardId,
    ]);

    return rows.reduce((total, row) => {
      try {
        return total + getImageBytes(JSON.parse(row.data) as ExcalidrawBinaryFileData);
      } catch {
        return total + getUtf8Bytes(row.data);
      }
    }, 0);
  }
};

const getExistingFileIds = async (boardId: string, fileIds: string[]): Promise<Set<string>> => {
  if (fileIds.length === 0) {
    return new Set();
  }

  const db = await getDb();
  const placeholders = fileIds.map(() => '?').join(',');
  const rows = await db.all<{ id: string }[]>(
    `SELECT id
     FROM files
     WHERE board_id = ? AND id IN (${placeholders})`,
    [boardId, ...fileIds]
  );

  return new Set(rows.map(row => row.id));
};

const getStoredActiveElementBytesById = async (
  boardId: string,
  elementIds: string[]
): Promise<Map<string, number>> => {
  if (elementIds.length === 0) {
    return new Map();
  }

  const db = await getDb();
  const placeholders = elementIds.map(() => '?').join(',');
  const rows = await db.all<{ id: string; bytes: number; is_deleted: number }[]>(
    `SELECT id, LENGTH(CAST(data AS BLOB)) AS bytes, is_deleted
     FROM elements
     WHERE board_id = ? AND id IN (${placeholders})`,
    [boardId, ...elementIds]
  );

  return rows.reduce((map, row) => {
    if (!row.is_deleted) {
      map.set(row.id, row.bytes);
    }
    return map;
  }, new Map<string, number>());
};

const assertCanvasBytes = (bytes: number): void => {
  if (bytes > MAX_CANVAS_BYTES) {
    throw new CanvasLimitError(`整个画布不能超过 ${formatBytesInMb(MAX_CANVAS_BYTES)}`);
  }
};

export const assertSingleImageLimit = (files: ExcalidrawFilesMap): void => {
  for (const file of Object.values(files)) {
    if (getImageBytes(file) > MAX_SINGLE_IMAGE_BYTES) {
      throw new CanvasLimitError(`单张图片不能超过 ${formatBytesInMb(MAX_SINGLE_IMAGE_BYTES)}`);
    }
  }
};

export const assertUploadFilesWithinLimits = async (
  boardId: string,
  files: ExcalidrawFilesMap
): Promise<void> => {
  assertSingleImageLimit(files);

  const fileEntries = Object.entries(files);
  if (fileEntries.length === 0) {
    return;
  }

  const [currentElementBytes, currentFileBytes] = await Promise.all([
    getCurrentElementBytes(boardId),
    getCurrentFileBytes(boardId),
  ]);

  const incomingFileIds = fileEntries.map(([id, file]) => file.id || id);
  const existingFileIds = await getExistingFileIds(boardId, incomingFileIds);

  const additionalFileBytes = fileEntries.reduce((total, [id, file]) => {
    const fileId = file.id || id;
    if (existingFileIds.has(fileId)) {
      return total;
    }
    return total + getImageBytes(file);
  }, 0);

  assertCanvasBytes(currentElementBytes + currentFileBytes + additionalFileBytes);
};

export const assertApplyDeltaWithinLimits = async (
  boardId: string,
  upserted: ExcalidrawElement[],
  deleted: string[]
): Promise<void> => {
  const [currentElementBytes, currentFileBytes] = await Promise.all([
    getCurrentElementBytes(boardId),
    getCurrentFileBytes(boardId),
  ]);

  const affectedIds = Array.from(new Set([...upserted.map(element => element.id), ...deleted]));
  const storedBytesById = await getStoredActiveElementBytesById(boardId, affectedIds);

  const replacedBytes = affectedIds.reduce(
    (total, id) => total + (storedBytesById.get(id) ?? 0),
    0
  );
  const nextElementBytes =
    currentElementBytes -
    replacedBytes +
    upserted.reduce((total, element) => total + getElementBytes(element), 0);

  assertCanvasBytes(currentFileBytes + nextElementBytes);
};

export const assertReplaceAllWithinLimits = (
  elements: ExcalidrawElement[],
  files: ExcalidrawFilesMap
): void => {
  assertSingleImageLimit(files);

  const elementBytes = elements.reduce((total, element) => total + getElementBytes(element), 0);
  const fileBytes = Object.values(files).reduce((total, file) => total + getImageBytes(file), 0);

  assertCanvasBytes(elementBytes + fileBytes);
};
