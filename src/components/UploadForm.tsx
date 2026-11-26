import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from './ui/toast';
import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, EntryConfirmation, UploadStages, type UploadStage } from './EntryMotion';
import { Upload, XCircle, Lock, RefreshCw, Trash2, Check, Ban } from 'lucide-react';
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
  /** Whether submissions show pixelated until voting, so the confirmation can say so. */
  censored?: boolean;
  existingPhoto?: Photo | null;
  onDeleteExisting?: (photoId: string, discordName: string) => Promise<boolean>;
  /** Resolves true only when the entry was saved. */
  onUpload: (imageData: string, caption: string, discordName: string, playerName: string, categoryId: string, onStage: (stage: UploadStage) => void) => Promise<boolean>;
  onClose: () => void;
}

export default function UploadForm({
  categories,
  initialCategoryId,
  discordName,
  submissionsOpen = true,
  onePhotoPerUser = false,
  censored = false,
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
  const [stage, setStage] = useState<UploadStage>('preparing');
  const [submitted, setSubmitted] = useState(false);
  const reduceMotion = useReducedMotion();
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
        const meta = {
          width: w,
          height: h,
          fileSizeBytes,
          fileName
        };

        setImageMeta(meta);
        setImage(dataUrl);

        // Strict 1920x1080 resolution validation, reported once, next to the picture
        setResolutionError(
          w < 1920 || h < 1080 ? `This image is ${w}×${h}. Choose one at least 1920×1080.` : null
        );
      };

      img.onerror = () => {
        toast.error('Failed to parse image file. Please try another image.');
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
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
        toast.success('Entry deleted');
      }
    } catch (err) {
      console.error('Failed deleting existing photo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveExistingPhoto = Boolean(
    !isUploading && onePhotoPerUser && existingPhoto && existingPhoto.id !== deletedExistingId
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
    setStage('preparing');
    setIsUploading(true);
    try {
      // On failure the form stays open with everything the player entered.
      const saved = await onUpload(image, caption.trim(), discordName, formPlayerName.trim(), selectedCategoryId, setStage);
      if (saved) setSubmitted(true);
    } catch (err: any) {
      console.error('Submission upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine submit button state & label
  const isResolutionValid = imageMeta ? (imageMeta.width >= 1920 && imageMeta.height >= 1080) : false;
  const isFormValid = image && isResolutionValid && selectedCategoryId && formPlayerName.trim() && submissionsOpen && !hasActiveExistingPhoto;

  // Checked before the entry-limit view: once saved, the new photo is also the "existing" one.
  if (submitted && image) {
    return (
      <EntryConfirmation
        image={image}
        categoryName={selectedCategoryObj?.name || 'your category'}
        censored={censored}
        onDone={onClose}
      />
    );
  }

  const needed = [!image && 'a screenshot', !formPlayerName.trim() && 'your character name'].filter(Boolean).join(' and ');
  const labelClass = 'block text-xs font-bold text-white/80';
  const fieldClass = 'w-full rounded-xl border border-white/15 bg-black/60 text-sm text-white outline-none transition-colors focus:border-fivem-orange';

  return (
    <div className="space-y-4 text-white">
      {!submissionsOpen && !hasActiveExistingPhoto && (
        <p className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <Lock size={16} className="shrink-0" aria-hidden="true" />
          Submissions are closed.
        </p>
      )}

      {hasActiveExistingPhoto && existingPhoto ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-white/70">
            {submissionsOpen
              ? 'One entry per player. Delete this one to submit a different photo.'
              : "Submissions are closed. You can delete your entry, but you can't submit another."}
          </p>

          {existingPhoto.is_disqualified && (
            <p className="flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-sm text-red-300">
              <Ban size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>Disqualified</strong>
                {existingPhoto.disqualification_reason ? `: ${existingPhoto.disqualification_reason}` : ''}. It stays in the
                gallery but can't receive votes.
              </span>
            </p>
          )}

          <img
            src={existingPhoto.image_url}
            alt="Your current entry"
            className="aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
          />
          <div className="space-y-1">
            <p className="text-sm font-bold">
              {categories.find(c => c.id === existingPhoto.category_id)?.name || 'Category'}
            </p>
            {existingPhoto.caption && <p className="text-sm text-white/70">{existingPhoto.caption}</p>}
            <p className="text-xs text-white/60">
              {existingPhoto.player_name || existingPhoto.discord_name}, {existingPhoto.vote_count || 0} votes
            </p>
          </div>

          <Button
            onClick={handleDeleteExistingPhoto}
            disabled={isDeleting}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 font-display font-bold text-red-300 hover:bg-red-500 hover:text-white"
          >
            {isDeleting ? (
              <><RefreshCw size={15} className="animate-spin" aria-hidden="true" /> Deleting</>
            ) : (
              <><Trash2 size={16} aria-hidden="true" /> Delete entry</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            {onePhotoPerUser && 'One entry per player. '}Submitting as <span className="font-semibold text-white/80">{discordName}</span>.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="entry-category" className={labelClass}>Category</label>
            <select
              id="entry-category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={!submissionsOpen}
              className={cn(fieldClass, 'h-11 cursor-pointer px-3.5')}
            >
              <option value="" disabled className="bg-neutral-900 text-white/60">Choose a category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                  {c.emoji ? `${c.emoji} ` : ''}{c.name}
                </option>
              ))}
            </select>
            {selectedCategoryObj?.description && (
              <p className="text-xs leading-relaxed text-white/60">{selectedCategoryObj.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="entry-name" className={labelClass}>Character name</label>
            <Input
              id="entry-name"
              type="text"
              value={formPlayerName}
              onChange={(e) => setFormPlayerName(e.target.value)}
              placeholder="e.g. Marcus Vance"
              disabled={!submissionsOpen}
              className={cn(fieldClass, 'h-11')}
            />
          </div>

          <div className="space-y-1.5">
            <span className={labelClass}>Screenshot</span>
            <div
              {...getRootProps()}
              className={cn(
                'relative flex aspect-[16/9] max-h-56 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors',
                isDragActive ? 'border-fivem-orange bg-fivem-orange/10' : 'border-white/20 bg-black/60 hover:border-fivem-orange/60',
                image && isResolutionValid && 'border-emerald-500/40',
                image && !isResolutionValid && 'border-red-500/50'
              )}
            >
              <input {...getInputProps()} disabled={!submissionsOpen} />

              {image ? (
                <>
                  <motion.img
                    key={`${imageMeta?.fileName}-${imageMeta?.fileSizeBytes}`}
                    src={image}
                    className="h-full w-full object-cover"
                    alt="Preview"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(48% 0% 48% 0%)' }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
                    transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: EASE_OUT }}
                  />
                  <motion.span
                    key={`verdict-${imageMeta?.fileName}-${imageMeta?.fileSizeBytes}`}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: reduceMotion ? 0 : 0.3, ease: EASE_OUT }}
                    className={cn(
                      'absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-bold',
                      isResolutionValid ? 'text-emerald-300' : 'text-red-300'
                    )}
                  >
                    {isResolutionValid ? <Check size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                    {imageMeta?.width}{'×'}{imageMeta?.height}
                  </motion.span>
                  {/* Always visible, so touch screens can reach them */}
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
                      className="min-h-11 cursor-pointer rounded-lg border border-white/20 bg-black/80 px-3.5 text-xs font-bold text-white hover:bg-black"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleClearImage(); }}
                      className="min-h-11 cursor-pointer rounded-lg border border-red-500/50 bg-black/80 px-3.5 text-xs font-bold text-red-300 hover:bg-black"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 p-4 text-center">
                  <Upload size={22} className="mx-auto text-fivem-orange" aria-hidden="true" />
                  <p className="text-sm font-bold">Drop a screenshot here, or browse</p>
                  <p className="text-xs text-white/60">PNG, JPG or WebP, at least 1920{'×'}1080</p>
                </div>
              )}
            </div>

            {resolutionError && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="flex items-start gap-2 text-sm text-red-300"
              >
                <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {resolutionError}
              </motion.p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="entry-caption" className={labelClass}>Caption (optional)</label>
              <span className="text-xs tabular-nums text-white/60">{caption.length}/300</span>
            </div>
            <textarea
              id="entry-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 300))}
              placeholder="Tell the community about this shot"
              disabled={!submissionsOpen}
              className={cn(fieldClass, 'min-h-[80px] resize-none p-3.5 placeholder:text-white/50')}
            />
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-white/10 pt-3">
        {isUploading && <UploadStages stage={stage} />}
        {!hasActiveExistingPhoto && submissionsOpen && !isUploading && needed && (
          <p className="text-xs text-white/60">To submit, add {needed}.</p>
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
          >
            Cancel
          </Button>

          {!hasActiveExistingPhoto && (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isUploading}
              className={cn(
                'h-11 flex-1 cursor-pointer rounded-xl font-display font-bold',
                isFormValid ? 'bg-fivem-orange text-white hover:bg-orange-500' : 'cursor-not-allowed border border-white/10 bg-white/10 text-white/50'
              )}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> Uploading
                </span>
              ) : (
                'Submit entry'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
