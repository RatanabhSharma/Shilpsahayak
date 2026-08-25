import { useCallback, useEffect, useState } from 'react';

export type PincodeLocation = {
  city: string;
  state: string;
  district: string;
  country: string;
  pincode: string;
};

type PincodeApiPostOffice = {
  District?: string;
  State?: string;
  Country?: string;
  Pincode?: string;
};

type PincodeApiResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: PincodeApiPostOffice[] | null;
};

const API_BASE = 'https://api.postalpincode.in/pincode';

export async function lookupPincode(
  pincode: string
): Promise<PincodeLocation> {
  const cleanPincode = pincode
    .replace(/\D/g, '')
    .slice(0, 6);

  if (!/^\d{6}$/.test(cleanPincode)) {
    throw new Error('Enter a valid 6-digit PIN code.');
  }

  const response = await fetch(
    `${API_BASE}/${cleanPincode}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      'Unable to check this PIN code right now.'
    );
  }

  const data =
    (await response.json()) as PincodeApiResponse[];

  const result = data?.[0];

  if (
    !result ||
    result.Status?.toLowerCase() !== 'success' ||
    !result.PostOffice?.length
  ) {
    throw new Error(
      'We could not find this PIN code. Please check it or enter the city and state manually.'
    );
  }

  const office = result.PostOffice[0];

  if (!office.District || !office.State) {
    throw new Error(
      'Location details are unavailable for this PIN code.'
    );
  }

  return {
    city: office.District,
    state: office.State,
    district: office.District,
    country: office.Country || 'India',
    pincode: cleanPincode,
  };
}

export function usePincodeLookup(
  pincode: string,
  enabled = true
) {
  const [location, setLocation] =
    useState<PincodeLocation | null>(null);

  const [isLookingUp, setIsLookingUp] =
    useState(false);

  const [error, setError] =
    useState('');

  const lookup = useCallback(
    async (value = pincode) => {
      const cleanPincode = value
        .replace(/\D/g, '')
        .slice(0, 6);

      if (!/^\d{6}$/.test(cleanPincode)) {
        setLocation(null);
        setError('');
        return null;
      }

      setIsLookingUp(true);
      setError('');

      try {
        const result =
          await lookupPincode(cleanPincode);

        setLocation(result);
        return result;
      } catch (lookupError) {
        setLocation(null);
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : 'Unable to detect this PIN code.'
        );
        return null;
      } finally {
        setIsLookingUp(false);
      }
    },
    [pincode]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cleanPincode = pincode
      .replace(/\D/g, '')
      .slice(0, 6);

    if (cleanPincode.length !== 6) {
      setLocation(null);
      setError('');
      return;
    }

    const timer = window.setTimeout(() => {
      void lookup(cleanPincode);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, lookup, pincode]);

  return {
    location,
    isLookingUp,
    error,
    lookup,
  };
}
