'use client';

import { useRef, useState } from 'react';
import styles from './UploadZone.module.css';

const ACCEPTED = '.xlsx,.xls,.docx,.pptx,.txt';

export default function UploadZone({
  onFileSelected,
  disabled,
  error
}: {
  onFileSelected: (file: File) => void;
  disabled: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  return (
    <div>
      <div
        className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        role="button"
        aria-disabled={disabled}
      >
        <div className={styles.dropzoneIcon}>⇪</div>
        <div className={styles.dropzoneTitle}>
          {disabled ? 'Processing your document…' : 'Drop a document here, or click to browse'}
        </div>
        <div className={styles.dropzoneSub}>
          Doc Analyzer will parse it and build the context needed to answer your questions.
        </div>
        <div className={styles.formatRow}>
          <span className={styles.formatChip}>XLSX</span>
          <span className={styles.formatChip}>DOCX</span>
          <span className={styles.formatChip}>PPTX</span>
          <span className={styles.formatChip}>TXT</span>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className={styles.hiddenInput}
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}
