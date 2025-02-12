import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import axios from 'axios';
import { Button, Grid2 } from '@mui/material';

function ImageUploadCrop(props) {
    const { clubId, handleClose, image, setImage, crop, setCrop, croppedAreaPixels, setCroppedAreaPixels, croppedImage, setCroppedImage } = props
    
    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const getCroppedImg = useCallback(async (imageSrc, pixelCrop, rotation = 0) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const maxSize = Math.max(pixelCrop.width, pixelCrop.height);
        const scaleX = pixelCrop.width / image.width;
        const scaleY = pixelCrop.height / image.height;
        const scale = Math.max(scaleX, scaleY);
        canvas.width = maxSize;
        canvas.height = maxSize;

        ctx.translate(maxSize / 2, maxSize / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(scale, scale);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        return new Promise((resolve) => {
            canvas.toBlob(blob => {
                if (!blob) return;
                blob.name = 'croppedImage.jpeg'
                resolve(blob)
            }, 'image/jpeg');
        });
    }, []);

    const onSelectFile = (e) => {

        const file = e.target.files[0];
        if (file) {
            const fileName = file.name;
            const fileType = file.type;
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    
            if (!allowedTypes.includes(fileType)) {
                console.error("Invalid file type. Please select a JPG, JPEG or PNG image.");
                return;
            }
    
            // ... rest of your upload logic ...
        
            if (e.target.files && e.target.files.length > 0) {
                const reader = new FileReader();
                reader.addEventListener('load', () => {
                    setImage(reader.result);
                });
                reader.readAsDataURL(e.target.files[0]);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const croppedImg = await getCroppedImg(image, croppedAreaPixels);
        const formData = new FormData();
        formData.append('logo', image);
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'multipart/form-data',
            accept: 'application/json',
        };
        await axios.patch(`http://127.0.0.1:8000/club/${clubId}/logo/`, formData, 
            {headers},
        )
        handleClose();
    };

    return (
        
        <form onSubmit={handleSubmit}>
            <input type="file" onChange={(e)=>onSelectFile(e)} accept="image/jpeg,image/png,image/gif"/>
            {image && (
                <>
                <div style={{ width: '500px', height: '500px' }}>
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={1}
                            aspect={1 / 1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                        />
                </div>
                <Button color="secondary" variant="contained" type="submit">Update</Button>
                </>
            )}
        </form>
    );
}


export default ImageUploadCrop;