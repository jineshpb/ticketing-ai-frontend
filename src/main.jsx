import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Tickets from './pages/tickets'
import CheckAuth from './components/check-auth'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Ticket from './pages/ticket'
import TicketDetailsPage from './pages/ticket'
import LoginPage from './pages/login'
import SignupPage from './pages/signup'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <CheckAuth protected={true}>
            <Tickets />
          </CheckAuth>} />
      </Routes>
      <Routes>
        <Route path="/tickets/:id" element={
          <CheckAuth protected={true}>
            <TicketDetailsPage />
          </CheckAuth>} />
      </Routes>
      <Routes>
        <Route path="/login" element={
          <CheckAuth protected={false}>
            <LoginPage />
          </CheckAuth>} />
      </Routes>
      <Routes>
        <Route path="/signup" element={
          <CheckAuth protected={false}>
            <SignupPage />
          </CheckAuth>} />
      </Routes>
    </BrowserRouter>

  </StrictMode>,
)
