import React from "react";
import AppRoutes from "./router";
import 'antd/dist/reset.css'; //Ensures Ant Design stryles
import CaseDetailPage from "./features/reviewer/CaseDetailPage";
import LoginPage from "../features/auth/LoginPage";

function App() {
  return (
    <div className="App">
      <AppRoutes />
    </div>
  );
  //return <CaseDetailPage />;
}

export default App;

