import { NextResponse } from 'next/server';
import { accessAllowed,mutationAllowed } from '@/lib/auth';
import { ApolloError,searchApollo,validateFilters } from '@/lib/apollo';
import { clientCheck,loadClients } from '@/lib/clients';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!await accessAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!mutationAllowed(request))return NextResponse.json({error:'Unapproved origin'},{status:403});
  if(process.env.KEENA_DEMO==='1')return NextResponse.json({error:'Live Apollo search is disabled in demo mode.'},{status:403});
  try{const raw=await request.text();if(raw.length>10000)return NextResponse.json({error:'Request too large'},{status:413});const registry=loadClients(); if(!registry) return NextResponse.json({error:'Load your active-client registry before searching Apollo.'},{status:409}); const filters=validateFilters(JSON.parse(raw)); if(filters.domains.some(d=>clientCheck('',d,registry).status==='review'))return NextResponse.json({error:'A selected domain overlaps an active client. Review with the account owner.'},{status:409}); const result=await searchApollo(filters);return NextResponse.json({...result,people:result.people.map(p=>({...p,clientCheck:clientCheck(p.organization,p.domain,registry)}))});}
  catch(e){return NextResponse.json({error:e instanceof ApolloError?e.message:'Invalid search request'},{status:e instanceof ApolloError?e.status:400});}
}
