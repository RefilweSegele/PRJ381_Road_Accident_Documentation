import './App.css'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import CaseEntryForm from './components/CaseEntryForm'
import CaseDashboard from "./features/investigator/CaseDashboard";

function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<h2>Dashboard Overview</h2>} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/new-case" element={<CaseEntryForm />} />
        <Route path="/investigator/cases" element={<CaseDashboard />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App
