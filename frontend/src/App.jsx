import React from "react";
import UploadWizard from "./features/investigator/upload/UploadWizard";
import 'antd/dist/reset.css'; //Ensures Ant Design stryles

function App() {
  return (
    <div className="App">
        {/* Temporarily rendering Member 4s work*/} 
        <UploadWizard />
    </div>
  );
}

export default App;