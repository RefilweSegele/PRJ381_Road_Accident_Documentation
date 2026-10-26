import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadStore } from './useUploadStore';
import { Card, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { fetchCaseImages } from '../../../api/images';
import './ImageDropzone.css';

const { Title, Text } = Typography;

export default function ImageDropzone({ caseId, onExistingCountChange }) {
    const { images, setImages } = useUploadStore();
    const [savedImages, setSavedImages] = useState([]);

    useEffect(() => {
        let active = true;
        const objectUrls = [];
        fetchCaseImages(caseId)
            .then(async (data) => {
                if (!active) return;
                const token = localStorage.getItem('authToken');
                const withPreviews = await Promise.all((data.images || []).map(async (image) => {
                    const response = await fetch(image.url, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (!response.ok) return image;
                    const preview = URL.createObjectURL(await response.blob());
                    objectUrls.push(preview);
                    return { ...image, preview };
                }));
                if (!active) return;
                setSavedImages(withPreviews);
                onExistingCountChange?.(data.total || 0);
            })
            .catch(() => {
                if (!active) return;
                setSavedImages([]);
                onExistingCountChange?.(0);
            });
        return () => {
            active = false;
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [caseId, onExistingCountChange]);

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
            <Title level={4}>Step A: Upload Aerial Imagery — Case {caseId}</Title>

            <div {...getRootProps()} className = {`dropzone-area ${isDragActive ? `active` : ''}`}>
                <input {...getInputProps()} />
                <InboxOutlined className = "dropzone-icon" />
                <p>Drag and Drop Drone JPEGs her, or click to select files</p>
            </div>

            <div className = "thimnail-grid">
                {savedImages.map((image) => image.preview ? (
                    <img
                        key={image.id}
                        src={image.preview}
                        alt={image.originalFileName}
                        className="thumbnail-image"
                    />
                ) : null)}
                {images.map((file) => (
                    <img
                        key = {file.name}
                        src = {file.preview}
                        alt = "preview"
                        className = "thumbnail-image"
                    />  
                ))}
            </div>
            {savedImages.length > 0 ? (
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {savedImages.length} image{savedImages.length === 1 ? '' : 's'} already saved for this case.
                </Text>
            ) : null}
            <Text type = 'secondary'>New images ready to upload: {images.length}</Text>
        </Card>
    );
}
