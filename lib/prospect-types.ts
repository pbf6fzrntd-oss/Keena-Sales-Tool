export const PROSPECT_STAGES = ['new', 'researching', 'contacted', 'meeting', 'do_not_contact'] as const;
export interface Prospect {
  id: string; name: string; title: string; organization: string; domain: string;
  source: 'apollo'; importedAt: string; stage: typeof PROSPECT_STAGES[number]; notes: string; version: number;
}
