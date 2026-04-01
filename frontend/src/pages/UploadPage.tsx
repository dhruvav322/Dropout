import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FileUploader from '../components/FileUploader';
import { uploadCSV } from '../services/api';
import './UploadPage.css';

type Step = 'idle' | 'uploading' | 'analyzing' | 'scoring' | 'done' | 'error';

const STEPS = [
  { key: 'uploading', icon: 'cloud_upload', label: 'Uploading dataset' },
  { key: 'analyzing', icon: 'psychology', label: 'Running ML analysis' },
  { key: 'scoring', icon: 'assessment', label: 'Computing risk scores' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [institution, setInstitution] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('idle');
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) return;

    setError('');
    setCurrentStep('uploading');

    try {
      // Simulate step progression for visual effect
      await new Promise(r => setTimeout(r, 800));
      setCurrentStep('analyzing');
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep('scoring');

      const result = await uploadCSV(file, institution || 'My Institution');

      setCurrentStep('done');
      await new Promise(r => setTimeout(r, 500));

      navigate(`/?report_id=${result.report_id}`);
    } catch (e: unknown) {
      setCurrentStep('error');
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  function stepStatus(stepKey: string): string {
    const order = ['uploading', 'analyzing', 'scoring', 'done'];
    const currentIdx = order.indexOf(currentStep);
    const stepIdx = order.indexOf(stepKey);

    if (currentStep === 'idle' || currentStep === 'error') return 'pending';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  }

  return (
    <motion.div
      className="upload-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      id="upload-page"
    >
      <header className="page-header">
        <h1>Ingest Student Data</h1>
        <p className="text-muted" style={{ maxWidth: 700 }}>
          Upload your institutional CSV records to begin the predictive retention analysis.
          We support standard educational data formats.
        </p>
      </header>

      {/* Institutional Context */}
      <motion.section
        className="card upload-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="upload-section__header">
          <span className="material-symbols-outlined" style={{ padding: 8, background: 'var(--surface-container-high)', borderRadius: 8 }}>
            corporate_fare
          </span>
          <div>
            <h3>Institutional Context</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Identify the university source for this dataset</p>
          </div>
        </div>
        <div style={{ padding: '0 var(--spacing-8) var(--spacing-8)' }}>
          <label className="label-xs" style={{ display: 'block', marginBottom: 8 }}>Institution Name</label>
          <input
            className="input-field"
            type="text"
            placeholder="Institution Name"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            id="institution-input"
          />
        </div>
      </motion.section>

      {/* Data Import */}
      <motion.section
        className="card upload-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="upload-section__header">
          <span className="material-symbols-outlined" style={{ padding: 8, background: 'var(--surface-container-high)', borderRadius: 8 }}>
            table_chart
          </span>
          <div>
            <h3>Data Import</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Drag and drop or browse for a CSV file</p>
          </div>
        </div>
        <div style={{ padding: '0 var(--spacing-8) var(--spacing-8)' }}>
          <FileUploader onFileSelected={setFile} />
        </div>
      </motion.section>

      {/* Processing Steps */}
      {currentStep !== 'idle' && (
        <motion.div
          className="card"
          style={{ padding: 'var(--spacing-6) var(--spacing-8)', marginTop: 'var(--spacing-4)' }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          {STEPS.map(step => (
            <div key={step.key} className={`processing-step processing-step--${stepStatus(step.key)}`}>
              <div className="step-icon">
                {stepStatus(step.key) === 'done' ? (
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>check</span>
                ) : stepStatus(step.key) === 'active' ? (
                  <span className="material-symbols-outlined spinner" style={{ fontSize: 16 }}>progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>circle</span>
                )}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{step.label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {error && (
        <p style={{ color: 'var(--error)', marginTop: 'var(--spacing-4)', fontSize: '0.875rem' }}>{error}</p>
      )}

      {/* Submit Button */}
      <motion.div
        className="upload-submit"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          className="btn btn-primary upload-submit__btn"
          disabled={!file || (currentStep !== 'idle' && currentStep !== 'error')}
          onClick={handleUpload}
          id="process-btn"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
          Process & Generate Report
        </button>
        <p className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified_user</span>
          Secure processing. All data is encrypted and anonymized before analysis.
        </p>
      </motion.div>
    </motion.div>
  );
}
