import { NextResponse } from 'next/server';
import { accessAllowed,mutationAllowed } from '@/lib/auth';
import { loadPipeline } from '@/lib/store';
import { importProspects,normalizePeople } from '@/lib/prospects';
export const runtime='nodejs';
export async function GET(request:Request){
  if(!await accessAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const data=await loadPipeline();return NextResponse.json({prospects:data.prospects??[],apolloConfigured:process.env.KEENA_DEMO!=='1'&&!!process.env.APOLLO_API_KEY},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
  if(!await accessAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!mutationAllowed(request))return NextResponse.json({error:'Unapproved origin'},{status:403});
  try{const raw=await request.text();if(raw.length>100000)return NextResponse.json({error:'Request too large'},{status:413});const body=JSON.parse(raw);return NextResponse.json(importProspects(normalizePeople(body.people)));}catch{return NextResponse.json({error:'Invalid prospect import'},{status:400});}
}
