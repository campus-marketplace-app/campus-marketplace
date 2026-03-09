import { Route, Routes } from 'react-router-dom'
import Index from './pages/index.tsx'
import Listing from './pages/listing.tsx'
import Messages from './pages/messages.tsx'
import Profile from './pages/profile.tsx'
import SidebarLayout from "./layouts/sidebarLayout.tsx";
import Login from './pages/login.tsx'
import './App.css'

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
            <Route path="/profile" element={<Profile />}/>
            <Route path="/login" element={<Login />}/>
          </Route>
        </Routes>
        </div>
    </>
  )
}

export default App
