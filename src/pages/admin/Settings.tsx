import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Input, Button } from '../../components/ui';
export function Settings() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    setTimeout(() => {
      updateSettings({
        businessName: formData.get('businessName') as string,
        email: formData.get('email') as string,
        whatsappNumber: formData.get('whatsappNumber') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        shippingFlatRate: parseInt(
          formData.get('shippingFlatRate') as string,
          10
        ),
        freeShippingThreshold: parseInt(
          formData.get('freeShippingThreshold') as string,
          10
        ),
        upiId: formData.get('upiId') as string
      });
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            Settings
          </h1>
          <p className="text-charcoal-light text-sm mt-1">
            Manage your studio preferences.
          </p>
        </div>
        {showSuccess &&
        <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Settings saved
          </div>
        }
      </div>

      <Card className="p-6 border-none shadow-sm">
        <h2 className="font-serif font-semibold text-lg text-charcoal mb-4">
          Business Information
        </h2>
        <div className="space-y-4">
          <Input
            name="businessName"
            label="Studio Name"
            defaultValue={settings.businessName}
            required />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="email"
              type="email"
              label="Contact Email"
              defaultValue={settings.email}
              required />
            
            <Input
              name="phone"
              label="Phone Number"
              defaultValue={settings.phone}
              required />
            
          </div>
          <Input
            name="whatsappNumber"
            label="WhatsApp Number"
            defaultValue={settings.whatsappNumber}
            required />
          
          <Input
            name="address"
            label="Studio Address"
            defaultValue={settings.address}
            required />
          
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm">
        <h2 className="font-serif font-semibold text-lg text-charcoal mb-4">
          Shipping & Delivery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="shippingFlatRate"
            label="Standard Shipping Rate (₹)"
            type="number"
            defaultValue={settings.shippingFlatRate}
            required />
          
          <Input
            name="freeShippingThreshold"
            label="Free Shipping Threshold (₹)"
            type="number"
            defaultValue={settings.freeShippingThreshold}
            required />
          
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm">
        <h2 className="font-serif font-semibold text-lg text-charcoal mb-4">
          Payment Settings
        </h2>
        <div className="space-y-4">
          <Input
            name="upiId"
            label="UPI ID"
            defaultValue={settings.upiId}
            required />
          
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSaving}>
          Save Changes
        </Button>
      </div>
    </form>);

}