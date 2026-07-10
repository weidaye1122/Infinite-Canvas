import { Request, Response } from 'express';
import { ShareLinkModel } from '../models/shareLinkModel';
import { BoardModel } from '../models/boardModel';
import { ElementModel } from '../models/elementModel';
import { FileModel } from '../models/fileModel';
import { LibraryModel } from '../models/libraryModel';
import {
  CanvasLimitError,
  assertApplyDeltaWithinLimits,
  assertReplaceAllWithinLimits,
  assertUploadFilesWithinLimits,
} from '../lib/canvasLimits';
import { getDb } from '../lib/database';
import { ExcalidrawElement, ExcalidrawFilesMap, ExcalidrawSceneData } from '../types';
import logger from '../utils/logger';

const handleSharedMutationError = (
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

// Owner-facing: create/get share link for a board
export const shareController = {
  async createShareLink(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;
      const { permission } = req.body as { permission: 'edit' | 'readonly' };

      if (!permission || !['edit', 'readonly'].includes(permission)) {
        return res
          .status(400)
          .json({ success: false, message: "permission 必须为 'edit' 或 'readonly'" });
      }

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      const shareLink = await ShareLinkModel.create(boardId, permission);

      return res.status(200).json({
        success: true,
        data: {
          id: shareLink.id,
          permission: shareLink.permission,
          created_at: shareLink.created_at,
        },
      });
    } catch (error) {
      logger.error(`Error creating share link for board ${req.params.boardId}:`, error);
      return res.status(500).json({ success: false, message: '创建分享链接失败' });
    }
  },

  async listShareLinks(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      const links = await ShareLinkModel.findAllByBoardId(boardId);

      return res.status(200).json({
        success: true,
        data: links.map(l => ({ id: l.id, permission: l.permission, created_at: l.created_at })),
      });
    } catch (error) {
      logger.error(`Error listing share links for board ${req.params.boardId}:`, error);
      return res.status(500).json({ success: false, message: '获取分享链接失败' });
    }
  },
};

