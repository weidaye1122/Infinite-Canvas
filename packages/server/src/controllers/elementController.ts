import { Request, Response } from 'express';
import { ElementModel } from '../models/elementModel';
import { BoardModel } from '../models/boardModel';
import { FileModel } from '../models/fileModel';
import {
  CanvasLimitError,
  assertApplyDeltaWithinLimits,
  assertReplaceAllWithinLimits,
  assertUploadFilesWithinLimits,
} from '../lib/canvasLimits';
import { getDb } from '../lib/database';
import { ExcalidrawElement, ExcalidrawFilesMap, ExcalidrawSceneData } from '../types';
import logger from '../utils/logger';

const handleMutationError = (
  res: Response,
  error: unknown,
  logContext: string,
  message: string
) => {
  if (error instanceof CanvasLimitError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  logger.error(logContext, error);
  return res.status(500).json({
    success: false,
    message,
  });
};

export const elementController = {
  async getByBoardId(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;

      const board = await BoardModel.findById(boardId);

      if (!board) {
        return res.status(404).json({
          success: false,
          message: '画板不存在',
        });
      }

      const elements = await ElementModel.findAllByBoardId(boardId);
      const files = await FileModel.findAllByBoardId(boardId);

      const excalidrawElements = ElementModel.convertToExcalidrawElements(elements);
      const excalidrawFiles = FileModel.convertToExcalidrawFiles(files);

      return res.status(200).json({
        success: true,
        data: {
          elements: excalidrawElements,
          files: excalidrawFiles,
        },
      });
    } catch (error) {
      logger.error(`Error getting elements for board ${req.params.boardId}:`, error);
      return res.status(500).json({
        success: false,
        message: '获取画布内容失败',
      });
    }
  },

  async checkFiles(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;

      const { fileIds } = req.body as { fileIds: string[] };
      if (!Array.isArray(fileIds)) {
        return res.status(400).json({ success: false, message: 'fileIds 必须是数组' });
      }

      const existingIds = await FileModel.checkExisting(boardId, fileIds);
      const missingIds = fileIds.filter(id => !existingIds.includes(id));

      return res.status(200).json({ success: true, data: { missingIds } });
    } catch (error) {
      logger.error(`Error checking files for board ${req.params.boardId}:`, error);
      return res.status(500).json({ success: false, message: '检查文件失败' });
    }
  },

  async uploadFiles(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      const { files } = req.body as { files: ExcalidrawFilesMap };
      if (!files || typeof files !== 'object') {
        return res.status(400).json({ success: false, message: 'files 必须是对象' });
      }

      await assertUploadFilesWithinLimits(boardId, files);
      await FileModel.upsertMany(boardId, files);

      return res.status(200).json({ success: true, message: '文件已上传' });
    } catch (error) {
      return handleMutationError(
        res,
        error,
        `Error uploading files for board ${req.params.boardId}:`,
        '上传文件失败'
      );
    }
  },

  async applyDelta(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      const { upserted, deleted } = req.body as {
        upserted: ExcalidrawElement[];
        deleted: string[];
      };

      await assertApplyDeltaWithinLimits(boardId, upserted ?? [], deleted ?? []);

      const db = await getDb();
      await db.run('BEGIN TRANSACTION');

      try {
        if (upserted && upserted.length > 0) {
          await ElementModel.upsertMany(boardId, upserted);
        }
        if (deleted && deleted.length > 0) {
          await ElementModel.deleteMany(boardId, deleted);
        }
        await db.run('COMMIT');
      } catch (txError) {
        await db.run('ROLLBACK');
        throw txError;
      }

      await BoardModel.update(boardId, {});

      return res.status(200).json({ success: true, message: '增量更新已应用' });
    } catch (error) {
      return handleMutationError(
        res,
        error,
        `Error applying delta for board ${req.params.boardId}:`,
        '保存增量更新失败'
      );
    }
  },

  async replaceAll(
    req: Request<{ boardId: string }, unknown, ExcalidrawSceneData | ExcalidrawElement[]>,
    res: Response
  ) {
    try {
      const { boardId } = req.params;
      const body = req.body;

      let elements: ExcalidrawElement[] = [];
      let files: ExcalidrawFilesMap = {};

      if (Array.isArray(body)) {
        elements = body;
      } else if (body && typeof body === 'object') {
        const scenePayload = body as Partial<ExcalidrawSceneData>;
        if (!scenePayload.elements || !Array.isArray(scenePayload.elements)) {
          return res.status(400).json({
            success: false,
            message: '场景数据无效：elements 必须是数组',
          });
        }
        elements = scenePayload.elements;

        if (
          scenePayload.files &&
          typeof scenePayload.files === 'object' &&
          !Array.isArray(scenePayload.files)
        ) {
          files = { ...scenePayload.files } as ExcalidrawFilesMap;
        }
      } else {
        return res.status(400).json({
          success: false,
          message: '请求数据无效',
        });
      }

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({
          success: false,
          message: '画板不存在',
        });
      }

      assertReplaceAllWithinLimits(elements, files);

      const db = await getDb();
      await db.run('BEGIN TRANSACTION');

      try {
        await ElementModel.replaceAll(boardId, elements, { db, useTransaction: false });
        await FileModel.replaceAll(boardId, files, { db, useTransaction: false });
        await db.run('COMMIT');
      } catch (transactionError) {
        await db.run('ROLLBACK');
        throw transactionError;
      }

      await BoardModel.update(boardId, {});

      return res.status(200).json({
        success: true,
        message: '画布内容已替换',
      });
    } catch (error) {
      return handleMutationError(
        res,
        error,
        `Error replacing elements for board ${req.params.boardId}:`,
        '替换画布内容失败'
      );
    }
  },
};
