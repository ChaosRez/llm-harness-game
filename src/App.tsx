import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Levels from './pages/Levels'
import Sandbox from './pages/Sandbox'
import Manual from './pages/Manual'
import Play from './pages/Play'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="levels" element={<Levels />} />
        <Route path="sandbox" element={<Sandbox />} />
        <Route path="manual" element={<Manual />} />
        <Route path="play/:levelId" element={<Play />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
