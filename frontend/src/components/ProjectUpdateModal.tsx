import { useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    DismissRegular,
    DocumentRegular,
    AttachRegular,
    ImageRegular,
    CheckmarkCircleRegular,
    AlertRegular,
} from '@fluentui/react-icons';

interface Project {
    id: string;
    code: string;
    title: string;
}

interface ProjectUpdateModalProps {
    project: Project;
    onClose: () => void;
    onSuccess: () => void;
}

const reportTypes = [
    { value: 'WEEKLY', label: 'Weekly Update' },
    { value: 'MONTHLY', label: 'Monthly Report' },
    { value: 'HALF_YEARLY', label: 'Half-Yearly Report' },
    { value: 'COMPLETION', label: 'Project Completion Report' },
    { value: 'PROGRESS', label: 'Progress Update' },
];

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ProjectUpdateModal({ project, onClose, onSuccess }: ProjectUpdateModalProps) {
    const { accessToken } = useAuthStore();
    const [reportType, setReportType] = useState('PROGRESS');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [images, setImages] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files!)]);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages(prevImages => [...prevImages, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('type', reportType);
            formData.append('title', title || `${reportTypes.find(r => r.value === reportType)?.label} - ${project.code}`);
            formData.append('content', content);
            if (periodStart) formData.append('periodStart', periodStart);
            if (periodEnd) formData.append('periodEnd', periodEnd);

            // Append files
            files.forEach(file => {
                formData.append('attachments', file);
            });
            images.forEach(image => {
                formData.append('attachments', image);
            });

            const response = await fetch(`${API_BASE}/reports/projects/${project.id}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to submit report');
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Simple rich text formatting with HTML
    const formatText = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-secondary-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-secondary-900">Submit Project Update</h2>
                        <p className="text-sm text-secondary-500 mt-1">{project.code} - {project.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-lg">
                        <DismissRegular className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm flex items-center gap-2">
                                <AlertRegular className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-success-700 text-sm flex items-center gap-2">
                                <CheckmarkCircleRegular className="w-5 h-5" />
                                Report submitted successfully!
                            </div>
                        )}

                        {/* Report Type */}
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Report Type *</label>
                            <select
                                value={reportType}
                                onChange={e => setReportType(e.target.value)}
                                className="input-premium"
                                required
                            >
                                {reportTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Report Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder={`${reportTypes.find(r => r.value === reportType)?.label} - ${project.code}`}
                                className="input-premium"
                            />
                        </div>

                        {/* Period */}
                        {['MONTHLY', 'HALF_YEARLY', 'WEEKLY'].includes(reportType) && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Period Start</label>
                                    <input
                                        type="date"
                                        value={periodStart}
                                        onChange={e => setPeriodStart(e.target.value)}
                                        className="input-premium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Period End</label>
                                    <input
                                        type="date"
                                        value={periodEnd}
                                        onChange={e => setPeriodEnd(e.target.value)}
                                        className="input-premium"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Rich Text Editor */}
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Report Content *</label>
                            {/* Toolbar */}
                            <div className="flex items-center gap-1 p-2 bg-secondary-50 border border-secondary-200 rounded-t-xl">
                                <button
                                    type="button"
                                    onClick={() => formatText('bold')}
                                    className="p-2 hover:bg-secondary-200 rounded font-bold"
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    onClick={() => formatText('italic')}
                                    className="p-2 hover:bg-secondary-200 rounded italic"
                                >
                                    I
                                </button>
                                <button
                                    type="button"
                                    onClick={() => formatText('underline')}
                                    className="p-2 hover:bg-secondary-200 rounded underline"
                                >
                                    U
                                </button>
                                <div className="w-px h-6 bg-secondary-300 mx-1" />
                                <button
                                    type="button"
                                    onClick={() => formatText('insertUnorderedList')}
                                    className="p-2 hover:bg-secondary-200 rounded text-sm"
                                >
                                    • List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => formatText('insertOrderedList')}
                                    className="p-2 hover:bg-secondary-200 rounded text-sm"
                                >
                                    1. List
                                </button>
                                <div className="w-px h-6 bg-secondary-300 mx-1" />
                                <select
                                    onChange={e => formatText('formatBlock', e.target.value)}
                                    className="p-1 text-sm bg-white rounded border"
                                >
                                    <option value="p">Normal</option>
                                    <option value="h2">Heading 1</option>
                                    <option value="h3">Heading 2</option>
                                    <option value="h4">Heading 3</option>
                                </select>
                            </div>
                            {/* Editor Area */}
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                onInput={e => setContent((e.target as HTMLDivElement).innerHTML)}
                                className="min-h-48 max-h-64 overflow-y-auto p-4 border border-t-0 border-secondary-200 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-primary-500 prose prose-sm max-w-none"
                                style={{ backgroundColor: 'white' }}
                            />
                        </div>

                        {/* File Attachments */}
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">Attachments</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <AttachRegular className="w-5 h-5" />
                                    Add Documents
                                </button>
                                <button
                                    type="button"
                                    onClick={() => imageInputRef.current?.click()}
                                    className="btn-ghost flex items-center gap-2"
                                >
                                    <ImageRegular className="w-5 h-5" />
                                    Add Images
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                multiple
                                className="hidden"
                            />
                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                multiple
                                className="hidden"
                            />

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm text-secondary-500">Documents:</p>
                                    {files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-secondary-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <DocumentRegular className="w-5 h-5 text-primary-600" />
                                                <span className="text-sm text-secondary-700">{file.name}</span>
                                                <span className="text-xs text-secondary-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                            <button type="button" onClick={() => removeFile(i)} className="p-1 hover:bg-secondary-200 rounded">
                                                <DismissRegular className="w-4 h-4 text-secondary-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Image Previews */}
                            {images.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm text-secondary-500">Images:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {images.map((image, i) => (
                                            <div key={i} className="relative">
                                                <img
                                                    src={URL.createObjectURL(image)}
                                                    alt=""
                                                    className="w-16 h-16 object-cover rounded-lg border border-secondary-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <DismissRegular className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info Note */}
                        {reportType === 'COMPLETION' && (
                            <div className="p-3 bg-info-50 border border-info-200 rounded-lg text-info-700 text-sm">
                                <AlertRegular className="w-4 h-4 inline mr-2" />
                                Completion reports require approval from Head, BKMD before final submission.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-secondary-100 flex justify-end gap-3 flex-shrink-0">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !content.trim()}
                            className="btn-primary"
                        >
                            {saving ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
