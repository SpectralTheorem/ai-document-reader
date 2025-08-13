'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, Database, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsedDocument } from '@/types/document';

interface DocumentUploaderProps {
  onDocumentUploaded: (document: ParsedDocument, fileName: string) => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'completed';
}

export function DocumentUploader({ onDocumentUploaded }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const initializeSteps = (fileName: string) => {
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const steps: ProcessingStep[] = [
      {
        id: 'upload',
        label: 'Uploading file to server',
        icon: 'upload',
        status: 'active'
      },
      {
        id: 'validate',
        label: `Validating ${fileExt?.toUpperCase()} format`,
        icon: 'check-circle',
        status: 'pending'
      },
      {
        id: 'extract',
        label: 'Extracting document structure',
        icon: 'database',
        status: 'pending'
      },
      {
        id: 'parse',
        label: 'Parsing chapters and metadata',
        icon: 'book-open',
        status: 'pending'
      },
      {
        id: 'ready',
        label: 'Preparing reader interface',
        icon: 'check-circle',
        status: 'pending'
      }
    ];
    setProcessingSteps(steps);
    setCurrentStepIndex(0);
  };

  useEffect(() => {
    if (isUploading && processingSteps.length > 0 && currentStepIndex < processingSteps.length) {
      const timer = setTimeout(() => {
        setProcessingSteps(prev => {
          const updated = [...prev];
          if (currentStepIndex < updated.length) {
            updated[currentStepIndex].status = 'completed';
            if (currentStepIndex + 1 < updated.length) {
              updated[currentStepIndex + 1].status = 'active';
            }
          }
          return updated;
        });
        setCurrentStepIndex(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isUploading, currentStepIndex, processingSteps.length]);

  const handleFile = async (file: File) => {
    setError('');
    setIsUploading(true);
    initializeSteps(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Upload response:', data); // Debug log

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (!data.document) {
        throw new Error('No document data received from server');
      }

      // Mark all steps as completed
      setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
      
      // Small delay to show final state
      setTimeout(() => {
        console.log('Calling onDocumentUploaded with:', JSON.stringify(data.document, null, 2), data.fileName); // Debug log
        onDocumentUploaded(data.document, data.fileName);
      }, 500);
    } catch (err: any) {
      console.error('Upload error:', err); // Debug log
      setError(err.message || 'Failed to upload file');
      setIsUploading(false);
      setProcessingSteps([]);
    }
  };

  const renderIcon = (iconName: string, className: string = "h-5 w-5") => {
    switch (iconName) {
      case 'upload':
        return <Upload className={className} />;
      case 'check-circle':
        return <CheckCircle className={className} />;
      case 'database':
        return <Database className={className} />;
      case 'book-open':
        return <BookOpen className={className} />;
      case 'clock':
        return <Clock className={className} />;
      default:
        return <Clock className={className} />;
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">AI Document Reader</h1>
        <p className="text-gray-600">Upload EPUB or PDF files to read and interact with AI</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex flex-col items-center space-y-4">
          {isUploading ? (
            <div className="w-full max-w-md">
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 transition-all duration-300 ${
                      step.status === 'completed' ? 'opacity-100' : 
                      step.status === 'active' ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${
                      step.status === 'completed' ? 'text-green-500' :
                      step.status === 'active' ? 'text-blue-500' : 'text-gray-400'
                    }`}>
                      {step.status === 'completed' ? (
                        renderIcon('check-circle', 'h-5 w-5')
                      ) : step.status === 'active' ? (
                        <div className="relative">
                          {renderIcon(step.icon, 'h-5 w-5')}
                          <div className="absolute inset-0 animate-ping">
                            {renderIcon(step.icon, 'h-5 w-5')}
                          </div>
                        </div>
                      ) : (
                        renderIcon('clock', 'h-5 w-5')
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${
                        step.status === 'active' ? 'font-medium text-gray-900' : 'text-gray-600'
                      }`}>
                        {step.label}
                        {step.status === 'active' && (
                          <span className="ml-2 inline-block">
                            <span className="animate-pulse">...</span>
                          </span>
                        )}
                      </p>
                      {step.status === 'active' && (
                        <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full animate-progress" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium">Drop your document here</p>
                <p className="text-sm text-gray-500 mt-1">EPUB files supported (PDF coming soon)</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">or</span>
                <label htmlFor="file-upload">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".epub"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button type="button" variant="outline" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <FileText className="h-8 w-8 text-blue-500 mb-2" />
          <h3 className="font-semibold mb-1">EPUB Support</h3>
          <p className="text-sm text-gray-600">Full chapter navigation and text extraction</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg opacity-50">
          <FileText className="h-8 w-8 text-gray-400 mb-2" />
          <h3 className="font-semibold mb-1">PDF Support</h3>
          <p className="text-sm text-gray-600">Coming soon with smart section detection</p>
        </div>
      </div>
    </div>
  );
}