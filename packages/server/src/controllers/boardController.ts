import { Request, Response } from 'express';
import { BoardModel } from '../models/boardModel';
import { BoardStatus } from '../types';
import logger from '../utils/logger';

export const boardController = {
  async create(req: Request, res: Response) {
    try {
      const board = await BoardModel.create();

      return res.status(201).json({
        success: true,
        data: board,
      });
    } catch (error) {
      logger.error('Error creating board:', error);
      return res.status(500).json({
        success: false,
        message: '创建画板失败',
      });
    }
  },

  async listActive(req: Request, res: Response) {
    try {
      const boards = await BoardModel.findAllActive();

      return res.status(200).json({
        success: true,
        data: boards,
      });
    } catch (error) {
      logger.error('Error listing active boards:', error);
      return res.status(500).json({
        success: false,
        message: '获取画板列表失败',
      });
    }
  },

  async listTrash(req: Request, res: Response) {
    try {
      const boards = await BoardModel.findAllDeleted();

      return res.status(200).json({
        success: true,
        data: boards,
      });
    } catch (error) {
      logger.error('Error listing boards in trash:', error);
      return res.status(500).json({
        success: false,
        message: '获取回收站画板失败',
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const board = await BoardModel.findById(id);

      if (!board) {
        return res.status(404).json({
          success: false,
          message: '画板不存在',
        });
      }

      if (board.status === BoardStatus.DELETED) {
        return res.status(400).json({
          success: false,
          message: '回收站中的画板无法编辑',
        });
      }

      const updatedBoard = await BoardModel.update(id, { name });

      return res.status(200).json({
        success: true,
        data: updatedBoard,
      });
    } catch (error) {
      logger.error(`Error updating board ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        message: '更新画板失败',
      });
    }
  },

  async moveToTrash(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const board = await BoardModel.findById(id);

      if (!board) {
        return res.status(404).json({
          success: false,
          message: '画板不存在',
        });
      }

      if (board.status === BoardStatus.DELETED) {
        return res.status(400).json({
          success: false,
          message: '画板已在回收站中',
        });
      }

      await BoardModel.moveToTrash(id);

      return res.status(200).json({
        success: true,
        message: '画板已移至回收站',
      });
    } catch (error) {
      logger.error(`Error moving board ${req.params.id} to trash:`, error);
      return res.status(500).json({
        success: false,
        message: '归档画板失败',
      });
    }
  },

  async restoreFromTrash(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const board = await BoardModel.findById(id);

      if (!board) {
        return res.status(404).json({
          success: false,
          message: '画板不存在',
        });
      }

      if (board.status !== BoardStatus.DELETED) {
        return res.status(400).json({
          success: false,
          message: '画板不在回收站中',
        });
      }

      await BoardModel.restoreFromTrash(id);

      return res.status(200).json({
        success: true,
        message: '画板已恢复',
      });
    } catch (error) {
      logger.error(`Error restoring board ${req.params.id} from trash:`, error);
      return res.status(500).json({
        success: false,
        message: '恢复画板失败',
      });
    }
  },

  async permanentDelete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const board = await BoardModel.findById(id);
      if (!board) {
        return res.status(404).json({ success: false, message: '画板不存在' });
      }

      await BoardModel.permanentlyDelete(id);

      return res.status(200).json({
        success: true,
        message: '画板及相关数据已彻底删除',
      });
    } catch (error) {
      logger.error(`Error permanently deleting board ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        message: '彻底删除画板失败',
      });
    }
  },
};
