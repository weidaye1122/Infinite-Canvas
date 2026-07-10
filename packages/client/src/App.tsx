import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BoardPage from './components/BoardPage';
import SharePage from './components/SharePage';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import { BoardProvider, useBoardContext } from './contexts/BoardProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { ThemeProvider } from './contexts/ThemeProvider';
import RequireAuth from './components/RequireAuth';
import { zhCN } from './i18n/zhCN';
import './styles/App.scss';
import '@excalidraw/excalidraw/index.css';

const HomePage = () => {
  const { isLoading, boards } = useBoardContext();

  if (isLoading) {
    return <Loader />;
  }

  if (boards.length === 0) {
    return <div>{zhCN.board.noBoardsFound}</div>;
  }

  return <Navigate to={`/board/${boards[0].id}`} />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/board/:boardId"
              element={
                <RequireAuth>
                  <BoardProvider>
                    <BoardPage />
                  </BoardProvider>
                </RequireAuth>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <BoardProvider>
                    <HomePage />
                  </BoardProvider>
                </RequireAuth>
              }
            />
            <Route path="/share/:shareId" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
