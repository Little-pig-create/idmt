import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api';
import type { CollectionSchema } from '@/types';
import Login from '@/components/Login';
import Shell from '@/components/Shell';
import Dashboard from '@/components/Dashboard';
import EntriesPage from '@/components/EntriesPage';
import MediaLibrary from '@/components/MediaLibrary';
import BuildPage from '@/components/BuildPage';
import SettingsPage from '@/components/SettingsPage';
import { ToastHost } from '@/components/Toast';

const getRoute = () => window.location.hash.replace(/^#/, '') || '/dashboard';

export default function App() {
  const [auth, setAuth] = useState<'loading' | 'anon' | 'ok'>('loading');
  const [route, setRoute] = useState(getRoute);
  const [schema, setSchema] = useState<Record<string, CollectionSchema> | null>(null);

  useEffect(() => {
    api.me().then(() => setAuth('ok')).catch(() => setAuth('anon'));
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (auth !== 'ok') return;
    api.schema().then((data) => setSchema(data.collections)).catch(() => setSchema(null));
  }, [auth]);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
    setRoute(path);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setAuth('anon');
    navigate('/dashboard');
  }, [navigate]);

  if (auth === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-[13px] text-[#6b7a90]">
          <span className="size-4 animate-spin rounded-full border-2 border-[#1f5eff] border-t-transparent" />
          正在验证会话…
        </div>
      </div>
    );
  }

  if (auth === 'anon') {
    return (
      <>
        <Login onSuccess={() => setAuth('ok')} />
        <ToastHost />
      </>
    );
  }

  let page = <Dashboard onNavigate={navigate} schema={schema} />;
  const collectionMatch = route.match(/^\/c\/([a-z]+)/);
  if (collectionMatch && schema?.[collectionMatch[1]]) {
    page = <EntriesPage collection={collectionMatch[1]} schema={schema[collectionMatch[1]]} />;
  } else if (route === '/media') {
    page = <MediaLibrary />;
  } else if (route === '/build') {
    page = <BuildPage />;
  } else if (route === '/settings') {
    page = <SettingsPage />;
  }

  return (
    <>
      <Shell route={route} onNavigate={navigate} onLogout={logout}>
        {page}
      </Shell>
      <ToastHost />
    </>
  );
}
