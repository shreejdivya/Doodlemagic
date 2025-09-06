
import React, { useState, useCallback, useEffect } from 'react';
import { UploadIcon } from './IconComponents';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    file: File | null;
    accept?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, file, accept = "image/*" }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, [file]);

    const handleFileChange = useCallback((files: FileList | null) => {
        onFileSelect(files && files[0] ? files[0] : null);
    }, [onFileSelect]);

    const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, [handleFileChange]);


    return (
        <div 
            className={`w-full max-w-lg mx-auto p-4 border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400'}`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <label htmlFor="file-upload" className="cursor-pointer">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain rounded-lg" />
                ) : (
                    <div className="text-center p-8">
                        <UploadIcon />
                        <p className="mt-2 text-sm text-gray-600">
                            <span className="font-semibold text-violet-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                )}
            </label>
            <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept={accept}
                onChange={(e) => handleFileChange(e.target.files)}
                onClick={(e) => ((e.target as HTMLInputElement).value = '')}
            />
        </div>
    );
};

export default FileUpload;
