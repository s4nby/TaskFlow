import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ProjectNamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const ProjectNamingModal: React.FC<ProjectNamingModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setName('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name);
    } else {
      setError(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-add-flyout glass-effect modal-sm" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>
        <div className="flyout-header">
          <h3>Initialize Workspace</h3>
          <span className="flyout-date">Define your new project scope</span>
        </div>
        <form onSubmit={handleSubmit}>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Project Name (e.g. Q1 Marketing)" 
            value={name} 
            onChange={handleChange} 
            className={`flyout-input themed-field ${error ? 'error-field' : ''}`} 
          />
          {error && <div className="error-text">Project name is required</div>}
          <div className="flyout-actions centered">
            <button type="submit" className="btn-submit themed-primary-btn full-width">Initialize Project</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectNamingModal;
