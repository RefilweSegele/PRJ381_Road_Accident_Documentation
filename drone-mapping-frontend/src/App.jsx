import './App.css'
import DashboardLayout from './components/DashboardLayout'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import CaseEntryForm from './components/CaseEntryForm'

function App() {
  return (
    <DashboardLayout>
      <h2>Dashboard Overview</h2>
      <p>Welcome to the accident scene documentation system.</p>
      <LoginForm />
      <RegisterForm />
      <CaseEntryForm />
    </DashboardLayout>
  )
}

export default App
