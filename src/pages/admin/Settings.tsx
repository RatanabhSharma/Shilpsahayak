import React, {
  useEffect,
  useState
} from 'react';

import {
  CheckCircle2,
  Loader2
} from 'lucide-react';

import {
  Card,
  Input,
  Button
} from '../../components/ui';

import {
  Settings as SettingsType,
  useStore
} from '../../store';

import {
  useSettings,
  useUpdateSettings
} from '../../hooks/useSettings';

export function Settings() {
  const localSettings = useStore(
    (state) => state.settings
  );

  const {
    data: firestoreSettings,
    isLoading,
    isError
  } = useSettings();

  const updateSettings = useUpdateSettings();

  const [form, setForm] =
    useState<SettingsType>(localSettings);

  const [showSuccess, setShowSuccess] =
    useState(false);

  /*
   * When Firestore settings load,
   * update the form.
   */
  useEffect(() => {
    if (firestoreSettings) {
      setForm(firestoreSettings);
    }
  }, [firestoreSettings]);

  const updateField = <
    K extends keyof SettingsType
  >(
    field: K,
    value: SettingsType[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      await updateSettings.mutateAsync({
        businessName:
          form.businessName.trim(),

        email:
          form.email.trim(),

        whatsappNumber:
          form.whatsappNumber.trim(),

        phone:
          form.phone.trim(),

        address:
          form.address.trim(),

        shippingFlatRate:
          Number(form.shippingFlatRate) || 0,

        freeShippingThreshold:
          Number(
            form.freeShippingThreshold
          ) || 0,

        upiId:
          form.upiId.trim()
      });

      setShowSuccess(true);

      window.setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error(
        'Failed to save settings:',
        error
      );

      alert(
        'Failed to save settings. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />

        <p className="ml-3 text-sm text-charcoal-light">
          Loading settings...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
        Failed to load settings.
        Please refresh the page and try again.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-3xl"
    >

      {/* Header */}
      <div className="flex justify-between items-center gap-4">

        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            Settings
          </h1>

          <p className="text-charcoal-light text-sm mt-1">
            Manage your studio preferences.
          </p>
        </div>

        {showSuccess && (
          <div className="
            flex
            items-center
            text-green-600
            bg-green-50
            px-3
            py-1.5
            rounded-xl
            text-sm
            font-medium
          ">
            <CheckCircle2 className="w-4 h-4 mr-2" />

            Settings saved
          </div>
        )}

      </div>

      {/* Business Information */}
      <Card className="p-6 border-none shadow-sm">

        <h2 className="
          font-serif
          font-semibold
          text-lg
          text-charcoal
          mb-4
        ">
          Business Information
        </h2>

        <div className="space-y-4">

          <Input
            name="businessName"
            label="Studio Name"
            value={form.businessName}
            onChange={(e) =>
              updateField(
                'businessName',
                e.target.value
              )
            }
            required
          />

          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-4
          ">

            <Input
              name="email"
              type="email"
              label="Business Email"
              value={form.email}
              onChange={(e) =>
                updateField(
                  'email',
                  e.target.value
                )
              }
              placeholder="hello@shilpsahayak.com"
              required
            />

            <Input
              name="phone"
              type="tel"
              label="Phone Number"
              value={form.phone}
              onChange={(e) =>
                updateField(
                  'phone',
                  e.target.value
                )
              }
              required
            />

          </div>

          <Input
            name="whatsappNumber"
            type="tel"
            label="WhatsApp Number"
            value={form.whatsappNumber}
            onChange={(e) =>
              updateField(
                'whatsappNumber',
                e.target.value
              )
            }
            required
          />

          <Input
            name="address"
            label="Studio Address"
            value={form.address}
            onChange={(e) =>
              updateField(
                'address',
                e.target.value
              )
            }
            required
          />

        </div>
      </Card>

      {/* Shipping */}
      <Card className="p-6 border-none shadow-sm">

        <h2 className="
          font-serif
          font-semibold
          text-lg
          text-charcoal
          mb-4
        ">
          Shipping & Delivery
        </h2>

        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-4
        ">

          <Input
            name="shippingFlatRate"
            label="Standard Shipping Rate (₹)"
            type="number"
            min="0"
            value={form.shippingFlatRate}
            onChange={(e) =>
              updateField(
                'shippingFlatRate',
                Number(e.target.value)
              )
            }
            required
          />

          <Input
            name="freeShippingThreshold"
            label="Free Shipping Threshold (₹)"
            type="number"
            min="0"
            value={form.freeShippingThreshold}
            onChange={(e) =>
              updateField(
                'freeShippingThreshold',
                Number(e.target.value)
              )
            }
            required
          />

        </div>
      </Card>

      {/* Payment */}
      <Card className="p-6 border-none shadow-sm">

        <h2 className="
          font-serif
          font-semibold
          text-lg
          text-charcoal
          mb-4
        ">
          Payment Settings
        </h2>

        <div className="space-y-4">

          <Input
            name="upiId"
            label="UPI ID"
            value={form.upiId}
            onChange={(e) =>
              updateField(
                'upiId',
                e.target.value
              )
            }
            placeholder="yourname@upi"
          />

        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end">

        <Button
          type="submit"
          isLoading={updateSettings.isPending}
        >
          {updateSettings.isPending
            ? 'Saving...'
            : 'Save Changes'}
        </Button>

      </div>

    </form>
  );
}
