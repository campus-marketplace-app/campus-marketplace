import { Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import Index from './pages/index.tsx'
import Profile from './pages/profile.tsx'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <Routes>
          <Route>
            <Route path="/" element={<Index />}/>
            <Route path="/profile" element={<Profile />}/>
          </Route>
        </Routes>
        </div>
    </>
  )
}

export default App
