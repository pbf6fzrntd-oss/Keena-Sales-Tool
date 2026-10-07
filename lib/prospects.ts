import { mutatePipeline } from './store';
import type { Prospect } from './prospect-types';
export { PROSPECT_STAGES } from './prospect-types';
export type { Prospect } from './prospect-types';
function text(value: unknown, max=240): string { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
export function normalizePeople(value: unknown): Prospect[] {
  if (!Array.isArray(value) || value.length>100) throw Error('Invalid Apollo results');
  const rows = value.map(raw => {
    if (!raw || typeof raw !== 'object') throw Error('Invalid Apollo person');
    const p = raw as Record<string,unknown>;
    if (typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)) throw Error('Invalid Apollo ID');
    const org = p.organization && typeof p.organization === 'object' ? p.organization as Record<string,unknown> : {};
    return { id:p.id, name:text(p.name) || [text(p.first_name),text(p.last_name)||text(p.last_name_obfuscated)].filter(Boolean).join(' ') || 'Name unavailable', title:text(p.title), organization:text(org.name), domain:text(org.primary_domain), source:'apollo' as const, importedAt:new Date().toISOString(), stage:'new' as const, notes:'',version:0 };
  });
  return [...new Map(rows.map(p=>[p.id,p])).values()];
}
export function importProspects(rows: Prospect[], file?: string) {
  return mutatePipeline(data=>{
    data.prospects ??= [];
    const ids = new Set(data.prospects.map(p=>p.id)); let added=0;
    for(const p of rows) if(!ids.has(p.id)){data.prospects.push({...p,stage:'new',notes:'',version:0});ids.add(p.id);added++;}
    return {added,duplicates:rows.length-added};
  },file);
}
export function updateProspect(id:string, patch:{stage?:Prospect['stage'];notes?:string}, version:number, file?:string){
  return mutatePipeline(data=>{const p=data.prospects?.find(p=>p.id===id);if(!p)return null;if(p.version!==version)throw Error('stale_version');Object.assign(p,patch,{version:p.version+1});return structuredClone(p);},file);
}
