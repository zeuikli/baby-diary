import React from 'react'
import Navigation from './Navigation'
import Header from './Header'

export default function Layout({ children }) {
  return (
    <div className="h-dvh bg-pink-50 flex flex-col max-w-md mx-auto relative">
      <Header />
      <main className="flex-1 overflow-y-auto bottom-safe">
        {children}
      </main>
      <Navigation />
    </div>
  )
}
