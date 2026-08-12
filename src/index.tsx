import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import ReactDOM from "react-dom/client";
import "./index.css";
const queryClient = new QueryClient();

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}