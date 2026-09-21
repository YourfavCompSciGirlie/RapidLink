import type { ProfileInput } from './profile-service';

export type ProfileErrors = Partial<Record<keyof ProfileInput | 'pin' | 'confirmPin' | 'currentPin', string>>;

export const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '').replace(/^\+27/, '0');
export const isSouthAfricanPhone = (value: string) => /^0[6-8][0-9]{8}$/.test(normalizePhone(value));

export const validateProfile = (input: ProfileInput): ProfileErrors => {
  const errors: ProfileErrors = {};
  if (!input.name.trim()) errors.name = 'Enter your name.';
  if (!input.surname.trim()) errors.surname = 'Enter your surname.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = 'Enter a valid email address.';
  if (!/^\d{13}$/.test(input.southAfricanId)) errors.southAfricanId = 'South African ID must contain exactly 13 digits.';
  if (!isSouthAfricanPhone(input.phone)) errors.phone = 'Enter a valid South African mobile number.';
  if (!input.nextOfKin.name.trim()) errors.nextOfKin = 'Enter your next-of-kin name.';
  if (!isSouthAfricanPhone(input.nextOfKin.phone)) errors.nextOfKin = errors.nextOfKin ?? 'Enter a valid next-of-kin mobile number.';
  return errors;
};

export const validatePin = (pin: string, confirmation: string): Pick<ProfileErrors, 'pin' | 'confirmPin'> => {
  const errors: Pick<ProfileErrors, 'pin' | 'confirmPin'> = {};
  if (!/^\d{6}$/.test(pin)) errors.pin = 'Enter exactly six numerical digits.';
  if (pin !== confirmation) errors.confirmPin = 'The PINs do not match.';
  return errors;
};
