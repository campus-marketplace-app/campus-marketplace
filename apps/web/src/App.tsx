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
import MyListings from './pages/my-listings.tsx'
import Wishlist from './pages/wishlist.tsx'
import About from './pages/about.tsx'
import Contact from './pages/contact.tsx'
import Help from './pages/help.tsx'

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
            <Route path='/my-listings' element={<MyListings />} />
            <Route path='/profile/:userId' element={<Profile />} />
            <Route path='/wishlist' element={<Wishlist />} />
            <Route path='/about' element={<About />} />
            <Route path='/help' element={<Help />} />
            <Route path='/contact' element={<Contact />} />
          </Route>
        </Routes>
        </div>
    </>
  )
}

export default App
