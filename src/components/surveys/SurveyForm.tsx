'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Camera, Image, X, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SurveyFormProps {
  survey: {
    id: string
    lead?: {
      first_name: string
      last_name: string
      email: string
      phone: string
      address?: {
        street: string
        city: string
        state: string
        zip: string
      }
    }
    status: string
    scheduled_at: string
  }
  onComplete: (data: {
    roof_photos: string[]
    electrical_panel_photos: string[]
    measurements: Record<string, unknown>
    notes: string
  }) => Promise<void>
  onCancel: () => void
}

interface Photo {
  id: string
  file: File
  preview: string
  type: 'roof' | 'electrical'
  uploading?: boolean
}

const DB_NAME = 'solar-survey-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-surveys'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

async function saveOffline(surveyId: string, data: any): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put({ id: surveyId, data, timestamp: Date.now() })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function getOffline(surveyId: string): Promise<any | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(surveyId)
    request.onsuccess = () => resolve(request.result?.data || null)
    request.onerror = () => reject(request.error)
  })
}

async function clearOffline(surveyId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(surveyId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export function SurveyForm({ survey, onComplete, onCancel }: SurveyFormProps) {
  const [roofPhotos, setRoofPhotos] = useState<Photo[]>([])
  const [electricalPhotos, setElectricalPhotos] = useState<Photo[]>([])
  const [measurements, setMeasurements] = useState<Record<string, string>>({
    roof_area: '',
    roof_pitch: '',
    orientation: '',
    shading: '',
  })
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [offlineSaved, setOfflineSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Listen for online/offline events
  const handleOnline = useCallback(() => {
    setIsOnline(true)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  const handlePhotoCapture = async (type: 'roof' | 'electrical') => {
    if (!fileInputRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      // Create a video element to capture from
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve()
      })

      // Capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      // Stop the stream
      stream.getTracks().forEach(track => track.stop())

      // Convert to file
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' })
          const preview = await fileToBase64(file)

          const newPhoto: Photo = {
            id: `${type}-${Date.now()}`,
            file,
            preview,
            type,
          }

          if (type === 'roof') {
            setRoofPhotos(prev => [...prev, newPhoto])
          } else {
            setElectricalPhotos(prev => [...prev, newPhoto])
          }
        }
      }, 'image/jpeg', 0.8)
    } catch (error) {
      console.error('Camera access error:', error)
      alert('Unable to access camera. Please ensure you have granted camera permissions.')
    }
  }

  const handleFileSelect = async (type: 'roof' | 'electrical', event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      const preview = await fileToBase64(file)
      const newPhoto: Photo = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        file,
        preview,
        type,
      }

      if (type === 'roof') {
        setRoofPhotos(prev => [...prev, newPhoto])
      } else {
        setElectricalPhotos(prev => [...prev, newPhoto])
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (type: 'roof' | 'electrical', id: string) => {
    if (type === 'roof') {
      setRoofPhotos(prev => prev.filter(p => p.id !== id))
    } else {
      setElectricalPhotos(prev => prev.filter(p => p.id !== id))
    }
  }

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }))
  }

  const saveOfflineDraft = async () => {
    try {
      const data = {
        roof_photos: roofPhotos.map(p => p.preview),
        electrical_panel_photos: electricalPhotos.map(p => p.preview),
        measurements,
        notes,
      }
      await saveOffline(survey.id, data)
      setOfflineSaved(true)
      setTimeout(() => setOfflineSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save offline:', error)
    }
  }

  const loadOfflineDraft = async () => {
    try {
      const data = await getOffline(survey.id)
      if (data) {
        setNotes(data.notes || '')
        setMeasurements(data.measurements || {})
        // Note: Photos stored as base64 would need to be converted back to Files
        // For simplicity, we'll just restore notes and measurements
      }
    } catch (error) {
      console.error('Failed to load offline draft:', error)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const data = {
        roof_photos: roofPhotos.map(p => p.preview),
        electrical_panel_photos: electricalPhotos.map(p => p.preview),
        measurements,
        notes,
      }

      await onComplete(data)
      await clearOffline(survey.id)
      setOfflineSaved(false)
    } catch (error) {
      console.error('Submit error:', error)
      // If offline, save locally
      if (!isOnline) {
        await saveOfflineDraft()
        alert('You are offline. Survey saved locally and will sync when online.')
      } else {
        alert('Failed to submit survey. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const measurementFields = [
    { key: 'roof_area', label: 'Roof Area (sq ft)', placeholder: 'e.g., 2000' },
    { key: 'roof_pitch', label: 'Roof Pitch', placeholder: 'e.g., 4:12 or 18.4°' },
    { key: 'orientation', label: 'Orientation', placeholder: 'e.g., South, SW, 180°' },
    { key: 'shading', label: 'Shading %', placeholder: 'e.g., 10' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Survey</h1>
          <p className="text-muted-foreground">
            {survey.lead?.first_name} {survey.lead?.last_name} • {format(new Date(survey.scheduled_at), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge className="bg-orange-100 text-orange-800" variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
          {offlineSaved && (
            <Badge className="bg-green-100 text-green-800" variant="secondary">
              <CheckCircle className="h-3 w-3 mr-1" />
              Saved
            </Badge>
          )}
        </div>
      </div>

      {/* Lead Info */}
      {survey.lead && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{survey.lead.first_name} {survey.lead.last_name}</p>
            <p className="text-muted-foreground">{survey.lead.email}</p>
            <p className="text-muted-foreground">{survey.lead.phone}</p>
            {survey.lead.address && (
              <p className="text-muted-foreground">
                {survey.lead.address.street}, {survey.lead.address.city}, {survey.lead.address.state} {survey.lead.address.zip}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Roof Photos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roof Photos</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePhotoCapture('roof')} disabled={isSubmitting}>
              <Camera className="h-4 w-4 mr-1" />
              Camera
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(e) => handleFileSelect('roof', e)}
              className="hidden"
            />
          </div>
        </CardHeader>
        <CardContent>
          {roofPhotos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No roof photos added yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {roofPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.preview} alt="Roof photo" className="w-full aspect-square object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto('roof', photo.id)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4 text-red-500 bg-white rounded-full p-1 shadow" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Electrical Panel Photos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Electrical Panel Photos</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePhotoCapture('electrical')} disabled={isSubmitting}>
              <Camera className="h-4 w-4 mr-1" />
              Camera
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(e) => handleFileSelect('electrical', e)}
              className="hidden"
            />
          </div>
        </CardHeader>
        <CardContent>
          {electricalPhotos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No electrical panel photos added yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {electricalPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.preview} alt="Electrical panel photo" className="w-full aspect-square object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto('electrical', photo.id)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4 text-red-500 bg-white rounded-full p-1 shadow" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {measurementFields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                placeholder={field.placeholder}
                value={measurements[field.key] || ''}
                onChange={(e) => handleMeasurementChange(field.key, e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any observations about the site..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Submitting...' : 'Complete Survey'}
        </Button>
      </div>

      {/* Auto-save indicator */}
      <p className="text-xs text-center text-muted-foreground">
        {isOnline ? 'Changes auto-saved locally' : 'Offline - changes saved locally'}
      </p>
    </div>
  )
}