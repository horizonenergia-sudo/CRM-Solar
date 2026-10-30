'use client'

import { useState } from 'react'
import { Save, Key, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { configureIntegration, getIntegrationConfig, testIntegration } from '@/actions/integrations'

type Provider = 'aurora' | 'opensolar' | 'loanpal' | 'solarapp'

const providerConfigs: Record<Provider, { name: string; description: string; fields: { key: string; label: string; type: string; placeholder: string }[] }> = {
  aurora: {
    name: 'Aurora Solar',
    description: 'Design and sales software for solar installations',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter your Aurora API key' },
      { key: 'base_url', label: 'Base URL (optional)', type: 'text', placeholder: 'https://api.aurorasolar.com' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Enter webhook secret for verification' },
    ],
  },
  opensolar: {
    name: 'OpenSolar',
    description: 'End-to-end solar design and proposal platform',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter your OpenSolar API key' },
      { key: 'base_url', label: 'Base URL (optional)', type: 'text', placeholder: 'https://api.opensolar.com' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Enter webhook secret for verification' },
    ],
  },
  loanpal: {
    name: 'LoanPal (GoodLeap)',
    description: 'Solar financing and loan management',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter your LoanPal API key' },
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Enter your Merchant ID' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Enter webhook secret' },
    ],
  },
  solarapp: {
    name: 'SolarAPP+',
    description: 'Automated permit processing for solar',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter your SolarAPP+ API key' },
      { key: 'jurisdiction_id', label: 'Jurisdiction ID', type: 'text', placeholder: 'Enter your Jurisdiction ID' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Enter webhook secret' },
    ],
  },
}

export function IntegrationConfig() {
  const [activeTab, setActiveTab] = useState<string>('aurora')
  const [configs, setConfigs] = useState<Record<Provider, Record<string, string>>>({
    aurora: {},
    opensolar: {},
    loanpal: {},
    solarapp: {},
  })
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Provider | null>(null)
  const [testing, setTesting] = useState<Provider | null>(null)
  const [saveStatus, setSaveStatus] = useState<Record<Provider, 'idle' | 'success' | 'error'>>({
    aurora: 'idle',
    opensolar: 'idle',
    loanpal: 'idle',
    solarapp: 'idle',
  })
  const [testResults, setTestResults] = useState<Record<Provider, { success: boolean; message: string } | null>>({
    aurora: null,
    opensolar: null,
    loanpal: null,
    solarapp: null,
  })

  // Load configs on mount
  const loadConfig = async (provider: Provider) => {
    try {
      const config = await getIntegrationConfig(provider)
      if (config) {
        // Decrypt for display (remove encrypted: prefix)
        const decrypted: Record<string, string> = {}
        Object.entries(config.config).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('encrypted:')) {
            decrypted[key] = value.replace('encrypted:', '')
          } else {
            decrypted[key] = String(value)
          }
        })
        setConfigs(prev => ({ ...prev, [provider]: decrypted }))
      }
    } catch (error) {
      console.error(`Failed to load ${provider} config:`, error)
    }
  }

  // Load all configs on first render
  const [loaded, setLoaded] = useState(false)
  if (!loaded) {
    Promise.all([
      loadConfig('aurora'),
      loadConfig('opensolar'),
      loadConfig('loanpal'),
      loadConfig('solarapp'),
    ]).then(() => setLoaded(true))
  }

  const handleSave = async (provider: Provider) => {
    setSaving(provider)
    setSaveStatus(prev => ({ ...prev, [provider]: 'idle' }))

    try {
      await configureIntegration(provider, configs[provider])
      setSaveStatus(prev => ({ ...prev, [provider]: 'success' }))
      setTestResults(prev => ({ ...prev, [provider]: null }))
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [provider]: 'idle' })), 3000)
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [provider]: 'error' }))
      console.error(`Failed to save ${provider} config:`, error)
    } finally {
      setSaving(null)
    }
  }

  const handleTest = async (provider: Provider) => {
    setTesting(provider)
    setTestResults(prev => ({ ...prev, [provider]: null }))

    try {
      const result = await testIntegration(provider)
      setTestResults(prev => ({ ...prev, [provider]: result }))
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider]: {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      }}))
    } finally {
      setTesting(null)
    }
  }

  const handleChange = (provider: Provider, key: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider], [key]: value }
    }))
    setSaveStatus(prev => ({ ...prev, [provider]: 'idle' }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Configure your solar software integrations. API keys are encrypted at rest.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {(['aurora', 'opensolar', 'loanpal', 'solarapp'] as Provider[]).map((provider) => (
            <TabsTrigger key={provider} value={provider}>
              {providerConfigs[provider].name}
            </TabsTrigger>
          ))}
        </TabsList>

        {(['aurora', 'opensolar', 'loanpal', 'solarapp'] as Provider[]).map((provider) => (
          <TabsContent key={provider} value={provider} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {providerConfigs[provider].name}
                  {configs[provider]?.api_key && (
                    <Badge className="bg-green-100 text-green-800" variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{providerConfigs[provider].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {providerConfigs[provider].fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`${provider}-${field.key}`}>{field.label}</Label>
                    <div className="relative">
                      <Input
                        id={`${provider}-${field.key}`}
                        type={showSecrets[`${provider}-${field.key}`] ? 'text' : field.type}
                        placeholder={field.placeholder}
                        value={configs[provider][field.key] || ''}
                        onChange={(e) => handleChange(provider, field.key, e.target.value)}
                        disabled={saving === provider}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => setShowSecrets(prev => ({
                            ...prev,
                            [`${provider}-${field.key}`]: !prev[`${provider}-${field.key}`]
                          }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[`${provider}-${field.key}`] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button
                    onClick={() => handleSave(provider)}
                    disabled={saving === provider}
                    className={cn(
                      saveStatus[provider] === 'success' && 'bg-green-600 hover:bg-green-700'
                    )}
                  >
                    {saving === provider ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : saveStatus[provider] === 'success' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleTest(provider)}
                    disabled={testing === provider || !configs[provider]?.api_key}
                  >
                    {testing === provider ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>

                  {testResults[provider] && (
                    <Badge
                      className={cn(
                        testResults[provider]?.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      )}
                      variant="secondary"
                    >
                      {testResults[provider]?.success ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {testResults[provider]?.message}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {testResults[provider]?.message}
                        </>
                      )}
                    </Badge>
                  )}

                  {saveStatus[provider] === 'error' && (
                    <Badge className="bg-red-100 text-red-800" variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Failed to save
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Webhook URLs Info */}
            <Card>
              <CardHeader>
                <CardTitle>Webhook URLs</CardTitle>
                <CardDescription>
                  Configure these URLs in your {providerConfigs[provider].name} dashboard to receive design completion notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-sm">
                <div className="p-3 bg-gray-100 rounded flex items-center justify-between">
                  <span>{new URL(`/functions/v1/${provider}-webhook`, window.location.origin).href}</span>
                  <Button variant="ghost" size="sm">Copy</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}