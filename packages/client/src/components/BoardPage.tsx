import { useEffect } from 'react';
import Header from './Header';
import { useBoardContext } from '../contexts/BoardProvider';
import '../styles/BoardPage.scss';
import ExcalidrawEditor from './ExcalidrawEditor';
import Loader from './Loader';
import { zhCN } from '../i18n/zhCN';

const BoardPage = () => {
  const { isLoading, activeBoardId } = useBoardContext();

  useEffect(() => {
    document.title = zhCN.common.appTitle;
  }, []);

  if (isLoading) {
    return (
      <div className="board-page loading">
        <Loader message={zhCN.board.loadBoard} />
      </div>
    );
  }

  if (!activeBoardId) {
    return (
      <div className="board-page error">
        <div className="error-container">
          <h2>{zhCN.board.missingBoardTitle}</h2>
          <p>{zhCN.board.missingBoardDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <Header />
      <div className="editor-container">
        <ExcalidrawEditor key={activeBoardId} boardId={activeBoardId} />
      </div>
    </div>
  );
};

export default BoardPage;
