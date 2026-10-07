import { NextResponse } from 'next/server';
import { accessAllowed,mutationAllowed } from '@/lib/auth';
import { PROSPECT_STAGES,updateProspect } from '@/lib/prospects';
export const runtime='nodejs';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await accessAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!mutationAllowed(request))return NextResponse.json({error:'Unapproved origin'},{status:403});
  try{const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:'Request too large'},{status:413});const b=JSON.parse(raw);
    if(!b||Array.isArray(b)||!Object.keys(b).every(k=>['stage','notes','version'].includes(k))||!Number.isInteger(b.version)||b.version<0||(b.stage!==undefined&&!PROSPECT_STAGES.includes(b.stage))||(b.notes!==undefined&&(typeof b.notes!=='string'||b.notes.length>5000)))return NextResponse.json({error:'Invalid prospect update'},{status:400});
    const patch:{stage?:typeof b.stage;notes?:string}={};if(b.stage!==undefined)patch.stage=b.stage;if(b.notes!==undefined)patch.notes=b.notes;
    const prospect=updateProspect((await params).id,patch,b.version);return NextResponse.json(prospect?{prospect}:{error:'Prospect not found'},{status:prospect?200:404});
  }catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='stale_version'?'Prospect changed; reload before saving.':'Invalid update'},{status:e instanceof Error&&e.message==='stale_version'?409:400});}
}
