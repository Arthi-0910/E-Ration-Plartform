import { AppProvider, useApp } from './store/AppContext';
import LoginPage from './pages/LoginPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import { Toast } from './components/ui';
import './index.css';

function AppRouter() {
  const { state, dispatch } = useApp();
  const { currentRole, toast } = state;

  return (
    <>
      {!currentRole && <LoginPage />}
      {currentRole === 'user'        && <UserDashboard />}
      {currentRole === 'admin'       && <AdminDashboard />}
      {currentRole === 'shopkeeper'  && <ShopkeeperDashboard />}

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => dispatch({ type:'CLEAR_TOAST' })}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
