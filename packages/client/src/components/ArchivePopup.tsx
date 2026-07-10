import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrashBoard } from '../types/types';
import { BoardService } from '../services/boardService';
import '../styles/ArchivePopup.scss';
import { useBoardContext } from '../contexts/BoardProvider';
import Icon from './Icon';
import logger from '../utils/logger';
import { formatDateTime, zhCN } from '../i18n/zhCN';

interface ArchivePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ArchivePopup = ({ onClose, isOpen }: ArchivePopupProps) => {
  const [archivedBoards, setArchivedBoards] = useState<TrashBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { fetchBoards } = useBoardContext();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      fetchArchivedBoards();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  const fetchArchivedBoards = async () => {
    try {
      setIsLoading(true);
      const data = await BoardService.getTrashedBoards();
      setArchivedBoards(data);
    } catch (error) {
      setError(zhCN.errors.network);
      logger.error(zhCN.errors.fetchArchivedBoards, error, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (boardId: string) => {
    try {
      await BoardService.restoreBoard(boardId);
      setArchivedBoards(prev => prev.filter(board => board.id !== boardId));
      fetchBoards();
      navigate(`/board/${boardId}`);
    } catch (error) {
      setError(zhCN.errors.network);
      logger.error(zhCN.errors.restoreBoard, error, true);
    }
  };

  const handlePermanentDelete = async (boardId: string) => {
    if (!window.confirm(zhCN.archive.confirmPermanentDelete)) {
      return;
    }

    try {
      await BoardService.permanentlyDeleteBoard(boardId);
      setArchivedBoards(prev => prev.filter(board => board.id !== boardId));
    } catch (error) {
      setError(zhCN.errors.network);
      logger.error(zhCN.errors.deleteBoard, error, true);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="archive-popup">
        <div className="archive-popup-content">
          <h2>{zhCN.archive.loading}</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="archive-popup">
        <div className="archive-popup-content">
          <h2>{zhCN.archive.loadErrorTitle}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>{zhCN.common.returnHome}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="archive-popup" ref={popupRef}>
      <div className="archive-popup-header">
        <h2>{zhCN.archive.title}</h2>
        <button
          className="archive-popup-close"
          onClick={onClose}
          aria-label={zhCN.archive.closeDialog}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="archive-popup-content">
        {archivedBoards.length === 0 ? (
          <p>{zhCN.archive.empty}</p>
        ) : (
          archivedBoards.map(board => (
            <div key={board.id} className="archive-popup-item">
              <div>
                <h3 className="archive-popup-item-name">{board.name}</h3>
                <p className="archive-popup-item-date">
                  {zhCN.archive.archivedOn}
                  {formatDateTime(board.updated_at)}
                </p>
              </div>
              <div className="archive-popup-item-actions">
                <button
                  className="archive-popup-item-action-button button-restore"
                  onClick={() => handleRestore(board.id)}
                >
                  {zhCN.archive.restore}
                </button>
                <button
                  className="archive-popup-item-action-button button-delete"
                  onClick={() => handlePermanentDelete(board.id)}
                >
                  {zhCN.archive.permanentlyDelete}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArchivePopup;
