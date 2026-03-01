import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Info, AlertCircle, User, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Category } from '../types';

export default function UploadForm({
    categories,
    initialCategoryId,
    discordName,
    onUpload,
    onClose
}: {
    categories: Category[];
    initialCategoryId: string;
    discordName: string;
    onUpload: (imageData: string, caption: string, discordName: string, playerName: string, categoryId: string) => Promise<void>;
    onClose: () => void;
}) {
    const [image, setImage] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
    const [formPlayerName, setFormPlayerName] = useState(localStorage.getItem('fivem_player_name') || '');
    const [isUploading, setIsUploading] = useState(false);
    const [resolution, setResolution] = useState<{ w: number; h: number } | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const img = new Image();
                img.onload = () => {
                    setResolution({ w: img.width, h: img.height });
                    setImage(dataUrl);
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
        multiple: false
    } as any);

    const handleSubmit = async () => {
        if (!image || !discordName || !formPlayerName || !selectedCategoryId) {
            toast.error('Please fill in all required fields');
            return;
        }
        // Enforce strict landscape orientation resolution. Minimum 1920 width, 1080 height.
        if (resolution && (resolution.w < 1920 || resolution.h < 1080)) {
            toast.error(`Resolution too low: ${resolution.w}x${resolution.h}. Minimum is 1920x1080.`);
            return;
        }

        localStorage.setItem('fivem_player_name', formPlayerName);
        setIsUploading(true);
        await onUpload(image, caption, discordName, formPlayerName, selectedCategoryId);
        setIsUploading(false);
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-fivem-orange/10 border border-fivem-orange/20 rounded-xl flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <Info className="text-fivem-orange shrink-0" size={18} />
                    <p className="text-xs text-fivem-orange/90 leading-relaxed">
                        We need your <strong>Discord Name</strong> and <strong>Character Name</strong> to securely verify your identity and easily distribute any contest rewards you might win!
                    </p>
                </div>
                <div className="flex items-start gap-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="text-red-400 shrink-0" size={14} />
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                        WARNING: You can only submit ONE photo across all categories. Choose wisely!
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Category (Required)</label>
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-sm outline-none focus:border-fivem-orange text-white appearance-none"
                    >
                        <option value="" disabled className="bg-fivem-dark text-white/50">Select a Category...</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id} className="bg-fivem-dark">{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Character Name (Required)</label>
                        <Input
                            type="text"
                            value={formPlayerName}
                            onChange={(e) => setFormPlayerName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="bg-white/5 border-white/10 h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Discord Account</label>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 h-10 rounded-md px-3 flex items-center text-emerald-400 font-mono text-sm">
                            <User size={14} className="mr-2" />
                            {discordName}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Photo (Min 1920x1080)</label>
                    <div
                        {...getRootProps()}
                        className={cn(
                            "aspect-[16/9] sm:aspect-video max-h-48 sm:max-h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                            isDragActive ? "border-fivem-orange bg-fivem-orange/5" : "border-white/10 hover:border-white/20 bg-white/5",
                            image && "border-none"
                        )}
                    >
                        <input {...getInputProps()} />
                        {image ? (
                            <>
                                <img src={image} className="w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <p className="text-xs font-bold uppercase tracking-widest">Click to change</p>
                                    {resolution && (
                                        <span className={cn(
                                            "text-[10px] px-2 py-1 rounded bg-black/60",
                                            (resolution.w < 1920 || resolution.h < 1080) ? "text-red-400" : "text-emerald-400"
                                        )}>
                                            {resolution.w}x{resolution.h}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white/5 p-4 rounded-full mb-4">
                                    <Upload className="text-white/40" size={32} />
                                </div>
                                <p className="text-sm font-medium">Drop your photo here</p>
                                <p className="text-xs text-white/30 mt-1">or click to browse files</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Caption (Optional)</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Describe your shot..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-fivem-orange transition-colors min-h-[100px] resize-none"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!image || !discordName || isUploading}
                    className="flex-1 h-12 bg-fivem-orange hover:bg-fivem-orange/90 text-white rounded-xl"
                >
                    {isUploading ? "Uploading..." : "Submit Entry"}
                </Button>
            </div>
        </div>
    );
}
