import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {accountKey,clientCheck,loadClients,type ClientRegistry} from '../lib/clients';
import {offeringMatches} from '../lib/offerings';
import {ingestCandidates} from '../lib/ingest';
import {importProspects,normalizePeople} from '../lib/prospects';
import {loadPipeline} from '../lib/store';
const registry:ClientRegistry={schemaVersion:1,clients:[{name:'Fictional Harbor & Valley LLC',aliases:['Fictional HV Clinic'],domains:['fictional-hv.example','gmail.com'],relatedNames:['Fictional Parent Health'],relatedDomains:['parent.example']}]};
test('client screening normalizes names, uses aliases, reviews domains and never excludes personal email providers',()=>{
 assert.equal(accountKey('Fictional Harbor & Valley, LLC'),accountKey('Fictional Harbor and Valley'));
 assert.equal(clientCheck('Fictional HV Clinic','',registry).status,'existing_client');
 assert.equal(clientCheck('Other Org','www.fictional-hv.example',registry).status,'review');
 assert.equal(clientCheck('Other Org','gmail.com',registry).status,'no_match');
 assert.equal(clientCheck('Unlisted Subsidiary','sub.fictional-hv.example',registry).status,'no_match');
 assert.equal(clientCheck('Fictional Parent Health','',registry).status,'review');
 assert.equal(clientCheck('Other Name','parent.example',registry).status,'review');
 assert.equal(clientCheck('Unknown','',null).status,'unavailable');
});
test('missing registry is visible, malformed registry fails closed',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'keena-clients-'));try{
  assert.equal(loadClients(path.join(dir,'missing')),null);
  const file=path.join(dir,'bad');writeFileSync(file,'{"schemaVersion":1,"clients":[{}]}');assert.throws(()=>loadClients(file));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('active clients are excluded before cap and Apollo imports, with counters and no stored contacts',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'keena-client-import-')),previous=process.env.KEENA_CLIENTS_FILE;
 try{
  const clientFile=path.join(dir,'clients.json');writeFileSync(clientFile,JSON.stringify(registry));process.env.KEENA_CLIENTS_FILE=clientFile;
  const file=path.join(dir,'pipeline.json');
  const r=await ingestCandidates([{sourceType:'rfp',organization:'Fictional HV Clinic',title:'EHR migration',text:'EHR conversion',url:'https://example.invalid/rfp'}],new Date(),file);
  assert.equal(r.run.skippedExistingClient,1);assert.equal(r.addedLeads.length,0);
  const rows=normalizePeople([{id:'fake1',organization:{name:'Different Name',primary_domain:'fictional-hv.example'}},{id:'fake2',organization:{name:'New Account',primary_domain:'new.example'}}]);
  const result=importProspects(rows,file);assert.equal(result.blockedExistingClient,1);assert.equal(result.added,1);assert.equal((await loadPipeline(file)).prospects?.[0].id,'fake2');
 }finally{if(previous===undefined)delete process.env.KEENA_CLIENTS_FILE;else process.env.KEENA_CLIENTS_FILE=previous;rmSync(dir,{recursive:true,force:true});}
});
test('specific pain maps to named products and buyer roles; generic Epic employment alone does not',()=>{
 const products=offeringMatches('Manual document indexing with scan backlog and records release delays; HL7 interfaces need work');
 assert.ok(products.some(p=>p.product.startsWith('InteleFiler')));assert.ok(products.some(p=>p.product==='Chart2PDF'));assert.ok(products.some(p=>p.product.startsWith('Interfaces')));assert.ok(products.every(p=>p.buyerTitles.length&&p.slides));
 assert.equal(offeringMatches('Healthcare employer using Epic').length,0);
});
