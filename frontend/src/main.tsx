import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import { router } from './router'
import { antdTheme } from './styles/antdTheme'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Enable MSW mocking in development if VITE_USE_MOCK is true
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') {
    return
  }

  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
  })
}

// MVP: Auto-login with test token for demo
async function setupTestAuth() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { useAuthStore } = await import('./stores/authStore')
    const store = useAuthStore.getState()
    if (!store.isAuthenticated) {
      store.setTestToken('test-token-for-mvp-demo')
    }
  }
}

enableMocking().then(async () => {
  await setupTestAuth()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={antdTheme}>
          <RouterProvider router={router} />
        </ConfigProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
