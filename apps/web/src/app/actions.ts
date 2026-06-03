'use server';

import { createCoverageRequest } from '@/lib/data';

export interface CoverageState {
  ok: boolean;
  message: string;
}

export async function requestCoverage(
  _prev: CoverageState,
  formData: FormData,
): Promise<CoverageState> {
  const jurisdictionName = String(formData.get('jurisdictionName') ?? '').trim();
  if (!jurisdictionName) return { ok: false, message: 'Please enter a jurisdiction name.' };
  const state = String(formData.get('state') ?? '').trim() || undefined;
  const email = String(formData.get('email') ?? '').trim() || undefined;

  const saved = await createCoverageRequest({ jurisdictionName, state, email });
  return saved
    ? { ok: true, message: 'Thanks — we’ll prioritize it.' }
    : { ok: false, message: 'Could not save right now (no database configured). Try again later.' };
}
