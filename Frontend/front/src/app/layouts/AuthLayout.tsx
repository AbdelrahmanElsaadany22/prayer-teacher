import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <main style={{ display: 'grid', minHeight: '100vh' }}>
      <Outlet />
    </main>
  );
}
