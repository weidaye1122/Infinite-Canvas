import '../styles/Loader.scss';
import { zhCN } from '../i18n/zhCN';

interface LoaderProps {
  message?: string;
}

const Loader = ({ message = zhCN.common.loading }: LoaderProps) => {
  return (
    <div className="loader-container">
      <div className="loader-spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default Loader;
