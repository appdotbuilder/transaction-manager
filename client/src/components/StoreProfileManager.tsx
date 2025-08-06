
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Save } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { StoreProfile, StoreProfileInput } from '../../../server/src/schema';

interface StoreProfileManagerProps {
  storeProfile: StoreProfile | null;
  onUpdate: (profile: StoreProfile) => void;
}

export function StoreProfileManager({ storeProfile, onUpdate }: StoreProfileManagerProps) {
  const [formData, setFormData] = useState<StoreProfileInput>({
    store_name: storeProfile?.store_name || '',
    full_address: storeProfile?.full_address || '',
    phone_number: storeProfile?.phone_number || '',
    email: storeProfile?.email || '',
    npwp: storeProfile?.npwp || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await trpc.createStoreProfile.mutate(formData);
      onUpdate(result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save store profile:', err);
      setError('Failed to save store profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof StoreProfileInput, value: string) => {
    setFormData((prev: StoreProfileInput) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Store profile saved successfully! 🎉
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="store_name">Store Name *</Label>
            <Input
              id="store_name"
              value={formData.store_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('store_name', e.target.value)
              }
              placeholder="Enter your store name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('email', e.target.value)
              }
              placeholder="store@example.com"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="full_address">Full Address *</Label>
            <Input
              id="full_address"
              value={formData.full_address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('full_address', e.target.value)
              }
              placeholder="Complete store address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number *</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('phone_number', e.target.value)
              }
              placeholder="+62 xxx xxxx xxxx"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="npwp">NPWP *</Label>
            <Input
              id="npwp"
              value={formData.npwp}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('npwp', e.target.value)
              }
              placeholder="XX.XXX.XXX.X-XXX.XXX"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Store Profile'}
          </Button>
        </div>
      </form>

      {storeProfile && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Store Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Store Name:</span>
                <p className="text-gray-900">{storeProfile.store_name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Email:</span>
                <p className="text-gray-900">{storeProfile.email}</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-600">Address:</span>
                <p className="text-gray-900">{storeProfile.full_address}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Phone:</span>
                <p className="text-gray-900">{storeProfile.phone_number}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">NPWP:</span>
                <p className="text-gray-900">{storeProfile.npwp}</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Last updated: {storeProfile.updated_at.toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
