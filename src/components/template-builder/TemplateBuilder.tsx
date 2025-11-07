'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { CertificateTemplate, TextField, QRCodeField, FieldType } from '@/types/template';
import { saveTemplate, getCurrentTemplate } from '@/lib/template-storage';
import { Upload, Plus, Trash2, Download, Save, Image as ImageIcon, Type, QrCode, ChevronDown, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

// Utility function to transform text case
const transformTextCase = (text: string, textCase?: 'uppercase' | 'lowercase' | 'titlecase' | 'none'): string => {
    if (!textCase || textCase === 'none') return text;
    switch (textCase) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'titlecase':
            return text.replace(/\w\S*/g, (txt) =>
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        default:
            return text;
    }
};

// Constants for field limits
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 72;
const DEFAULT_FONT_SIZE = 24;
const QR_CODE_SIZE_MIN = 50;
const QR_CODE_SIZE_MAX = 800;
const DEFAULT_QR_CODE_SIZE = 200;

export default function TemplateBuilder() {
    const [template, setTemplate] = useState<CertificateTemplate | null>(null);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const current = getCurrentTemplate();
        if (current) {
            setTemplate(current);
            setTemplateName(current.name);
            loadImage(current.imageData);
        }
    }, []);

    useEffect(() => {
        if (template && canvasRef.current) {
            drawCanvas();
        }
    }, [template]);

    const loadImage = (imageData: string) => {
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            if (canvasRef.current) {
                drawCanvas();
            }
        };
        img.src = imageData;
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                // Automatically detect image dimensions
                const width = img.width;
                const height = img.height;

                imageRef.current = img;

                const newTemplate: CertificateTemplate = {
                    id: template?.id || `template-${Date.now()}`,
                    name: templateName || 'New Template',
                    imageData,
                    width: width,
                    height: height,
                    textFields: template?.textFields || [],
                    qrCodeField: template?.qrCodeField,
                    createdAt: template?.createdAt || Date.now(),
                };

                setTemplate(newTemplate);
                drawCanvas();
            };
            img.src = imageData;
        };
        reader.readAsDataURL(file);
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !template) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = template.width;
        canvas.height = template.height;

        // Draw background image
        if (imageRef.current) {
            ctx.drawImage(imageRef.current, 0, 0, template.width, template.height);
        } else {
            // Draw white background if no image
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, template.width, template.height);
        }

        // Draw text fields with visible boxes
        if (template?.textFields) {
            template.textFields.forEach((field) => {
                ctx.font = `${field.fontSize}px ${field.fontFamily}`;
                ctx.textAlign = field.alignment;
                ctx.textBaseline = 'top';

                let sampleText = getSampleText(field.type);
                sampleText = transformTextCase(sampleText, field.textCase);

                // Handle text width constraint
                let displayText = sampleText;
                if (field.width && field.width > 0) {
                    const metrics = ctx.measureText(sampleText);
                    if (metrics.width > field.width) {
                        // Truncate text to fit width
                        let truncated = '';
                        for (let i = 0; i < sampleText.length; i++) {
                            const testText = truncated + sampleText[i] + '...';
                            const testMetrics = ctx.measureText(testText);
                            if (testMetrics.width > field.width) {
                                break;
                            }
                            truncated += sampleText[i];
                        }
                        displayText = truncated + '...';
                    }
                }

                const metrics = ctx.measureText(displayText);

                // Calculate box dimensions based on alignment
                let boxX = field.x;
                let boxWidth = field.width && field.width > 0 ? field.width : metrics.width;

                if (field.alignment === 'center') {
                    boxX = field.x - boxWidth / 2;
                } else if (field.alignment === 'right') {
                    boxX = field.x - boxWidth;
                }

                const boxY = field.y;
                const boxHeight = field.fontSize;

                // Draw semi-transparent background
                ctx.fillStyle = selectedField === field.id
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(boxX - 8, boxY - 8, boxWidth + 16, boxHeight + 16);

                // Draw border
                ctx.strokeStyle = selectedField === field.id ? '#3b82f6' : '#6b7280';
                ctx.lineWidth = selectedField === field.id ? 3 : 2;
                ctx.setLineDash(selectedField === field.id ? [5, 5] : [3, 3]);
                ctx.strokeRect(boxX - 8, boxY - 8, boxWidth + 16, boxHeight + 16);
                ctx.setLineDash([]);

                // Draw text
                ctx.fillStyle = field.color;
                ctx.fillText(displayText, field.x, field.y);

                // Draw field label
                ctx.fillStyle = selectedField === field.id ? '#3b82f6' : '#6b7280';
                ctx.font = '10px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(field.label || `${field.type.toUpperCase()}`, boxX - 8, boxY - 12);
            });
        }

        // Draw QR code placeholder with visible box
        if (template?.qrCodeField) {
            const qr = template.qrCodeField;

            // Draw semi-transparent background
            ctx.fillStyle = selectedField === qr.id
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(16, 185, 129, 0.1)';
            ctx.fillRect(qr.x - 5, qr.y - 5, qr.size + 10, qr.size + 10);

            // Draw border
            ctx.strokeStyle = selectedField === qr.id ? '#10b981' : '#059669';
            ctx.lineWidth = selectedField === qr.id ? 3 : 2;
            ctx.setLineDash(selectedField === qr.id ? [5, 5] : [3, 3]);
            ctx.strokeRect(qr.x - 5, qr.y - 5, qr.size + 10, qr.size + 10);
            ctx.setLineDash([]);

            // Draw QR code label
            ctx.fillStyle = selectedField === qr.id ? '#10b981' : '#059669';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('QR CODE', qr.x + qr.size / 2, qr.y + qr.size / 2);
        }
    };

    const getSampleText = (type: FieldType): string => {
        switch (type) {
            case 'name':
                return 'John Doe';
            default:
                return 'Sample Text';
        }
    };

    const addTextField = (type: FieldType) => {
        if (!template) return;

        // Count existing fields of this type to generate a label
        const existingFieldsOfType = template.textFields.filter(f => f.type === type);
        const fieldNumber = existingFieldsOfType.length + 1;
        const defaultLabel = fieldNumber === 1 ? 'Name' : `Name ${fieldNumber}`;

        const newField: TextField = {
            id: `field-${Date.now()}-${Math.random()}`,
            type,
            x: template.width / 2,
            y: template.height / 2,
            fontSize: DEFAULT_FONT_SIZE,
            fontFamily: 'Arial',
            color: '#000000',
            alignment: 'center',
            textCase: 'none',
            label: defaultLabel,
        };

        setTemplate({
            ...template,
            textFields: [...template.textFields, newField],
        });
        setSelectedField(newField.id);
    };

    const addQRCodeField = () => {
        if (!template) return;

        const newQRField: QRCodeField = {
            id: `qr-${Date.now()}`,
            x: template.width - 100,
            y: template.height - 100,
            size: DEFAULT_QR_CODE_SIZE,
        };

        setTemplate({
            ...template,
            qrCodeField: newQRField,
        });
        setSelectedField(newQRField.id);
    };

    const removeField = (id: string) => {
        if (!template) return;

        if (template.qrCodeField?.id === id) {
            setTemplate({
                ...template,
                qrCodeField: undefined,
            });
        } else {
            setTemplate({
                ...template,
                textFields: template.textFields.filter(f => f.id !== id),
            });
        }
        setSelectedField(null);
    };

    const updateField = (fieldId: string, updates: Partial<TextField>) => {
        if (!template) return;

        setTemplate({
            ...template,
            textFields: template.textFields.map(f =>
                f.id === fieldId ? { ...f, ...updates } : f
            ),
        });
    };

    const updateQRCodeField = (updates: Partial<QRCodeField>) => {
        if (!template || !template.qrCodeField) return;

        setTemplate({
            ...template,
            qrCodeField: { ...template.qrCodeField, ...updates },
        });
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !template) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Check if clicked on a field
        let clickedField: string | null = null;

        // Check text fields
        for (const field of template.textFields) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.font = `${field.fontSize}px ${field.fontFamily}`;
                const metrics = ctx.measureText(getSampleText(field.type));

                // Calculate box dimensions based on alignment
                let boxX = field.x;
                let boxWidth = metrics.width;

                if (field.alignment === 'center') {
                    boxX = field.x - metrics.width / 2;
                } else if (field.alignment === 'right') {
                    boxX = field.x - metrics.width;
                }

                if (
                    x >= boxX - 8 &&
                    x <= boxX + boxWidth + 8 &&
                    y >= field.y - 8 &&
                    y <= field.y + field.fontSize + 8
                ) {
                    clickedField = field.id;
                    break;
                }
            }
        }

        // Check QR code field
        if (template.qrCodeField) {
            const qr = template.qrCodeField;
            if (
                x >= qr.x &&
                x <= qr.x + qr.size &&
                y >= qr.y &&
                y <= qr.y + qr.size
            ) {
                clickedField = template.qrCodeField.id;
            }
        }

        setSelectedField(clickedField);

        // If no field clicked, update selected field position
        if (!clickedField && selectedField) {
            const field = template.textFields.find(f => f.id === selectedField);
            if (field) {
                updateField(selectedField, { x, y });
            } else if (template.qrCodeField?.id === selectedField) {
                updateQRCodeField({ x: x - template.qrCodeField.size / 2, y: y - template.qrCodeField.size / 2 });
            }
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !selectedField || !template) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width) - dragOffset.x;
        const y = (e.clientY - rect.top) * (canvas.height / rect.height) - dragOffset.y;

        const field = template.textFields.find(f => f.id === selectedField);
        if (field) {
            updateField(selectedField, { x, y });
        } else if (template.qrCodeField?.id === selectedField) {
            updateQRCodeField({ x, y });
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !template || !selectedField) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const field = template.textFields.find(f => f.id === selectedField);
        if (field) {
            setDragOffset({ x: x - field.x, y: y - field.y });
            setIsDragging(true);
        } else if (template.qrCodeField?.id === selectedField) {
            setDragOffset({ x: x - template.qrCodeField.x, y: y - template.qrCodeField.y });
            setIsDragging(true);
        }
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
    };

    const saveTemplateToStorage = () => {
        if (!template) return;

        const templateToSave: CertificateTemplate = {
            ...template,
            name: templateName || 'Untitled Template',
        };

        saveTemplate(templateToSave);
        setTemplate(templateToSave);
        alert('Template saved successfully!');
    };

    const generateSampleCSV = () => {
        if (!template) return;

        // Use field labels as headers, or fallback to 'name'
        const headers = template.textFields.length > 0
            ? template.textFields.map(field => field.label)
            : ['name'];

        // Generate sample data
        const rows = template.textFields.length > 0
            ? [
                template.textFields.map(() => 'John Doe'),
                template.textFields.map(() => 'Jane Smith'),
                template.textFields.map(() => 'Bob Johnson'),
            ]
            : [
                ['John Doe'],
                ['Jane Smith'],
                ['Bob Johnson'],
            ];

        const csv = Papa.unparse({
            fields: headers,
            data: rows,
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sample_certificate_data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b bg-card px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            <h2 className="text-xl font-semibold">Template Builder</h2>
                        </div>
                        <Button variant="outline" size="sm"  >
                            <Link href="/" className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Home
                            </Link>
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="w-48">
                                <Input
                                    id="template-name"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Enter template name"
                                    className="h-9"
                                />
                            </div>
                            <div className="w-64">
                                <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">

                        <Button onClick={saveTemplateToStorage} disabled={!template} size="sm">
                            <Save className="h-4 w-4 mr-2" />
                            Save Template
                        </Button>
                        <Button onClick={generateSampleCSV} variant="outline" size="sm" disabled={!template}>
                            <Download className="h-4 w-4 mr-2" />
                            Sample CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                    {template ? (
                        <div className="flex items-center justify-center min-h-full">
                            <div className="bg-white shadow-lg rounded-lg p-4 inline-block">
                                <canvas
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                    className="border-2 border-gray-300 cursor-crosshair shadow-md"
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Upload an image to get started</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Field Editor */}
                <div className="w-96 border-l bg-card overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Fields Editor</h3>
                            <DropdownMenu>
                                <DropdownMenuTrigger >
                                    <Button variant="outline" size="sm" disabled={!template}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Field
                                        <ChevronDown className="h-4 w-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => template && addTextField('name')}>
                                        <Type className="h-4 w-4 mr-2" />
                                        Add Name Field
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={addQRCodeField}>
                                        <QrCode className="h-4 w-4 mr-2" />
                                        Add QR Code Field
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Text Fields List */}
                        {template?.textFields.map((field) => (
                            <Card
                                key={field.id}
                                className={`cursor-pointer transition-all ${selectedField === field.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                    : 'border-gray-200'
                                    }`}
                                onClick={() => setSelectedField(field.id)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">{field.label || `${field.type} Field`}</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeField(field.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Field Label</Label>
                                        <Input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            className="h-8 text-sm"
                                            placeholder="e.g., English Name, Arabic Name"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Font Size: {field.fontSize}px</Label>
                                            <Input
                                                type="number"
                                                value={field.fontSize}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= FONT_SIZE_MIN && val <= FONT_SIZE_MAX) {
                                                        updateField(field.id, { fontSize: val });
                                                    }
                                                }}
                                                className="h-7 w-16 text-xs"
                                                min={FONT_SIZE_MIN}
                                                max={FONT_SIZE_MAX}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <Slider
                                            value={[field.fontSize]}
                                            onValueChange={([value]) => updateField(field.id, { fontSize: value })}
                                            min={FONT_SIZE_MIN}
                                            max={FONT_SIZE_MAX}
                                            step={1}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">X: {Math.round(field.x)}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(field.x)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 0 && val <= template.width) {
                                                            updateField(field.id, { x: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={0}
                                                    max={template.width}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[field.x]}
                                                onValueChange={([value]) => updateField(field.id, { x: value })}
                                                min={0}
                                                max={template.width}
                                                step={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Y: {Math.round(field.y)}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(field.y)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 0 && val <= template.height) {
                                                            updateField(field.id, { y: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={0}
                                                    max={template.height}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[field.y]}
                                                onValueChange={([value]) => updateField(field.id, { y: value })}
                                                min={0}
                                                max={template.height}
                                                step={1}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Text Case</Label>
                                        <div className="flex gap-1">
                                            {(['none', 'uppercase', 'lowercase', 'titlecase'] as const).map((caseType) => (
                                                <Button
                                                    key={caseType}
                                                    variant={field.textCase === caseType ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="flex-1 h-7 text-xs capitalize"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateField(field.id, { textCase: caseType });
                                                    }}
                                                >
                                                    {caseType === 'none' ? 'None' : caseType}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Text Width: {field.width ? Math.round(field.width) + 'px' : 'Auto'}</Label>
                                            <Input
                                                type="number"
                                                value={field.width || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                    if (val === undefined || (val >= 50 && val <= template.width)) {
                                                        updateField(field.id, { width: val });
                                                    }
                                                }}
                                                className="h-7 w-20 text-xs"
                                                min={50}
                                                max={template.width}
                                                placeholder="Auto"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <Slider
                                            value={field.width ? [field.width] : [template.width]}
                                            onValueChange={([value]) => updateField(field.id, { width: value })}
                                            min={50}
                                            max={template.width}
                                            step={10}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Alignment</Label>
                                        <div className="flex gap-1">
                                            {(['left', 'center', 'right'] as const).map((align) => (
                                                <Button
                                                    key={align}
                                                    variant={field.alignment === align ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="flex-1 h-7 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateField(field.id, { alignment: align });
                                                    }}
                                                >
                                                    {align}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Color</Label>
                                        <Input
                                            type="color"
                                            value={field.color}
                                            onChange={(e) => updateField(field.id, { color: e.target.value })}
                                            className="h-8 w-full"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* QR Code Field */}
                        {template?.qrCodeField && (
                            <Card
                                className={`cursor-pointer transition-all ${selectedField === template.qrCodeField.id
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                    : 'border-gray-200'
                                    }`}
                                onClick={() => setSelectedField(template.qrCodeField!.id)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <QrCode className="h-4 w-4" />
                                            QR Code Field
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeField(template.qrCodeField!.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Size: {template.qrCodeField.size}px</Label>
                                            <Input
                                                type="number"
                                                value={template.qrCodeField.size}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= QR_CODE_SIZE_MIN && val <= QR_CODE_SIZE_MAX) {
                                                        updateQRCodeField({ size: val });
                                                    }
                                                }}
                                                className="h-7 w-16 text-xs"
                                                min={QR_CODE_SIZE_MIN}
                                                max={QR_CODE_SIZE_MAX}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <Slider
                                            value={[template.qrCodeField.size]}
                                            onValueChange={([value]) => updateQRCodeField({ size: value })}
                                            min={QR_CODE_SIZE_MIN}
                                            max={QR_CODE_SIZE_MAX}
                                            step={5}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">X: {Math.round(template.qrCodeField.x)}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(template.qrCodeField.x)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 0 && val <= template.width) {
                                                            updateQRCodeField({ x: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={0}
                                                    max={template.width}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[template.qrCodeField.x]}
                                                onValueChange={([value]) => updateQRCodeField({ x: value })}
                                                min={0}
                                                max={template.width}
                                                step={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Y: {Math.round(template.qrCodeField.y)}</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.round(template.qrCodeField.y)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val >= 0 && val <= template.height) {
                                                            updateQRCodeField({ y: val });
                                                        }
                                                    }}
                                                    className="h-7 w-20 text-xs"
                                                    min={0}
                                                    max={template.height}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Slider
                                                value={[template.qrCodeField.y]}
                                                onValueChange={([value]) => updateQRCodeField({ y: value })}
                                                min={0}
                                                max={template.height}
                                                step={1}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {(!template || (template.textFields.length === 0 && !template.qrCodeField)) && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No fields added yet. Use the buttons above to add fields.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

