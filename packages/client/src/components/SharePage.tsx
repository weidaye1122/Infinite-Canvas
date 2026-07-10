import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShareService, type ShareInfo } from '../services/shareService';
import ExcalidrawEditor from './ExcalidrawEditor';
import Loader from './Loader';
import '../styles/SharePage.scss';
import logger from '../utils/logger';
import { zhCN } from '../i18n/zhCN';

const SharePage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = zhCN.common.appTitle;
  }, []);

  useEffect(() => {
    if (!shareId) return;

    const fetchShareInfo = async () => {
      try {
        setIsLoading(true);
        const info = await ShareService.getShareInfo(shareId);
        setShareInfo(info);
        document.title = zhCN.common.appTitle;
      } catch (err) {
        setError(zhCN.share.loadShareInfoError);
        logger.error(zhCN.errors.fetchShareInfo, err, true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShareInfo();
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="share-page loading">
        <Loader message={zhCN.share.loadSharedBoard} />
      </div>
    );
  }

  if (error || !shareInfo || !shareId) {
    return (
      <div className="share-page error">
        <div className="error-container">
          <h2>{zhCN.share.unableToLoadSharedBoard}</h2>
          <p>{error || zhCN.share.invalidShareLink}</p>
        </div>
      </div>
    );
  }

  const isReadOnly = shareInfo.permission === 'readonly';

  return (
    <div className="share-page">
      <div className="share-header">
        <span className="share-board-name">{shareInfo.name}</span>
        {isReadOnly && <span className="share-badge">{zhCN.share.readonlyBadge}</span>}
      </div>
      <div className="editor-container">
        <ExcalidrawEditor key={shareId} shareId={shareId} readOnly={isReadOnly} />
      </div>
    </div>
  );
};

export default SharePage;
