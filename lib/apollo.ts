import { normalizePeople } from './prospects';
export interface ApolloFilters {domains:string[];titles:string[];locations:string[];page:number;}
export class ApolloError extends Error { constructor(message:string,public status:number){super(message);} }
export function validateFilters(body:unknown):ApolloFilters {
  if(!body || typeof body!=='object' || Array.isArray(body))throw new ApolloError('Invalid search',400);
  const b=body as Record<string,unknown>;
  if(!Object.keys(b).every(k=>['domains','titles','locations','page'].includes(k)))throw new ApolloError('Unsupported search field',400);
  const list=(key:string)=>{const v=b[key]??[];if(!Array.isArray(v)||v.length>10||v.some(s=>typeof s!=='string'||!s.trim()||s.length>120))throw new ApolloError('Invalid '+key,400);return (v as string[]).map(s=>s.trim());};
  const domains=list('domains'),titles=list('titles'),locations=list('locations');
  if(domains.some(d=>! /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(d)))throw new ApolloError('Enter company domains without https://',400);
  if(!domains.length)throw new ApolloError('Specify at least one healthcare company domain to scope search',400);
  const page=b.page??1;if(!Number.isInteger(page)||Number(page)<1||Number(page)>500)throw new ApolloError('Invalid page',400);
  return {domains,titles,locations,page:Number(page)};
}
export async function searchApollo(filters:ApolloFilters,key=process.env.APOLLO_API_KEY,fetcher:typeof fetch=fetch){
  if(!key)throw new ApolloError('Apollo is not connected. Set APOLLO_API_KEY on the local server.',503);
  let response:Response;
  try{response=await fetcher('https://api.apollo.io/api/v1/mixed_people/api_search',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key},body:JSON.stringify({q_organization_domains_list:filters.domains,person_titles:filters.titles,person_locations:filters.locations,page:filters.page,per_page:25}),signal:AbortSignal.timeout(15000),cache:'no-store'});}catch{throw new ApolloError('Apollo request timed out or could not connect. Retry manually.',502);}
  if(!response.ok)throw new ApolloError(response.status===429?'Apollo rate limit reached. Wait before retrying.':response.status===401||response.status===403?'Apollo key or endpoint access was rejected.':'Apollo search unavailable.',response.status===429?429:502);
  try{const result=await response.json();return {people:normalizePeople(result.people),total:typeof result.total_entries==='number'?result.total_entries:null,page:filters.page};}catch{throw new ApolloError('Apollo returned invalid search results.',502);}
}
