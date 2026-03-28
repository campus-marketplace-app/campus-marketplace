import { Route, Routes } from 'react-router-dom'
import Index from './pages/index.tsx'
import Listing from './pages/listing.tsx'
import Messages from './pages/messages.tsx'
import Profile from './pages/profile.tsx'
import SidebarLayout from "./layouts/sidebar-layout.tsx";
import Login from './pages/login.tsx'
import Signup from './pages/signup.tsx'
import './App.css'
import ResetEmail from './pages/reset-email.tsx'
import ResetPassword from './pages/reset-password.tsx'

function App() {
  return (
    <>
      <div>
        <Routes >
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<Index />}/>
            <Route path="/listing" element={<Listing />}/>
            <Route path="/listing/:id" element={<Listing />}/>
            <Route path="/messages" element={<Messages />}/>
            <Route path="/messages/:conversationId" element={<Messages />}/>
            <Route path="/profile" element={<Profile />}/>
            <Route path="/login" element={<Login />}/>
            <Route path="/signup" element={<Signup />}/>
            <Route path="/home" element={<Index />} />
            <Route path="/reset-email" element={<ResetEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Routes>
        </div>
    </>
  )
}

export default App
