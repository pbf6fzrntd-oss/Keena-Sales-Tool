"""Read an active-client XLSX with the Python standard library; keep data local."""
import argparse
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('workbook', type=Path)
parser.add_argument('--output', type=Path, default=Path('.local/clients.json'))
args = parser.parse_args()
if '.local' not in args.output.parts:
    parser.error('Output must be inside an ignored .local directory')
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
free = {'gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','live.com','msn.com','comcast.net','att.net','verizon.net','sbcglobal.net','bellsouth.net'}
accounts = {}
contact_rows = 0
with zipfile.ZipFile(args.workbook) as archive:
    strings = []
    if 'xl/sharedStrings.xml' in archive.namelist():
        strings = [''.join(t.text or '' for t in cell.iter() if t.tag.endswith('}t')) for cell in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    for filename in archive.namelist():
        if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml', filename):
            continue
        headers = None
        for row in ET.fromstring(archive.read(filename)).findall('.//s:row', ns):
            values = {}
            for cell in row.findall('s:c', ns):
                column = re.sub(r'\d+', '', cell.attrib['r'])
                value = cell.find('s:v', ns)
                value = value.text or '' if value is not None else ''.join(t.text or '' for t in cell.iter() if t.tag.endswith('}t'))
                values[column] = strings[int(value)] if cell.attrib.get('t') == 's' else value
            if headers is None:
                if 'COMPANYNAME' in values.values():
                    headers = values
                continue
            record = {headers.get(c, c): v.strip() for c, v in values.items()}
            name = record.get('COMPANYNAME', '')
            if not name:
                continue
            contact_rows += 1
            account = accounts.setdefault(name, {'name':name,'aliases':set(),'domains':set(),'states':set(),'contacts':[]})
            if record.get('COMPANYNAME_CLEAN'):
                account['aliases'].add(record['COMPANYNAME_CLEAN'])
            if record.get('STATE'):
                account['states'].add(record['STATE'])
            email = record.get('EMAIL','')
            if re.fullmatch(r'[^\s@]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}', email):
                domain = email.rsplit('@',1)[1].lower()
                if domain not in free:
                    account['domains'].add(domain)
            account['contacts'].append({'name':' '.join(filter(None,[record.get('FIRSTNAME'),record.get('LASTNAME')])),'title':record.get('TITLE',''),'email':email,'identityMatch':record.get('MATCH_STATUS','')})
if not accounts:
    parser.error('No COMPANYNAME rows found; existing registry was not changed')
clients = [{**a, 'aliases':sorted(a['aliases']), 'domains':sorted(a['domains']), 'states':sorted(a['states'])} for a in accounts.values()]
args.output.parent.mkdir(parents=True,exist_ok=True)
temporary = args.output.with_suffix('.tmp')
temporary.write_text(json.dumps({'schemaVersion':1,'source':'User supplied active-client workbook','importedAt':datetime.now(timezone.utc).isoformat(),'clients':clients},indent=2))
temporary.replace(args.output)
print(f'Imported {len(clients)} active-client names from {contact_rows} contact rows. Contacts remain local.')
