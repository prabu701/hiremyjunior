'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, FileImage, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { VerificationBadge } from '@/components/app/VerificationBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { invalidateSetup, useLatestVerification } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';
import { uploadFile } from '@/lib/upload';

/** Prototype "Verify School ID", reframed as a supporting document reviewed by HireMyJunior. */
export default function ProofOfAge() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { latest } = useLatestVerification('proof_of_age');
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Release the preview URL when it's replaced or the page closes.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = latest?.status;
  const locked = status === 'needs_review' || status === 'verified';

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/^image\/|^application\/pdf$/.test(f.type)) return setError('Upload a photo (JPG, PNG, HEIC) or a PDF.');
    if (f.size > 10 * 1024 * 1024) return setError('That file is over 10 MB.');
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file || !session) return;
    setError(null);
    setBusy(true);
    try {
      const path = await uploadFile('verification-docs', session.user.id, `proof-of-age-${Date.now()}`, file);
      await rpc('submit_proof_of_age', { evidence_path: path });
      await invalidateSetup(qc);
      setFile(null);
      setPreview(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/teen" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Home</Link>
      <Card className="p-7 sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] text-ink">Upload proof of age</h1>
            <p className="mt-1.5 text-[15px] text-muted">A photo of a document with your name and date of birth — a school ID that shows your birthday, a state ID, passport or birth certificate.</p>
          </div>
          <VerificationBadge status={status} />
        </div>

        {locked ? (
          <Alert tone={status === 'verified' ? 'success' : 'info'} className="mt-6">
            {status === 'verified' ? 'Your age is verified.' : 'Thanks! Our team reviews documents within 1 business day.'}
          </Alert>
        ) : (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
              className={cn(
                'mt-6 flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-6 transition-colors',
                dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface-2 hover:border-accent/60',
              )}
              data-testid="pick-document"
            >
              {preview && file?.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={preview} alt="Selected document" className="max-h-52 rounded-tile object-contain" />
              ) : file ? (
                <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><FileImage className="size-5" />{file.name}</span>
              ) : (
                <>
                  <span className="flex size-12 items-center justify-center rounded-full bg-surface text-accent shadow-soft"><UploadCloud className="size-6" /></span>
                  <span className="text-[15px] font-semibold text-ink">Drop a photo here, or click to choose</span>
                  <span className="text-[13px] text-muted">JPG, PNG, HEIC or PDF · up to 10 MB</span>
                </>
              )}
            </button>
            <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid="document-input" />
            {status === 'failed' ? <Alert tone="danger" className="mt-4">Last upload wasn’t accepted: {latest?.failure_reason ?? 'please try again'}.</Alert> : null}
            {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
            <Button size="lg" block className="mt-6" disabled={!file} loading={busy} onClick={submit} data-testid="submit-poa">Submit for review</Button>
          </>
        )}

        <ul className="mt-6 space-y-2 border-t border-line pt-6">
          {['Confirms your age for employers', 'Only your name and age are ever shared — never the document', 'Your parent’s confirmation counts toward this too'].map((l) => (
            <li key={l} className="flex items-center gap-2.5 text-[14px] text-ink"><Check className="size-4 text-tint-3-ink" />{l}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
