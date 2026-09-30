import { RouterProvider } from 'react-router';
import { router } from './routes';
import '../styles/fonts.css';

export default function App() {
  return (
    <>
      <style>{`
        .font-serif { font-family: 'EB Garamond', serif !important; }
        .font-mono { font-family: 'DM Mono', monospace !important; }
      `}</style>
      <RouterProvider router={router} />
    </>
  );
}
