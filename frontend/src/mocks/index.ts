// MSW Mocks entry point
// Usage in main.tsx:
//
// async function enableMocking() {
//   if (import.meta.env.VITE_USE_MOCK !== 'true') return;
//   const { worker } = await import('./mocks/browser');
//   return worker.start();
// }
//
// enableMocking().then(() => {
//   ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
// });

export { handlers } from './handlers';
