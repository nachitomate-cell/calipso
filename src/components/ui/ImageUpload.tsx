import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ImageUploadProps {
  currentUrl?: string | null
  itemId?: string
  onUpload: (url: string) => void
  onClear: () => void
}

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL

async function uploadToSupabase(file: File, itemId: string): Promise<string> {
  const ext = file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${itemId}.${ext}`
  const { error } = await supabase.storage
    .from('dish-images')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('dish-images').getPublicUrl(path)
  return data.publicUrl
}

export default function ImageUpload({ currentUrl, itemId, onUpload, onClear }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB')
      return
    }
    setError(null)

    // Immediate preview
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    if (USE_MOCK || !itemId) {
      // In demo mode: use local blob URL as the "saved" URL
      onUpload(localUrl)
      return
    }

    // Upload to Supabase Storage
    setUploading(true)
    try {
      const publicUrl = await uploadToSupabase(file, itemId)
      setPreview(publicUrl)
      onUpload(publicUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir la imagen')
      setPreview(currentUrl || null)
    } finally {
      setUploading(false)
    }
  }, [itemId, currentUrl, onUpload])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = () => {
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear()
  }

  return (
    <div className="space-y-2">
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 400, fontFamily: 'Jost, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1A7A8E', marginBottom: '4px' }}>
        Foto del plato
      </label>

      {preview ? (
        /* Preview */
        <div className="relative rounded-input overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={() => setPreview(null)}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(28,43,45,0.6)' }}>
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 rounded-full text-white hover:bg-white/20 transition-colors"
              style={{ background: 'rgba(28,43,45,0.6)' }}
              aria-label="Eliminar imagen"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${dragging ? '#29B5D0' : 'rgba(28,43,45,0.20)'}`,
            borderRadius: '8px',
            background: dragging ? 'rgba(41,181,208,0.04)' : 'transparent',
            padding: '28px 16px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 200ms ease',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {dragging
              ? <Upload size={22} style={{ color: '#29B5D0' }} />
              : <Image size={22} style={{ color: 'rgba(28,43,45,0.25)' }} />
            }
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: 'rgba(28,43,45,0.45)', fontWeight: 300 }}>
              {dragging ? 'Suelta aquí' : 'Arrastra una foto o haz clic para buscar'}
            </p>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: 'rgba(28,43,45,0.30)', letterSpacing: '0.1em' }}>
              JPG · PNG · WEBP · MÁX 5 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onInputChange}
          />
        </div>
      )}

      {error && (
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#993C1D' }}>{error}</p>
      )}
      {USE_MOCK && (
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: 'rgba(28,43,45,0.35)', letterSpacing: '0.05em' }}>
          Modo demo: la imagen se guarda en local. Conecta Supabase para subir a Storage.
        </p>
      )}
    </div>
  )
}
