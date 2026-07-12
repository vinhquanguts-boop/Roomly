import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, FileImage, ImagePlus, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import gsap from 'gsap';
import { toast } from 'sonner';
import { LightCard } from '@/components/LightCard';
import { LoadingButton } from '@/components/LoadingButton';
import { StepProgress } from '@/components/StepProgress';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createRoomUpload, uploadRoomImage } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type SelectedImage = {
  file: File;
  previewUrl: string;
  originalName: string;
};

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 2)} MB`;
}

async function resizeImage(file: File): Promise<File> {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  // Ollama's local OpenAI-compatible vision endpoint rejects WebP data URLs.
  // Keep WebP selection available, but normalize it before upload.
  const outputType = file.type === 'image/webp' ? 'image/jpeg' : file.type;

  if (scale === 1 && outputType === file.type) {
    source.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('Could not prepare this image. Please try another file.');
  }

  if (outputType === 'image/jpeg') {
    // JPEG has no alpha channel; flatten transparent WebP regions to white, not black
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(source, 0, 0, width, height);
  source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.9));
  if (!blob) {
    throw new Error('Could not prepare this image. Please try another file.');
  }

  const fileName = outputType === 'image/jpeg' && file.type === 'image/webp'
    ? file.name.replace(/\.[^.]+$/, '') + '.jpg'
    : file.name;
  return new File([blob], fileName, { type: outputType, lastModified: file.lastModified });
}

export function UploadPage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const previewRef = useRef<string | null>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const reduced = useReducedMotion();

  const clearSelectedImage = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setSelectedImage(null);
    setError(null);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setError(null);

    if (!ACCEPTED_TYPES.has(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Choose an image that is 10 MB or smaller.');
      return;
    }

    setIsPreparing(true);
    try {
      const prepared = await resizeImage(file);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const previewUrl = URL.createObjectURL(prepared);
      previewRef.current = previewUrl;
      setSelectedImage({ file: prepared, previewUrl, originalName: file.name });
      trackEvent('upload_start');
    } catch (resizeError) {
      setError(resizeError instanceof Error ? resizeError.message : 'Could not prepare this image.');
    } finally {
      setIsPreparing(false);
    }
  }, []);

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    disabled: isPreparing || isUploading,
    maxFiles: 1,
    multiple: false,
    onDrop,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      setError(code === 'file-too-large' ? 'Choose an image that is 10 MB or smaller.' : 'Choose one JPG, PNG, or WebP image.');
    },
    maxSize: MAX_FILE_BYTES,
  });

  async function handleContinue() {
    if (!selectedImage || isUploading) return;

    setError(null);
    setIsUploading(true);
    try {
      const target = await createRoomUpload(selectedImage.file.type);
      await uploadRoomImage(target, selectedImage.file);
      trackEvent('upload_complete');
      toast.success('Photo uploaded — setting up your room.');
      if (!reduced && previewImgRef.current) {
        await new Promise<void>((resolve) => {
          gsap.fromTo(
            previewImgRef.current!,
            { boxShadow: '0 0 0 0 rgba(107, 142, 107, 0.5)' },
            { boxShadow: '0 0 0 16px rgba(107, 142, 107, 0)', duration: 0.5, ease: 'power2.out', onComplete: resolve }
          );
        });
      }
      navigate(`/design/setup?room=${encodeURIComponent(target.roomId)}`);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'The image could not be uploaded. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg-base">
      <StepProgress current={1} />
      <main className="mx-auto w-full max-w-[1080px] px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-accent">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Roomly
        </Link>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <p className="text-xs font-bold tracking-[0.2em] text-accent">STEP 1</p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-text-primary sm:text-5xl">Show us your room</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
              Upload one clear photo. Roomly uses it only to understand your existing layout, light, and furniture.
            </p>

            <LightCard className="mt-8 p-4 sm:p-6">
              {selectedImage ? (
                <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-elevated">
                  <div className="relative aspect-[4/3] bg-secondary-muted">
                    <img ref={previewImgRef} src={selectedImage.previewUrl} alt="Selected room" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-bg-elevated/95 text-text-primary shadow-sm hover:bg-bg-elevated"
                      aria-label="Remove selected image"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{selectedImage.originalName}</p>
                      <p className="mt-1 text-sm text-text-secondary">{formatBytes(selectedImage.file.size)} ready to analyze</p>
                    </div>
                    <button type="button" onClick={clearSelectedImage} className="text-sm font-semibold text-accent hover:underline">
                      Choose another
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={cn(
                    'flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 text-center transition-colors',
                    isDragActive ? 'border-accent bg-accent/5' : 'border-border-subtle bg-bg-elevated hover:border-accent/60',
                    (isPreparing || isUploading) && 'cursor-wait opacity-70'
                  )}
                >
                  <input {...getInputProps()} />
                  {isPreparing ? <LoaderCircle className="size-9 animate-spin text-accent" aria-hidden="true" /> : <ImagePlus className="size-9 text-accent" aria-hidden="true" />}
                  <p className="mt-5 text-base font-bold text-text-primary">{isPreparing ? 'Preparing your image' : isDragActive ? 'Drop the image here' : 'Drop your room photo here'}</p>
                  <p className="mt-2 text-sm text-text-secondary">or select a file from your computer</p>
                  <p className="mt-5 text-xs font-medium text-text-secondary">JPG, PNG, or WebP. Maximum 10 MB.</p>
                </div>
              )}
              {error ? <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p> : null}
            </LightCard>
          </section>

          <aside className="lg:pt-[76px]">
            <LightCard className="p-5 sm:p-6">
              <FileImage className="size-6 text-accent" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-text-primary">A useful photo</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                <li>Include the main furniture and floor area.</li>
                <li>Use natural light where possible.</li>
                <li>Avoid screenshots, collages, or people.</li>
              </ul>
              <div className="mt-6 flex gap-3 border-t border-border-subtle pt-5 text-sm text-text-secondary">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <p>Your photo stays in this local Roomly workspace and is not used to train a model.</p>
              </div>
            </LightCard>

            <LoadingButton
              type="button"
              size="lg"
              className="mt-5 w-full bg-accent text-white hover:bg-accent/90"
              disabled={!selectedImage || isPreparing}
              loading={isUploading}
              loadingText="Uploading room"
              onClick={handleContinue}
            >
              Continue to room analysis
              <ArrowRight className="size-4" aria-hidden="true" />
            </LoadingButton>
          </aside>
        </div>
      </main>
    </div>
  );
}
