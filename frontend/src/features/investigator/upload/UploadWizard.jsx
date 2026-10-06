import React, { useCallback } from 'react';
import ImageDropzone from './ImageDropzone';
import GcpTableInput from './GcpTableInput';
import './UploadWizard.css';
import FlightLogForm from './FlightLogForm';

export default function UploadWizard() {
    return (
      <div className="wizard-container">
        <h1 className="wizard-title">Case Data Upload</h1>
        <ImageDropzone />
            <GcpTableInput />
            <GcpTableInput />
            <FlightLogForm />
      </div>
    );
  }
