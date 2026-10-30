'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, X } from 'lucide-react'

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.enum(['website', 'referral', 'canvassing', 'purchased']).optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  utility_provider: z.string().optional(),
  avg_monthly_bill: z.string().optional(),
  roof_type: z.string().optional(),
  shading_notes: z.string().optional(),
  notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormProps {
  initialData?: Partial<LeadFormData>
  onSubmit: (data: LeadFormData) => Promise<void>
  onClose?: () => void
  loading?: boolean
}

export function LeadForm({ initialData, onSubmit, onClose, loading = false }: LeadFormProps) {
  const [localLoading, setLocalLoading] = useState(false)

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      source: 'website',
      address_street: '',
      address_city: '',
      address_state: '',
      address_zip: '',
      utility_provider: '',
      avg_monthly_bill: '',
      roof_type: '',
      shading_notes: '',
      notes: '',
      ...initialData,
    },
  })

  async function handleSubmit(data: LeadFormData) {
    setLocalLoading(true)
    try {
      await onSubmit(data)
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">{initialData?.first_name ? 'Edit Lead' : 'New Lead'}</CardTitle>
        <CardDescription>Fill in the lead information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                {...form.register('first_name')}
                disabled={loading || localLoading}
              />
              {form.formState.errors.first_name && (
                <p className="text-sm text-red-500">{form.formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                {...form.register('last_name')}
                disabled={loading || localLoading}
              />
              {form.formState.errors.last_name && (
                <p className="text-sm text-red-500">{form.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              disabled={loading || localLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...form.register('phone')}
              disabled={loading || localLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              {...form.register('source')}
              disabled={loading || localLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="canvassing">Canvassing</SelectItem>
                <SelectItem value="purchased">Purchased List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="space-y-2">
              <Input
                placeholder="Street"
                {...form.register('address_street')}
                disabled={loading || localLoading}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="City"
                  {...form.register('address_city')}
                  disabled={loading || localLoading}
                />
                <Input
                  placeholder="State"
                  {...form.register('address_state')}
                  disabled={loading || localLoading}
                />
                <Input
                  placeholder="ZIP"
                  {...form.register('address_zip')}
                  disabled={loading || localLoading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="utility_provider">Utility Provider</Label>
              <Input
                id="utility_provider"
                {...form.register('utility_provider')}
                disabled={loading || localLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avg_monthly_bill">Avg Monthly Bill ($)</Label>
              <Input
                id="avg_monthly_bill"
                type="number"
                {...form.register('avg_monthly_bill')}
                disabled={loading || localLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roof_type">Roof Type</Label>
            <Input
              id="roof_type"
              {...form.register('roof_type')}
              disabled={loading || localLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shading_notes">Shading Notes</Label>
            <Textarea
              id="shading_notes"
              {...form.register('shading_notes')}
              disabled={loading || localLoading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              disabled={loading || localLoading}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} disabled={loading || localLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || localLoading}>
              {localLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                initialData?.first_name ? 'Update Lead' : 'Create Lead'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}