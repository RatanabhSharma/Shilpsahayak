import { useCallback, useEffect, useState } from 'react';

export type PincodeLocation = {
  city: string;
  state: string;
  district: string;
  country: string;
  pincode: string;
  availableCities: string[];
};

type PincodeApiPostOffice = {
  Name?: string;
  Block?: string;
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
  
  // Helper to clean up India Post names (removes " HO", " SO", " BO" etc.)
  const cleanPostOfficeName = (name: string) => {
    return name.replace(/\s+(B\.?O\.?|S\.?O\.?|H\.?O\.?)$/i, '').trim();
  };

  const nameOptions: string[] = [];
  const blockOptions: string[] = [];

  result.PostOffice.forEach(po => {
    if (po.Name && po.Name !== 'NA') {
      nameOptions.push(cleanPostOfficeName(po.Name));
    }
    if (po.Block && po.Block !== 'NA') {
      const cleanedBlock = cleanPostOfficeName(po.Block);
      if (!nameOptions.includes(cleanedBlock)) {
        blockOptions.push(cleanedBlock);
      }
    }
  });

  // Remove duplicate names
  const uniqueNames = Array.from(new Set(nameOptions));
  const uniqueBlocks = Array.from(new Set(blockOptions));
  const district = office.District && office.District !== 'NA' ? cleanPostOfficeName(office.District) : '';

  // All options: specific names → blocks → district
  const availableCities = [
    ...uniqueNames,
    ...uniqueBlocks,
    ...(district && !uniqueNames.includes(district) && !uniqueBlocks.includes(district) ? [district] : []),
  ];

  // Default: prefer first specific name (e.g. "Chowhati"), then block, then district
  const defaultCity = uniqueNames[0] || uniqueBlocks[0] || district || cleanPostOfficeName(office.District || '');

  return {
    city: defaultCity,
    state: office.State,
    district: office.District,
    country: office.Country || 'India',
    pincode: cleanPincode,
    availableCities,
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
