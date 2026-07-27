import { Link } from 'react-router-dom'

function Sidebar() {
    return (
        <nav className="app-sidebar">
            <ul className="app-sidebar__list">
                <li><Link to="/">Dashboard</Link></li>
                <li><Link to="/new-case">New Case</Link></li>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
            </ul>
        </nav>
    )
}

export default Sidebar