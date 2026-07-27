import Header from './Header'
import Sidebar from './Sidebar'

function DashboardLayout({ children }) {
    return (
        <div className="app-layout">
            <Header />
            <div className="app-layour__body">
                <Sidebar />
                <main className="app-layout__content">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout