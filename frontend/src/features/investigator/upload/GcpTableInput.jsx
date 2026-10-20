import React, { useState } from 'react';
import Papa from 'papaparse';
import { useUploadStore } from './useUploadStore';
import { Table, Button, Upload, Alert, Card, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { importGcpFile } from '../../../api/gcp';
import './GcpTableInput.css';

const { Title } = Typography;

// Server points -> the { id, lat, long, elevation } shape the table and store use.
const toRow = (p) => ({ id: p.pointId, lat: p.latitude, long: p.longitude, elevation: p.elevation ?? '' });

export default function GcpTableInput({ caseId }) {
    const { gcpData, setGcpData, isValidGcpCount } = useUploadStore();
    const [pendingFile, setPendingFile] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [errors, setErrors] = useState([]);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const reset = () => { setWarnings([]); setErrors([]); setMessage(''); };

    // With a case: let the server parse (it knows every delimiter/encoding/Neo rule) and preview first.
    const previewOnServer = async (file) => {
        reset();
        setBusy(true);
        try {
            const data = await importGcpFile(caseId, file, { dryRun: true });
            setGcpData(data.points.map(toRow));
            setWarnings(data.warnings || []);
            setPendingFile(file);
        } catch (err) {
            const body = err.response?.data;
            setPendingFile(null);
            setErrors(body?.details?.errors || [{ message: body?.error || 'Could not read the file.' }]);
        } finally {
            setBusy(false);
        }
    };

    const saveToCase = async () => {
        setBusy(true);
        try {
            const data = await importGcpFile(caseId, pendingFile, { mode: 'replace' });
            setGcpData(data.points.map(toRow));
            setWarnings(data.warnings || []);
            setMessage(`${data.imported} GCPs saved to this case.`);
            setPendingFile(null);
        } catch (err) {
            setErrors([{ message: err.response?.data?.error || 'Could not save the GCPs.' }]);
        } finally {
            setBusy(false);
        }
    };

    // No case yet: previous behaviour, parse in the browser only.
    const parseLocally = (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => setGcpData(results.data),
        });
    };

    const handleFileUpload = (file) => {
        if (caseId) previewOnServer(file); else parseLocally(file);
        return false; // Prevent default upload behavior
    };

    const columns = [
        { title: 'Marker ID', dataIndex: 'id', key: 'id' },
        { title: 'Latitude', dataIndex: 'lat', key: 'lat' },
        { title: 'Longitude', dataIndex: 'long', key: 'long' },
        { title: 'Elevation', dataIndex: 'elevation', key: 'elevation' },
    ];

    return (
        <Card className="gcp-card">
            <Title level={4}>Step B: Ground Control Points (GCPs)</Title>

            <Upload beforeUpload={handleFileUpload} accept=".csv,.txt" showUploadList={false} disabled={busy}>
                <Button icon={<UploadOutlined />} loading={busy}>Import GCPs (CSV / TXT)</Button>
            </Upload>
            {caseId && pendingFile ? (
                <Button type="primary" style={{ marginLeft: 8 }} onClick={saveToCase} loading={busy}>
                    Save {gcpData.length} GCPs to case
                </Button>
            ) : null}

            {errors.length > 0 ? (
                <Alert
                    className="gcp-alert" type="error" showIcon
                    message="This file could not be imported"
                    description={errors.slice(0, 10).map((e, i) => (
                        <div key={i}>{e.row ? `Row ${e.row}: ` : ''}{e.message}</div>
                    ))}
                />
            ) : null}

            {message ? <Alert className="gcp-alert" type="success" showIcon message={message} /> : null}

            {warnings.map((w, i) => (
                <Alert key={`${w.code}-${i}`} className="gcp-alert" type="warning" showIcon message={w.message} />
            ))}

            {!caseId && gcpData.length > 0 && !isValidGcpCount() ? (
                <Alert
                    className="gcp-alert"
                    message={`${gcpData.length} GCPs recorded — 7 to 8 are recommended without RTK hardware.`}
                    type="warning"
                    showIcon
                />
            ) : null}

            <Table
                className="gcp-table"
                dataSource={gcpData}
                columns={columns}
                rowKey="id"
                size="small"
        <Title level={4}>Step B: Ground Control Points (GCPs) — Case {caseId}</Title>
        
        <Upload beforeUpload={handleFileUpload} accept=".csv,.txt" showUploadList={false}>
            <Button icon={<UploadOutlined />}>Import GCPs (CSV)</Button>
        </Upload>

        {gcpData.length > 0 && !isValidGcpCount() && (
            <Alert 
            className="gcp-alert"
            message={`${gcpData.length} GCPs recorded — 7 to 8 are recommended without RTK hardware.`} 
            type="warning" 
            showIcon 
            />
        </Card>
    );
}
