import React from 'react';
import { useParams } from 'react-router-dom';
import ImageDropzone from './ImageDropzone';
import GcpTableInput from './GcpTableInput';
import './UploadWizard.css';
import FlightLogForm from './FlightLogForm';

// Served at "/" (no case: data stays in the browser) and "/cases/:id/upload"
// (data is validated and saved to that case by the backend).
export default function UploadWizard() {
    const { id } = useParams();
    const caseId = id && /^[1-9]\d*$/.test(id) ? Number(id) : undefined;

    return (
      <div className="wizard-container">
        <h1 className="wizard-title">Case Data Upload</h1>
        <ImageDropzone />
        <GcpTableInput caseId={caseId} />
        <FlightLogForm caseId={caseId} />
      </div>
    );
}
