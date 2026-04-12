import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Feeding = lazy(() => import('./pages/Feeding'))
const Sleep = lazy(() => import('./pages/Sleep'))
const Diaper = lazy(() => import('./pages/Diaper'))
const Solids = lazy(() => import('./pages/Solids'))
const Growth = lazy(() => import('./pages/Growth'))
const Diary = lazy(() => import('./pages/Diary'))
const Stats = lazy(() => import('./pages/Stats'))
const Settings = lazy(() => import('./pages/Settings'))
const Import = lazy(() => import('./pages/Import'))
const Export = lazy(() => import('./pages/Export'))

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#f9a8d4', secondary: '#fff' },
          },
        }}
      />
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/feeding" element={<Feeding />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/diaper" element={<Diaper />} />
            <Route path="/solids" element={<Solids />} />
            <Route path="/growth" element={<Growth />} />
            <Route path="/diary" element={<Diary />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/import" element={<Import />} />
            <Route path="/export" element={<Export />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </AppProvider>
  )
}
