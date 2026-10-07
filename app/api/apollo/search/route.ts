import { NextResponse } from 'next/server';
import { accessAllowed,mutationAllowed } from '@/lib/auth';
import { ApolloError,searchApollo,validateFilters } from '@/lib/apollo';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!await accessAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!mutationAllowed(request))return NextResponse.json({error:'Unapproved origin'},{status:403});
  if(process.env.KEENA_DEMO==='1')return NextResponse.json({error:'Live Apollo search is disabled in demo mode.'},{status:403});
  try{const raw=await request.text();if(raw.length>10000)return NextResponse.json({error:'Request too large'},{status:413});return NextResponse.json(await searchApollo(validateFilters(JSON.parse(raw))));}
  catch(e){return NextResponse.json({error:e instanceof ApolloError?e.message:'Invalid search request'},{status:e instanceof ApolloError?e.status:400});}
}
