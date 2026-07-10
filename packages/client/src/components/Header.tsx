import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.scss';
import ArchivePopup from './ArchivePopup';
import SharePopup from './SharePopup';
import Tab from './Tab';
import { useBoardContext } from '../contexts/BoardProvider';
import Icon from './Icon';
import { zhCN } from '../i18n/zhCN';
import { useAuth } from '../contexts/AuthProvider';

const Header = () => {
  const [isArchivePopupOpen, setIsArchivePopupOpen] = useState(false);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const navigate = useNavigate();
  const { boards, isLoading, activeBoardId, handleCreateBoard } = useBoardContext();
  const { isAuthEnabled, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="header">
        <div className="tab-bar-loading">{zhCN.board.tabBarLoading}</div>
      </div>
    );
  }

  return (
    <div className="header">
      <button
        className="archive-button"
        onClick={() => setIsArchivePopupOpen(true)}
        aria-label={zhCN.board.archiveBoards}
      >
        <Icon name="archive" />
      </button>

      <div className="tab-bar">
        {boards.map(board => (
          <Tab key={board.id} board={board} activeBoardId={activeBoardId} />
        ))}
        <button
          onClick={handleCreateBoard}
          className="create-board-button"
          aria-label={zhCN.board.createBoard}
        >
          +
        </button>
      </div>

      <div className="header-actions">
        {activeBoardId && (
          <button
            className="share-button"
            onClick={() => setIsSharePopupOpen(true)}
            aria-label={zhCN.board.shareBoard}
          >
            <Icon name="share" />
          </button>
        )}
        {isAuthEnabled && (
          <button className="logout-button" onClick={handleLogout}>
            {zhCN.auth.logout}
          </button>
        )}
      </div>

      <ArchivePopup isOpen={isArchivePopupOpen} onClose={() => setIsArchivePopupOpen(false)} />
      {activeBoardId && (
        <SharePopup
          isOpen={isSharePopupOpen}
          onClose={() => setIsSharePopupOpen(false)}
          boardId={activeBoardId}
        />
      )}
    </div>
  );
};

export default Header;
