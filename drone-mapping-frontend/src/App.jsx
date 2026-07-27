import './App.css'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import CaseEntryForm from './components/CaseEntryForm'

function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<h2>Dashboard Overview</h2>} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/new-case" element={<CaseEntryForm />} />
      </Routes>
    </DashboardLayout>
  )
}

export default App
