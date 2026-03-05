import { Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Index from './pages/index.tsx'
import Listing from './pages/listing.tsx'
import Profile from './pages/profile.tsx'
import SidebarLayout from "./layouts/sidebarLayout.tsx";
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location };

  return (
    <>
      <div>
        <Routes location={state?.backgroundLocation || location}>
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<Index />}/>
            <Route path="/listing" element={<Listing />}/>
            <Route path="/listing/:id" element={<Listing />}/>
            <Route path="/profile" element={<Profile />}/>
          </Route>
        </Routes>

        {state?.backgroundLocation && (
          <Routes>
            <Route element={<SidebarLayout />}>
              <Route path="/listing/:id" element={<Listing />}/>
            </Route>
          </Routes>
        )}
        </div>
    </>
  )
}

export default App
