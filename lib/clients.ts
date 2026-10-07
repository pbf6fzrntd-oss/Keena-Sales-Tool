import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface ClientAccount { name: string; aliases?: string[]; domains?: string[]; relatedNames?: string[]; relatedDomains?: string[]; }
export interface ClientRegistry { schemaVersion: 1; clients: ClientAccount[]; importedAt?: string; }
const PERSONAL_DOMAINS = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','live.com','msn.com','comcast.net','att.net','verizon.net','sbcglobal.net','bellsouth.net']);
export function accountKey(name: string) {
  return name.normalize('NFKC').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+(incorporated|inc|llc|ltd|corp|corporation)$/, '').trim();
}
export function domainKey(domain: string) { return domain.toLowerCase().trim().replace(/^www\./,'').replace(/\.$/,''); }
export function loadClients(file = process.env.KEENA_CLIENTS_FILE || path.join(process.cwd(),'.local','clients.json')): ClientRegistry | null {
  // Demo never reads the operator's customer registry.
  if (process.env.KEENA_DEMO === '1') return null;
  let raw: string;
  try { raw = readFileSync(file,'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
  const data = JSON.parse(raw);
  if (data.schemaVersion !== 1 || !Array.isArray(data.clients) || data.clients.some((c:ClientAccount)=>!c || typeof c.name !== 'string' || !c.name.trim() || (c.aliases && (!Array.isArray(c.aliases)||c.aliases.some(a=>typeof a!=='string'))) || (c.domains && (!Array.isArray(c.domains)||c.domains.some(d=>typeof d!=='string'))) || (c.relatedNames && (!Array.isArray(c.relatedNames)||c.relatedNames.some(n=>typeof n!=='string'))) || (c.relatedDomains && (!Array.isArray(c.relatedDomains)||c.relatedDomains.some(d=>typeof d!=='string'))))) throw Error('Invalid local active-client registry');
  return data;
}
export function clientCheck(organization: string, domain = '', registry: ClientRegistry | null = loadClients()) {
  if (!registry) return { status: 'unavailable' as const, reason: 'Active-client registry unavailable; review before outreach' };
  const key = accountKey(organization), host = domainKey(domain);
  const nameMatch = key && registry.clients.find(c=>[c.name,...c.aliases??[]].some(n=>accountKey(n)===key));
  if (nameMatch) return { status: 'existing_client' as const, reason: 'Active-client name match; route to account owner' };
  const relatedMatch = registry.clients.some(c=>(key && c.relatedNames?.some(n=>accountKey(n)===key)) || (host && !PERSONAL_DOMAINS.has(host) && c.relatedDomains?.some(d=>domainKey(d)===host)));
  if (relatedMatch) return { status: 'review' as const, reason: 'Affiliated with an active client; account owner must confirm coverage before outreach' };
  const domainMatch = host && !PERSONAL_DOMAINS.has(host) && registry.clients.some(c=>c.domains?.some(d=>domainKey(d)===host));
  // Contact email domains are suppression hints, not verified ownership or affiliation.
  if (domainMatch) return { status: 'review' as const, reason: 'Domain overlaps an active-client contact; verify affiliation with account owner' };
  return { status: 'no_match' as const, reason: 'No exact client match; parent companies and aliases still require review' };
}