// Shared-user-facing: resolve shareId → board, enforce permissions
export const sharedController = {
  async getShareInfo(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }

      const board = await BoardModel.findById(link.board_id);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      return res.status(200).json({
        success: true,
        data: { name: board.name, permission: link.permission },
      });
    } catch (error) {
      logger.error(`Error getting share info for ${req.params.shareId}:`, error);
      return res.status(500).json({ success: false, message: '获取分享信息失败' });
    }
  },

  async getElements(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }

      const elements = await ElementModel.findAllByBoardId(link.board_id);
      const files = await FileModel.findAllByBoardId(link.board_id);

      return res.status(200).json({
        success: true,
        data: {
          elements: ElementModel.convertToExcalidrawElements(elements),
          files: FileModel.convertToExcalidrawFiles(files),
        },
      });
    } catch (error) {
      logger.error(`Error getting elements for share ${req.params.shareId}:`, error);
      return res.status(500).json({ success: false, message: '获取共享画布内容失败' });
    }
  },

  async applyDelta(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }
      if (link.permission !== 'edit') {
        return res.status(403).json({ success: false, message: '当前分享链接为只读' });
      }

      const { upserted, deleted } = req.body as {
        upserted: ExcalidrawElement[];
        deleted: string[];
      };

      await assertApplyDeltaWithinLimits(link.board_id, upserted ?? [], deleted ?? []);

      const db = await getDb();
      await db.run('BEGIN TRANSACTION');

      try {
        if (upserted && upserted.length > 0) {
          await ElementModel.upsertMany(link.board_id, upserted);
        }
        if (deleted && deleted.length > 0) {
          await ElementModel.deleteMany(link.board_id, deleted);
        }
        await db.run('COMMIT');
      } catch (txError) {
        await db.run('ROLLBACK');
        throw txError;
      }

      await BoardModel.update(link.board_id, {});

      return res.status(200).json({ success: true, message: '增量更新已应用' });
    } catch (error) {
      return handleSharedMutationError(
        res,
        error,
        `Error applying delta for share ${req.params.shareId}:`,
        '保存共享画布变更失败'
      );
    }
  },

  async replaceAll(
    req: Request<{ shareId: string }, unknown, ExcalidrawSceneData | ExcalidrawElement[]>,
    res: Response
  ) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }
      if (link.permission !== 'edit') {
        return res.status(403).json({ success: false, message: '当前分享链接为只读' });
      }

      const body = req.body;
      let elements: ExcalidrawElement[] = [];
      let files: ExcalidrawFilesMap = {};

      if (Array.isArray(body)) {
        elements = body;
      } else if (body && typeof body === 'object') {
        const scene = body as Partial<ExcalidrawSceneData>;
        if (!scene.elements || !Array.isArray(scene.elements)) {
          return res.status(400).json({ success: false, message: 'elements 必须是数组' });
        }
        elements = scene.elements;
        if (scene.files && typeof scene.files === 'object' && !Array.isArray(scene.files)) {
          files = { ...scene.files } as ExcalidrawFilesMap;
        }
      } else {
        return res.status(400).json({ success: false, message: '请求数据无效' });
      }

      assertReplaceAllWithinLimits(elements, files);

      const db = await getDb();
      await db.run('BEGIN TRANSACTION');

      try {
        await ElementModel.replaceAll(link.board_id, elements, { db, useTransaction: false });
        await FileModel.replaceAll(link.board_id, files, { db, useTransaction: false });
        await db.run('COMMIT');
      } catch (txError) {
        await db.run('ROLLBACK');
        throw txError;
      }

      await BoardModel.update(link.board_id, {});

      return res.status(200).json({ success: true, message: '画布内容已替换' });
    } catch (error) {
      return handleSharedMutationError(
        res,
        error,
        `Error replacing elements for share ${req.params.shareId}:`,
        '替换共享画布内容失败'
      );
    }
  },

  async checkFiles(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }
      if (link.permission !== 'edit') {
        return res.status(403).json({ success: false, message: '当前分享链接为只读' });
      }

      const { fileIds } = req.body as { fileIds: string[] };
      if (!Array.isArray(fileIds)) {
        return res.status(400).json({ success: false, message: 'fileIds 必须是数组' });
      }

      const existingIds = await FileModel.checkExisting(link.board_id, fileIds);
      const missingIds = fileIds.filter(id => !existingIds.includes(id));

      return res.status(200).json({ success: true, data: { missingIds } });
    } catch (error) {
      logger.error(`Error checking files for share ${req.params.shareId}:`, error);
      return res.status(500).json({ success: false, message: '检查文件失败' });
    }
  },

  async uploadFiles(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }
      if (link.permission !== 'edit') {
        return res.status(403).json({ success: false, message: '当前分享链接为只读' });
      }

      const { files } = req.body as { files: ExcalidrawFilesMap };
      if (!files || typeof files !== 'object') {
        return res.status(400).json({ success: false, message: 'files 必须是对象' });
      }

      await assertUploadFilesWithinLimits(link.board_id, files);
      await FileModel.upsertMany(link.board_id, files);

      return res.status(200).json({ success: true, message: '文件已上传' });
    } catch (error) {
      return handleSharedMutationError(
        res,
        error,
        `Error uploading files for share ${req.params.shareId}:`,
        '上传文件失败'
      );
    }
  },

  async getLibrary(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }

      const libraryData = await LibraryModel.getByBoardId(link.board_id);

      return res.status(200).json({
        success: true,
        data: libraryData ?? { libraryItems: [] },
      });
    } catch (error) {
      logger.error(`Error getting library for share ${req.params.shareId}:`, error);
      return res.status(500).json({ success: false, message: '获取素材库失败' });
    }
  },

  async saveLibrary(req: Request<{ shareId: string }>, res: Response) {
    try {
      const link = await ShareLinkModel.findById(req.params.shareId);
      if (!link) {
        return res.status(404).json({ success: false, message: '分享链接不存在' });
      }
      if (link.permission !== 'edit') {
        return res.status(403).json({ success: false, message: '当前分享链接为只读' });
      }

      const { libraryItems } = req.body ?? {};
      if (!Array.isArray(libraryItems)) {
        return res.status(400).json({ success: false, message: 'libraryItems 必须是数组' });
      }

      await LibraryModel.save(link.board_id, libraryItems);
      await BoardModel.update(link.board_id, {});

      return res.status(200).json({ success: true, message: '素材库已保存' });
    } catch (error) {
      logger.error(`Error saving library for share ${req.params.shareId}:`, error);
      return res.status(500).json({ success: false, message: '保存素材库失败' });
    }
  },
};
