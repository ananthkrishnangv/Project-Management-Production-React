import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    ArrowUploadRegular,
    PeopleRegular,
    FolderRegular,
    ArrowDownloadRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    DocumentTableRegular,
    InfoRegular,
} from '@fluentui/react-icons';

interface ImportResult {
    message: string;
    imported: number;
    skipped: number;
    errors: string[];
}

export default function BulkImportPage() {
    const { accessToken } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setResult(null);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const downloadTemplate = async () => {
        try {
            const res = await fetch(`/api/import/template/${activeTab}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeTab}_import_template.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to download template:', error);
        }
    };

    const exportData = async () => {
        try {
            const res = await fetch(`/api/import/export/${activeTab}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeTab}_export.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export data:', error);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/import/${activeTab}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: formData,
            });

            const data = await res.json();
            setResult(data);
            if (res.ok) {
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (error: any) {
            setResult({
                message: 'Upload failed',
                imported: 0,
                skipped: 0,
                errors: [error.message || 'Unknown error'],
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-secondary-900">
                        Bulk Import & Export
                    </h1>
                    <p className="text-secondary-500 mt-1">
                        Import users and projects from CSV/Excel files
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-secondary-200 w-fit">
                <button
                    onClick={() => { setActiveTab('users'); setFile(null); setResult(null); }}
                    className={`px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-primary-500 text-white shadow-md' : 'text-secondary-600 hover:bg-secondary-100'
                        }`}
                >
                    <PeopleRegular className="w-5 h-5" />
                    Users
                </button>
                <button
                    onClick={() => { setActiveTab('projects'); setFile(null); setResult(null); }}
                    className={`px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'projects' ? 'bg-primary-500 text-white shadow-md' : 'text-secondary-600 hover:bg-secondary-100'
                        }`}
                >
                    <FolderRegular className="w-5 h-5" />
                    Projects
                </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Section */}
                <div className="lg:col-span-2 premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                        <ArrowUploadRegular className="w-5 h-5" />
                        Import {activeTab === 'users' ? 'Users' : 'Projects'}
                    </h3>

                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${dragOver
                                ? 'border-primary-500 bg-primary-50'
                                : file
                                    ? 'border-success-500 bg-success-50'
                                    : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50/50'
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center gap-4">
                            {file ? (
                                <>
                                    <DocumentTableRegular className="w-16 h-16 text-success-500" />
                                    <div>
                                        <p className="font-semibold text-secondary-900">{file.name}</p>
                                        <p className="text-sm text-secondary-500">
                                            {(file.size / 1024).toFixed(1)} KB • Ready to upload
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ArrowUploadRegular className="w-16 h-16 text-secondary-400" />
                                    <div>
                                        <p className="font-semibold text-secondary-900">
                                            Drag & drop your file here
                                        </p>
                                        <p className="text-sm text-secondary-500">
                                            or click to browse • CSV, XLSX, XLS supported
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Upload Button */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => { setFile(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="btn-secondary"
                            disabled={!file || uploading}
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleUpload}
                            className="btn-primary flex items-center gap-2"
                            disabled={!file || uploading}
                        >
                            {uploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <ArrowUploadRegular className="w-5 h-5" />
                                    Upload & Import
                                </>
                            )}
                        </button>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`mt-6 rounded-xl p-4 ${result.imported > 0 && result.errors.length === 0
                                ? 'bg-success-50 border border-success-200'
                                : result.errors.length > 0
                                    ? 'bg-warning-50 border border-warning-200'
                                    : 'bg-danger-50 border border-danger-200'
                            }`}>
                            <div className="flex items-start gap-3">
                                {result.imported > 0 ? (
                                    <CheckmarkCircleRegular className="w-6 h-6 text-success-600 flex-shrink-0" />
                                ) : (
                                    <DismissCircleRegular className="w-6 h-6 text-danger-600 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className="font-semibold text-secondary-900">{result.message}</p>
                                    <div className="flex gap-6 mt-2 text-sm">
                                        <span className="text-success-600">✓ Imported: {result.imported}</span>
                                        <span className="text-warning-600">⚠ Skipped: {result.skipped}</span>
                                    </div>
                                    {result.errors.length > 0 && (
                                        <details className="mt-3">
                                            <summary className="text-sm text-secondary-600 cursor-pointer hover:text-secondary-800">
                                                View {result.errors.length} errors
                                            </summary>
                                            <ul className="mt-2 text-sm text-danger-600 space-y-1 max-h-40 overflow-y-auto">
                                                {result.errors.slice(0, 20).map((err, i) => (
                                                    <li key={i}>• {err}</li>
                                                ))}
                                                {result.errors.length > 20 && (
                                                    <li className="text-secondary-500">... and {result.errors.length - 20} more</li>
                                                )}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Template Download */}
                    <div className="premium-card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                            Download Template
                        </h3>
                        <p className="text-sm text-secondary-500 mb-4">
                            Download a CSV template with the correct format for importing {activeTab}.
                        </p>
                        <button onClick={downloadTemplate} className="w-full btn-secondary flex items-center justify-center gap-2">
                            <ArrowDownloadRegular className="w-5 h-5" />
                            Download Template
                        </button>
                    </div>

                    {/* Export Data */}
                    <div className="premium-card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                            Export Data
                        </h3>
                        <p className="text-sm text-secondary-500 mb-4">
                            Export all existing {activeTab} to a CSV file.
                        </p>
                        <button onClick={exportData} className="w-full btn-secondary flex items-center justify-center gap-2">
                            <ArrowDownloadRegular className="w-5 h-5" />
                            Export {activeTab === 'users' ? 'Users' : 'Projects'}
                        </button>
                    </div>

                    {/* Help */}
                    <div className="premium-card p-6 bg-gradient-to-br from-primary-50 to-accent-50 border-primary-200">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                            <InfoRegular className="w-5 h-5 text-primary-500" />
                            Import Guidelines
                        </h3>
                        <ul className="text-sm text-secondary-600 space-y-2">
                            {activeTab === 'users' ? (
                                <>
                                    <li>• Required fields: email, first_name, last_name</li>
                                    <li>• Optional: designation, phone</li>
                                    <li>• Role is auto-assigned based on designation</li>
                                    <li>• Default password: SERC@2025!</li>
                                    <li>• Duplicate emails will be skipped</li>
                                </>
                            ) : (
                                <>
                                    <li>• Required fields: title</li>
                                    <li>• Optional: code, description, category</li>
                                    <li>• Categories: GAP, CNP, OLP, EFP</li>
                                    <li>• Status: ACTIVE, COMPLETED, ON_HOLD</li>
                                    <li>• Project codes are auto-generated if blank</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
