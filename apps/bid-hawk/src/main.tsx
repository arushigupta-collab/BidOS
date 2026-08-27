import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'

import './styles/fonts.css'
import './styles/base.css'

const container = document.getElementById('root')
if (!container) throw new Error('BidOS could not mount: #root is missing.')

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </StrictMode>,
)
