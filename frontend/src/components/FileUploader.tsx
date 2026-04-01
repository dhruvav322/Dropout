import { useState, useRef, type DragEvent } from 'react';
import { motion } from 'framer-motion';
import './FileUploader.css';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
}

export default function FileUploader({ onFileSelected }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  return (
    <motion.div
      className={`drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'drop-zone--selected' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      id="file-drop-zone"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-input"
      />

      {selectedFile ? (
        <div className="drop-zone__selected">
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--secondary)' }}>
            check_circle
          </span>
          <p className="drop-zone__filename">{selectedFile.name}</p>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      ) : (
        <>
          <div className="drop-zone__icon-wrap">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
              upload_file
            </span>
          </div>
          <p className="drop-zone__title">Drop your dataset here</p>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            Accepts .CSV, .XLSX files up to 50MB
          </p>
          <button className="btn btn-primary drop-zone__btn" type="button">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>folder_open</span>
            Select CSV File
          </button>
        </>
      )}
    </motion.div>
  );
}
