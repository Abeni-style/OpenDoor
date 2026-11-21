#!/usr/bin/env python3
"""Normalize, validate and deduplicate OpenDoor opportunity CSV files."""
import argparse,csv,json,re
from pathlib import Path
from urllib.parse import urlparse
from datetime import date
REQ=('title','provider','category','description','official_url')
ALIASES={'name':'title','program_name':'title','opportunity_name':'title','organization':'provider','organizer':'provider','opportunity_type':'category','type':'category','summary':'description','overview':'description','url':'official_url','source_url':'official_url','website':'official_url','minage':'min_age','maxage':'max_age','countries':'eligible_countries','eligible_country':'eligible_countries','education_level':'education_levels','grade':'education_levels','funding':'funding_type','program_status':'opportunity_status','record_status':'verification_status'}
def key(x): return re.sub(r'\s+',' ',str(x or '').strip().lower())
def norm(row):
 out={}
 for k,v in row.items():
  nk=re.sub(r'[^a-z0-9]+','_',k.strip().lower()).strip('_'); nk=ALIASES.get(nk,nk); out[nk]=(v or '').strip()
 return out
def main():
 ap=argparse.ArgumentParser();ap.add_argument('inputs',nargs='+');ap.add_argument('--out',default='global_opportunities_clean.csv');ap.add_argument('--json',default='global_opportunities_clean.json');ap.add_argument('--report',default='catalogue_validation_report.json');args=ap.parse_args()
 today=date.today().isoformat(); valid=[]; issues=[]; warnings=[]; urls=set(); names=set(); read=0
 for src in args.inputs:
  with open(src,encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
  for ln,r0 in enumerate(rows,2):
   read+=1;r=norm(r0); problems=[]
   for k in REQ:
    if not r.get(k): problems.append('missing '+k)
   u=r.get('official_url','');p=urlparse(u)
   if u and (p.scheme!='https' or not p.netloc): problems.append('official_url must be HTTPS')
   for k in ('min_age','max_age'):
    if r.get(k):
     try:
      if int(r[k])<0: problems.append(k+' cannot be negative')
     except ValueError: problems.append(k+' must be an integer')
   if r.get('min_age') and r.get('max_age'):
    try:
     if int(r['min_age'])>int(r['max_age']): problems.append('min_age exceeds max_age')
    except: pass
   status=(r.get('verification_status') or 'pending_review').lower().replace(' ','_')
   if status not in ('verified','pending_review','expired','closed','needs_update'): problems.append('invalid verification_status')
   if status=='verified' and (not r.get('last_checked') or not r.get('verified_by')):
    r['verification_status']='pending_review';warnings.append({'source':src,'row':ln,'warning':'verified status downgraded: last_checked and verified_by required'})
   deadline=r.get('deadline','')
   if re.fullmatch(r'\d{4}-\d{2}-\d{2}',deadline):
    try:
     date.fromisoformat(deadline)
     if deadline<today and status not in ('closed','expired'): r['verification_status']='expired'
    except: problems.append('invalid ISO deadline')
   urlkey=key(u);namekey=key(r.get('title'))+'|'+key(r.get('provider'))
   if urlkey and urlkey in urls: problems.append('duplicate official_url')
   if namekey!='|' and namekey in names: problems.append('duplicate title/provider')
   if problems: issues.append({'source':src,'row':ln,'title':r.get('title',''),'issues':problems});continue
   urls.add(urlkey);names.add(namekey);r.setdefault('record_type','opportunity');r.setdefault('notes','');valid.append(r)
 if valid:
  cols=list(dict.fromkeys(k for r in valid for k in r))
  with open(args.out,'w',newline='',encoding='utf-8-sig') as f:w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(valid)
 Path(args.json).write_text(json.dumps({'generated_on':today,'opportunities':valid},ensure_ascii=False,indent=2),encoding='utf-8')
 report={'checked_on':today,'input_files':args.inputs,'rows_read':read,'valid_rows':len(valid),'rejected_rows':len(issues),'warnings':warnings,'issues':issues,'important':'A structurally valid record is not automatically verified. Source review is a separate human task.'}
 Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({k:report[k] for k in ('rows_read','valid_rows','rejected_rows')},indent=2))
if __name__=='__main__':main()
