import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadStore } from './useUploadStore';
import { Card, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import './ImageDropzone.css';

const { Title, Text } = Typography;

export default function ImageDropzone(){
    const { images, setImages } = useUploadStore();

    const onDrop = useCallback((acceptedFiles) => {
        const newImages = acceptedFiles.map(file => Object.assign(file, {
            preview: URL.createObjectURL(file)
        }));

        setImages([...images, ...newImages]);

    }, [images, setImages]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': ['.jpeg', '.jpg']}
    });

    return (
        <Card className = "dropzone-card">
            <Title level = {4}>Step A: Upload Aerial Imagery</Title>

            <div {...getRootProps()} className = {`dropzone-area ${isDragActive ? `active` : ''}`}>
                <input {...getInputProps()} />
                <InboxOutlined className = "dropzone-icon" />
                <p>Drag and Drop Drone JPEGs her, or click to select files</p>
            </div>

            <div className = "thimnail-grid">
                {images.map((file) => (
                    <img
                        key = {file.name}
                        src = {file.preview}
                        alt = "preview"
                        className = "thumbnail-image"
                    />  
                ))}
            </div>
            <Text type = 'secondary'>Total Images: {images.length}</Text>
        </Card>
    );
}