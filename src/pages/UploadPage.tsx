import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { type FileRejection, useDropzone } from 'react-dropzone';
import { ArrowLeft, CheckCircle2, CloudUpload, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LightCard } from '@/components/LightCard';
import { createRoomUpload, uploadRoomImage } from '@/lib/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1024;

type UploadStep = 'idle' | 'preparing' | 'creating-room' | 'uploading' | 'complete';

type SelectedImage = {
  file: File;
  previewUrl: string;
  originalSize: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the selected image.'));
    image.src = url;
  });
}

async function resizeImage(file: File): Promise<File> {
  const url = URL.createObjectURL(file);

  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not prepare the image for upload.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not resize image.'))),
        'image/jpeg',
        0.88
      );
    });

    return new File([blob], file.name.replace(/\.(jpe?g|png|webp)$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function UploadPage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setStep('preparing');

    try {
      const resized = await resizeImage(file);
      const previewUrl = URL.createObjectURL(resized);

      setSelectedImage((current) => {
        if (current) {
          URL.revokeObjectURL(current.previewUrl);
        }
        return {
          file: resized,
          previewUrl,
          originalSize: file.size,
        };
      });
      setStep('idle');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not prepare image.');
      setStep('idle');
    }
  }, []);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const rejectionError = rejections[0]?.errors[0];
    setError(
      rejectionError?.code === 'file-too-large'
        ? 'Choose an image under 10 MB.'
        : 'Choose a JPG, PNG, or WebP room photo.'
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    noClick: Boolean(selectedImage),
    onDrop,
    onDropRejected,
  });

  const isBusy = step !== 'idle';
  const statusText = useMemo(() => {
    switch (step) {
      case 'preparing':
        return 'Preparing your photo...';
      case 'creating-room':
        return 'Creating your room record...';
      case 'uploading':
        return 'Uploading your photo...';
      case 'complete':
        return 'Upload complete.';
      default:
        return 'Ready to upload.';
    }
  }, [step]);

  async function handleConfirm() {
    if (!selectedImage) return;

    setError(null);
    setStep('creating-room');

    try {
      const target = await createRoomUpload(selectedImage.file.type);
      setStep('uploading');
      await uploadRoomImage(target, selectedImage.file);
      setStep('complete');
      navigate(`/design/setup?room=${target.roomId}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
      setStep('idle');
    }
  }

  return (
    <main className="min-h-dvh bg-bg-base px-5 py-8 text-text-primary md:px-10">
      <div className="mx-auto max-w-[960px]">
        <Button variant="ghost" className="mb-6 gap-2 px-0 hover:bg-transparent" onClick={() => navigate('/')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Roomly
        </Button>

        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Step 1</p>
            <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[48px]">
              Upload your room photo
            </h1>
            <p className="mt-5 max-w-[420px] text-base leading-7 text-text-secondary">
              Choose one clear photo of the room. We resize it before upload, then analyze the space with your local AI setup.
            </p>
            <div className="mt-6 rounded-lg bg-secondary-muted/70 p-4 text-sm leading-6 text-text-secondary">
              Use a bright, wide angle if possible. Avoid close-ups of single items.
            </div>
          </div>

          <LightCard className="p-4 md:p-5">
            <div
              {...getRootProps()}
              className={[
                'flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition',
                isDragActive ? 'border-accent bg-[#fbf8f2]' : 'border-border-strong bg-bg-elevated',
              ].join(' ')}
            >
              <input {...getInputProps()} />
              {selectedImage ? (
                <div className="w-full">
                  <div className="relative overflow-hidden rounded-lg bg-bg-inset">
                    <img
                      src={selectedImage.previewUrl}
                      alt="Selected room preview"
                      className="max-h-[420px] w-full object-contain"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-bg-elevated text-text-primary shadow-card"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedImage((current) => {
                          if (current) URL.revokeObjectURL(current.previewUrl);
                          return null;
                        });
                      }}
                      aria-label="Remove selected image"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-left text-sm">
                    <div>
                      <p className="font-bold text-text-primary">{selectedImage.file.name}</p>
                      <p className="mt-1 text-text-secondary">
                        {formatBytes(selectedImage.file.size)}
                        {selectedImage.originalSize !== selectedImage.file.size
                          ? ` after resize, from ${formatBytes(selectedImage.originalSize)}`
                          : ''}
                      </p>
                    </div>
                    <Button variant="outline" type="button" onClick={open} disabled={isBusy}>
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex size-16 items-center justify-center rounded-full bg-secondary-muted text-accent">
                    <ImagePlus className="size-8" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold">Drop your room photo here</h2>
                  <p className="mt-2 max-w-[330px] text-sm leading-6 text-text-secondary">
                    JPG, PNG, or WebP. Maximum 10 MB. One image only.
                  </p>
                  <Button type="button" className="mt-6" onClick={open}>
                    Choose photo
                  </Button>
                </>
              )}
            </div>

            {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : selectedImage ? (
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <CloudUpload className="size-4" aria-hidden="true" />
                )}
                {statusText}
              </div>
              <Button type="button" disabled={!selectedImage || isBusy} onClick={handleConfirm}>
                Analyze room
              </Button>
            </div>
          </LightCard>
        </div>
      </div>
    </main>
  );
}
