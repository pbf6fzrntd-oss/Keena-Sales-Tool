// Product mapping reviewed against the supplied comprehensive sales deck.
// These are service hypotheses, not evidence of purchase intent or installed products.
const RULES = [
  {product:'EHR/PM Conversions', match:/\b(?:EHR|EMR|electronic health record|practice management|PM)\b.{0,50}\b(?:migration|conversion|transition|replacement)\b/i, buyerTitles:['CIO','IT Director','EHR Program Director'],slides:'65–69, 195–198'},
  {product:'KeenaArchive (tier needs discovery)',match:/\blegacy\b.{0,50}\b(?:retirement|retire|decommission|archiv|retention)|\b(?:physician offboarding|records? retention|data archival)\b/i,buyerTitles:['CIO','HIM Director','IT Director'],slides:'32–48'},
  {product:'InteleFiler / Documentation Optimization',match:/\b(?:document|fax|scan|indexing)\b.{0,50}\b(?:backlog|misfil|manual|routing|automation)|\bmanual\b.{0,35}\b(?:indexing|document filing)|\bInteleFiler\b/i,buyerTitles:['HIM Director','Medical Records Manager','Clinical Systems Director'],slides:'70–94'},
  {product:'Chart2PDF',match:/\brelease of (?:patient )?records|\brecords? release|\bChart2PDF\b/i,buyerTitles:['HIM Director','Medical Records Manager'],slides:'125–130'},
  {product:'EHR Barcode Reader',match:/\b(?:medication|vaccine|immunization)\b.{0,40}\b(?:barcode|scanning)|\bbarcode\b.{0,40}\b(?:medication|vaccine|immunization)/i,buyerTitles:['Clinical Operations Director','Nursing Director','CMIO'],slides:'131–150'},
  {product:'FotoFiler',match:/\b(?:clinical|patient|wound|dermatology)\b.{0,40}\bphoto(?:s|graphy)?\b|\bFotoFiler\b/i,buyerTitles:['Clinical Operations Director','Practice Administrator','CMIO'],slides:'211–215'},
  {product:'KeenaMe / Workflow Enhancers',match:/\b(?:EHR|PM)\b.{0,40}\b(?:personalization|too many clicks)|\b(?:CPTII|CPT II|care management indicator|automated (?:user|account) provisioning)\b/i,buyerTitles:['CMIO','Clinical Informatics Director','IT Director'],slides:'113–123, 170–178'},
  {product:'Interfaces / Custom Integration',match:/\b(?:HL7|FHIR|Qvera|interface engine|interoperability|Epic Bridges)\b/i,buyerTitles:['Integration Director','IT Director','CIO'],slides:'151–156, 187–190'},
  {product:'Claims Automation / ACO Advisory',match:/\bclaims\b.{0,40}\b(?:automation|cleanup|analysis|analytics|processing)|\bACO\b.{0,40}\b(?:advisory|claims|data)/i,buyerTitles:['Revenue Cycle Director','Value-based Care Director','CFO'],slides:'119, 165, 175, 185'},
  {product:'Data Analytics / ETL / MDM',match:/\b(?:ETL|master data management|MDM|payer data|custom clinical reporting|claims analytics)\b/i,buyerTitles:['Analytics Director','CIO','Value-based Care Analytics Director'],slides:'180–186'},
  {product:'Epic Consulting / Post Implementation Review',match:/\bEpic\b.{0,60}\b(?:analyst|consulting|optimization|training|reporting|implementation)\b/i,buyerTitles:['Epic Program Director','Clinical Applications Director','CIO'],slides:'191–210'},
];
export function offeringMatches(text: string) {
  return RULES.flatMap(({match,...rule})=>{const result=match.exec(text);return result?[{...rule,matchedOn:result[0]}]:[];});
}
