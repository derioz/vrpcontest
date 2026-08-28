import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from './ui/toast';
import { ProgressBar } from './ui/progress';
import {
  Info,
  AlertCircle,
  User,
  Upload,
  CheckCircle,
  XCircle,
  Sparkles,
  Lock,
  RefreshCw,
  Trash2,
  Check,
  Tag,
  Trophy
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Category, Photo } from '../types';

interface UploadFormProps {
  categories: Category[];
  initialCategoryId: string;
  discordName: string;
  submissionsOpen?: boolean;
  onePhotoPerUser?: boolean;
  existingPhoto?: Photo | null;
  onDeleteExisting?: (photoId: string, discordName: string) => Promise<boolean>;
  onUpload: (imageData: string, caption: string, discordName: string, playerName: string, categoryId: string) => Promise<void>;
  onClose: () => void;
}

export default function UploadForm({
  categories,
  initialCategoryId,
  discordName,
  submissionsOpen = true,
  onePhotoPerUser = false,
  existingPhoto = null,
  onDeleteExisting,
  onUpload,
  onClose
}: UploadFormProps) {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId || (categories[0]?.id || ''));
  const [formPlayerName, setFormPlayerName] = useState(localStorage.getItem('fivem_player_name') || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedExistingId, setDeletedExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategoryId(initialCategoryId);
    }
  }, [initialCategoryId]);
  
  // Image Metadata & Validation States
  const [imageMeta, setImageMeta] = useState<{
    width: number;
    height: number;
    aspectRatio: string;
    fileSizeBytes: number;
    fileName: string;
  } | null>(null);

  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Selected Category details preview
  const selectedCategoryObj = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      toast.error('File rejected. Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const fileSizeBytes = file.size;
    const fileName = file.name;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const ratioNum = (w / h).toFixed(2);
        const aspectRatioStr = parseFloat(ratioNum) >= 1.7 ? '16:9 Landscape' : parseFloat(ratioNum) >= 2.1 ? '21:9 Ultrawide' : `${w}:${h}`;

        const meta = {
          width: w,
          height: h,
          aspectRatio: aspectRatioStr,
          fileSizeBytes,
          fileName
        };

        setImageMeta(meta);
        setImage(dataUrl);

        // Strict 1920x1080 resolution validation
        if (w < 1920 || h < 1080) {
          const errMsg = `Image resolution too low: ${w}x${h}. Contest rules require at least 1920x1080 (1080p Full HD). Please upload a higher resolution screenshot.`;
          setResolutionError(errMsg);
          toast.error(`Resolution Rejected (${w}x${h}): Minimum 1920x1080 required.`, {
            duration: 5000,
          });
        } else {
          setResolutionError(null);
          toast.success(`Image Accepted (${w}x${h} HD)`);
        }
      };

      img.onerror = () => {
        toast.error('Failed to parse image file. Please try another image.');
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    multiple: false
  } as any);

  const handleClearImage = () => {
    setImage(null);
    setImageMeta(null);
    setResolutionError(null);
  };

  const handleAppendPromptTag = (tag: string) => {
    if (caption.length + tag.length + 1 > 300) return;
    setCaption(prev => (prev ? `${prev} ${tag}` : tag));
  };

  const handleDeleteExistingPhoto = async () => {
    if (!existingPhoto || !onDeleteExisting) return;
    setIsDeleting(true);
    try {
      const photoId = existingPhoto.id;
      const success = await onDeleteExisting(photoId, existingPhoto.discord_name);
      if (success) {
        setDeletedExistingId(photoId);
        if (existingPhoto.player_name && !formPlayerName) {
          setFormPlayerName(existingPhoto.player_name);
        }
        if (existingPhoto.category_id) {
          setSelectedCategoryId(existingPhoto.category_id);
        }
        toast.success('Your previous entry was deleted. You can now submit a new photo!');
      }
    } catch (err) {
      console.error('Failed deleting existing photo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveExistingPhoto = Boolean(
    onePhotoPerUser && existingPhoto && existingPhoto.id !== deletedExistingId
  );

  const handleSubmit = async () => {
    if (!submissionsOpen) {
      toast.error('Submissions are currently closed for this contest.');
      return;
    }

    if (hasActiveExistingPhoto) {
      toast.error('Limit 1 photo per user enforced. Please delete your current photo first.');
      return;
    }

    if (!image) {
      toast.error('Please upload a screenshot for your submission.');
      return;
    }

    if (imageMeta && (imageMeta.width < 1920 || imageMeta.height < 1080)) {
      toast.error(`Cannot submit: Image resolution is ${imageMeta.width}x${imageMeta.height}. At least 1920x1080 is required.`);
      return;
    }

    if (!selectedCategoryId) {
      toast.error('Please select a category for your photo.');
      return;
    }

    if (!formPlayerName.trim()) {
      toast.error('Please enter your Character Name.');
      return;
    }

    localStorage.setItem('fivem_player_name', formPlayerName.trim());
    setIsUploading(true);
    try {
      await onUpload(image, caption.trim(), discordName, formPlayerName.trim(), selectedCategoryId);
      onClose();
    } catch (err: any) {
      console.error('Submission upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine submit button state & label
  const isResolutionValid = imageMeta ? (imageMeta.width >= 1920 && imageMeta.height >= 1080) : false;
  const isFormValid = image && isResolutionValid && selectedCategoryId && formPlayerName.trim() && submissionsOpen && !hasActiveExistingPhoto;

  return (
    <div className="space-y-5 text-white">
      {/* ── Submissions Closed Banner ── */}
      {!submissionsOpen && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center gap-3">
          <Lock className="text-red-400 shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Submissions Closed</p>
            <p className="text-[11px] text-white/60">The contest administrators have currently closed new entry submissions.</p>
          </div>
        </div>
      )}

      {/* ── 1 Photo Per User Reached View ── */}
      {hasActiveExistingPhoto && existingPhoto ? (
        <div className="p-5 bg-gradient-to-b from-amber-500/10 via-red-500/10 to-[#121218] border border-amber-500/30 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black font-display text-white uppercase tracking-wider">
                1 Entry Limit Active
              </h4>
              <p className="text-xs text-white/70 leading-relaxed mt-0.5">
                You have already submitted a photo to this contest. The <strong>1-photo-per-user</strong> rule is currently active.
              </p>
            </div>
          </div>

          {/* Existing Photo Preview Card */}
          <div className="relative rounded-2xl border border-white/15 bg-black/60 overflow-hidden p-3 flex gap-3.5 items-center">
            <img
              src={existingPhoto.image_url}
              alt="Current Entry"
              className="w-24 h-20 rounded-xl object-cover border border-white/20 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange font-mono text-[10px] font-bold uppercase tracking-wider">
                  {categories.find(c => c.id === existingPhoto.category_id)?.name || 'Category'}
                </span>
                <span className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                  <Trophy size={11} className="text-amber-400" />
                  {existingPhoto.vote_count || 0} Votes Received
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {existingPhoto.caption || 'No caption provided'}
              </p>
              <p className="text-[10px] font-mono text-white/40">
                Submitted by {existingPhoto.player_name || existingPhoto.discord_name}
              </p>
            </div>
          </div>

          {/* Delete Option to Submit New Entry */}
          <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-2xl space-y-3">
            <p className="text-xs text-red-200 font-medium leading-relaxed">
              {submissionsOpen
                ? 'Want to replace this submission with a new photo? Delete your current photo below to unlock a new submission.'
                : 'Submissions are currently closed. You can remove your entry if desired, but new entries cannot be submitted until submissions reopen.'}
            </p>

            <Button
              onClick={handleDeleteExistingPhoto}
              disabled={isDeleting}
              className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-bold font-display rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all cursor-pointer"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} className="animate-spin" /> Deleting Current Entry...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 size={16} /> {submissionsOpen ? 'Delete Current Submission & Upload New Photo' : 'Delete Current Submission'}
                </span>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Info & Verification Notice ── */}
          <div className="p-4 bg-gradient-to-r from-fivem-orange/15 via-amber-500/10 to-transparent border border-fivem-orange/30 rounded-2xl space-y-2">
            <div className="flex items-start gap-3">
              <Info className="text-fivem-orange shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-white/90 leading-relaxed">
                Submissions are verified against your <strong className="text-fivem-orange">Discord Account</strong>. Make sure your screenshot meets the <strong className="text-white">1920x1080 minimum resolution</strong> requirement.
              </p>
            </div>
            {onePhotoPerUser && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[10px] font-mono text-amber-300 font-semibold">
                <AlertCircle size={12} className="text-amber-400 shrink-0" />
                <span>Notice: 1 photo per user limit is active for this contest.</span>
              </div>
            )}
          </div>

          {/* ── Main Form Fields ── */}
          <div className="space-y-4">

            {/* 1. Category Selection */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider flex items-center justify-between">
                <span>1. Select Category *</span>
                {selectedCategoryObj && (
                  <span className="text-fivem-orange font-normal normal-case font-display text-[11px]">
                    {selectedCategoryObj.emoji} {selectedCategoryObj.name}
                  </span>
                )}
              </label>

              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={!submissionsOpen}
                className="w-full bg-[#121218] border border-white/15 rounded-xl h-11 px-3.5 text-sm outline-none focus:border-fivem-orange text-white appearance-none cursor-pointer transition-colors"
              >
                <option value="" disabled className="bg-neutral-900 text-white/40">Choose a Category...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-neutral-900 text-white py-2">
                    {c.emoji ? `${c.emoji} ` : ''}{c.name}
                  </option>
                ))}
              </select>

              {selectedCategoryObj?.description && (
                <p className="text-[11px] text-white/50 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06] italic">
                  "{selectedCategoryObj.description}"
                </p>
              )}
            </div>

            {/* 2. Character Name & Discord Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider">
                  2. Character Name *
                </label>
                <Input
                  type="text"
                  value={formPlayerName}
                  onChange={(e) => setFormPlayerName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  disabled={!submissionsOpen}
                  className="bg-[#121218] border-white/15 h-10 text-sm focus:border-fivem-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider">
                  Discord Handle
                </label>
                <div className="bg-emerald-500/10 border border-emerald-500/25 h-10 rounded-xl px-3 flex items-center justify-between text-emerald-400 font-mono text-xs">
                  <span className="flex items-center gap-2 truncate">
                    <User size={13} className="shrink-0" />
                    <span className="truncate">{discordName}</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Photo Dropzone & Resolution Inspector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider">
                  3. Upload Screenshot (Min 1920x1080) *
                </label>
                {imageMeta && (
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                    isResolutionValid
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                      : "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse"
                  )}>
                    {isResolutionValid ? <Check size={11} /> : <XCircle size={11} />}
                    {imageMeta.width}x{imageMeta.height}
                  </span>
                )}
              </div>

              {/* Explicit Resolution Error Banner */}
              {resolutionError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-red-300 text-xs animate-shake">
                  <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">
                    <strong className="block text-red-400 font-bold uppercase tracking-wider text-[11px] mb-0.5">
                      Resolution Rejected: {imageMeta?.width}x{imageMeta?.height}
                    </strong>
                    {resolutionError}
                  </div>
                </div>
              )}

              <div
                {...getRootProps()}
                className={cn(
                  "aspect-[16/9] max-h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                  isDragActive ? "border-fivem-orange bg-fivem-orange/10 scale-[1.01]" : "border-white/20 hover:border-fivem-orange/50 bg-[#121218]/90",
                  image && isResolutionValid && "border-emerald-500/40 bg-black/60",
                  image && !isResolutionValid && "border-red-500/50 bg-red-950/20"
                )}
              >
                <input {...getInputProps()} disabled={!submissionsOpen} />

                {image ? (
                  <div className="relative w-full h-full group">
                    <img src={image} className="w-full h-full object-cover" alt="Preview" />
                    
                    {/* Resolution Badge Overlay on Image */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-mono font-black px-3 py-1 rounded-xl shadow-lg backdrop-blur-md border flex items-center gap-1.5",
                        isResolutionValid
                          ? "bg-emerald-950/90 border-emerald-400/40 text-emerald-300 shadow-emerald-500/20"
                          : "bg-red-950/90 border-red-400/40 text-red-300 shadow-red-500/20"
                      )}>
                        {isResolutionValid ? <Check size={13} /> : <XCircle size={13} />}
                        {imageMeta?.width} x {imageMeta?.height}
                        <span className="opacity-60 text-[10px]">({imageMeta?.aspectRatio})</span>
                      </span>
                    </div>

                    {/* Change / Replace Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-xs">
                      <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                        <RefreshCw size={14} /> Click or Drop to Replace Photo
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearImage();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/30 border border-red-500/50 text-red-300 text-xs font-bold hover:bg-red-500/50 transition-colors"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-fivem-orange">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Drag & Drop your screenshot here</p>
                      <p className="text-xs text-white/40 mt-1">or click to browse files (PNG, JPG, WebP)</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-mono text-white/60">
                      <Sparkles size={11} className="text-fivem-orange" />
                      Minimum Resolution: <strong className="text-white">1920 x 1080 (1080p Full HD)</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Caption & Prompt Ideas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider">
                  4. Caption (Optional)
                </label>
                <span className="text-[10px] font-mono text-white/40">
                  {caption.length}/300
                </span>
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                placeholder="Tell the community about this shot..."
                disabled={!submissionsOpen}
                className="w-full bg-[#121218] border border-white/15 rounded-xl p-3.5 text-sm outline-none focus:border-fivem-orange transition-colors min-h-[85px] resize-none text-white placeholder:text-white/30"
              />

              {/* Quick Idea Tag Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-mono text-white/40 flex items-center gap-1 mr-1">
                  <Tag size={10} /> Quick tags:
                </span>
                {['🌅 Sunset', '🏎️ Vehicle', '🌃 Cityscape', '⚡ Cinematic', '🎭 Action'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAppendPromptTag(tag)}
                    disabled={!submissionsOpen}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Actions / Submit Button ── */}
      <div className="space-y-3 pt-3 border-t border-white/10">
        {isUploading && (
          <ProgressBar
            value={85}
            size="sm"
            variant="default"
            animated
            glow
            label="Uploading & Optimizing High-Resolution Photo..."
            showValue
          />
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80"
          >
            Cancel
          </Button>

          {!hasActiveExistingPhoto && (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isUploading}
              className={cn(
                "flex-1 h-11 rounded-xl font-bold font-display transition-all cursor-pointer shadow-lg",
                isFormValid
                  ? "bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white shadow-fivem-orange/30"
                  : "bg-white/10 text-white/30 border border-white/10 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} className="animate-spin" /> Uploading Entry...
                </span>
              ) : !submissionsOpen ? (
                "Submissions Closed"
              ) : !image ? (
                "Upload Photo First"
              ) : !isResolutionValid ? (
                "Resolution Too Low (Min 1920x1080)"
              ) : !formPlayerName.trim() ? (
                "Enter Character Name"
              ) : (
                "Submit Contest Entry"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
