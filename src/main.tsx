import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { toast } from 'sonner'
import { isNativeApp } from '@/hooks/use-mobile'

const existingViewport = document.querySelector('meta[name="viewport"]')
if (existingViewport) {
  existingViewport.remove()
}

const metaViewport = document.createElement('meta')
metaViewport.name = 'viewport'
metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
document.head.appendChild(metaViewport)

const isNativePlatform = isNativeApp();

if (isNativePlatform) {
  window.addEventListener('online', () => {
    toast('Connection restored', {
      description: 'You are back online'
    })
  })
  
  window.addEventListener('offline', () => {
    toast('No internet connection', {
      description: 'Please check your connection and try again'
    })
  })
}

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(<App />)
