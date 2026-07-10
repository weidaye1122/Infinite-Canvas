import { Request, Response } from 'express';
import { BoardModel } from '../models/boardModel';
import { LibraryModel } from '../models/libraryModel';
import type { LibraryPersistedData } from '../types';
import logger from '../utils/logger';

export const libraryController = {
  async getByBoardId(req: Request<{ boardId: string }>, res: Response) {
    try {
      const { boardId } = req.params;

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      const libraryData = await LibraryModel.getByBoardId(boardId);

      return res.status(200).json({
        success: true,
        data: libraryData ?? { libraryItems: [] },
      });
    } catch (error) {
      logger.error(`Error getting library for board ${req.params.boardId}:`, error);
      return res.status(500).json({
        success: false,
        message: '获取素材库数据失败',
      });
    }
  },

  async save(req: Request<{ boardId: string }, unknown, LibraryPersistedData>, res: Response) {
    try {
      const { boardId } = req.params;

      const { libraryItems } = req.body ?? {};

      if (!Array.isArray(libraryItems)) {
        return res.status(400).json({
          success: false,
          message: '请求数据无效：libraryItems 必须是数组',
        });
      }

      const board = await BoardModel.findById(boardId);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      await LibraryModel.save(boardId, libraryItems);
      await BoardModel.update(boardId, {});

      return res.status(200).json({
        success: true,
        message: '素材库已保存',
      });
    } catch (error) {
      logger.error(`Error saving library for board ${req.params.boardId}:`, error);
      return res.status(500).json({
        success: false,
        message: '保存素材库数据失败',
      });
    }
  },
};
