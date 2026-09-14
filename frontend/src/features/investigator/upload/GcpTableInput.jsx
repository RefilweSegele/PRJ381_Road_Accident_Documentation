import React from 'react';
import Papa from 'papaparse';
import { useUploadStore } from './useUploadStore';
import { Table, Button, Upload, Alert, Card, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import './GcpTableInput.css';

const { Title } = Typography;

export default function GcpTableInput() {
    const { gcpData, setGcpData, iValidGcpCount } = useUploadStore();

    const handleFileUpload = (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setGcpData(results.data);
            },
        });
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
        )}

        <Table 
            className="gcp-table"
            dataSource={gcpData} 
            columns={columns} 
            rowKey="id" 
            size="small" 
        />
        </Card>   
    );
}