import React from 'react'
import Navigation from './Navigation'
import Header from './Header'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-pink-50 flex flex-col max-w-md mx-auto relative">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 safe-bottom">
        {children}
      </main>
      <Navigation />
    </div>
  )
}
