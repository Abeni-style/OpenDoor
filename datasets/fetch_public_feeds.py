#!/usr/bin/env python3
"""Collect candidate opportunity announcements from permitted public RSS/Atom/JSON feeds.

This does not crawl the whole web. Populate feed_url only after reviewing the provider's terms.
Every result is pending_review; eligibility, funding and deadlines require a human check.
"""
import argparse, csv, json, re, time, hashlib, urllib.request, urllib.error
from pathlib import Path
from xml.etree import ElementTree as ET
from datetime import datetime, timezone

FIELDS=['id','title','provider','category','description','official_url','application_url','min_age','max_age','age_notes','eligible_countries','excluded_countries','regions','education_levels','grades','subjects','modality','host_country','language','funding_type','funding_details','fee','opens_on','deadline','deadline_timezone','deadline_type','opportunity_status','duration','required_documents','application_steps','source_type','verification_status','last_checked','next_review','verified_by','notes','record_type']
UA='OpenDoor-Opportunity-Indexer/1.0 (respectful public-feed collector; configure contact email in source registry)'

def local(tag): return tag.rsplit('}',1)[-1].lower()
def child_text(el, names):
    for node in el.iter():
        if local(node.tag) in names and (node.text or '').strip(): return ' '.join((node.text or '').split())
    return ''
def child_link(el):
    for node in el.iter():
        if local(node.tag)=='link':
            href=node.attrib.get('href')
            if href and node.attrib.get('rel','alternate') in ('alternate',''): return href
            if node.text and node.text.strip().startswith('http'): return node.text.strip()
    return ''
def parse_feed(body, provider, category, feed_url):
    root=ET.fromstring(body); found=[]
    for item in root.iter():
        if local(item.tag) not in ('item','entry'): continue
        title=child_text(item,{'title'}); link=child_link(item); desc=child_text(item,{'description','summary','content','encoded'})
        if not title or not link: continue
        found.append({'id':'feed-'+hashlib.sha256((provider+'|'+title+'|'+link).encode('utf-8')).hexdigest()[:20],'title':title,'provider':provider,'category':category or 'Other','description':(desc or 'Announcement discovered in a provider feed. Review the official page for full details.')[:1600],'official_url':link,'application_url':'','min_age':'','max_age':'','age_notes':'Not extracted; verify on official page','eligible_countries':'','excluded_countries':'','regions':'','education_levels':'','grades':'','subjects':'','modality':'Not stated','host_country':'Not stated','language':'Not stated','funding_type':'Not stated','funding_details':'Not stated; verify on official page','fee':'Not stated','opens_on':'','deadline':'','deadline_timezone':'','deadline_type':'Not stated','opportunity_status':'Discovered; current cycle not verified','duration':'','required_documents':'','application_steps':'','source_type':'RSS/Atom feed candidate','verification_status':'pending_review','last_checked':datetime.now(timezone.utc).date().isoformat(),'next_review':'','verified_by':'','notes':'Feed-discovered candidate. Confirm this is a current opportunity, verify age/country/grade/funding/deadline and application URL on the official provider page before publication. Feed: '+feed_url,'record_type':'feed_candidate'})
    return found

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--sources',default='source_registry.csv'); ap.add_argument('--out',default='feed_candidates.csv'); ap.add_argument('--report',default='feed_sync_report.json'); ap.add_argument('--max-per-source',type=int,default=50); ap.add_argument('--delay',type=float,default=1.5); args=ap.parse_args()
    rows=list(csv.DictReader(open(args.sources,encoding='utf-8-sig',newline=''))); candidates=[]; report=[]
    for s in rows:
        if str(s.get('active','')).lower() not in ('yes','true','1'): continue
        url=(s.get('feed_url') or '').strip()
        if str(s.get('terms_reviewed','')).lower() not in ('yes','true','1'):
            report.append({'provider':s.get('provider_name'),'status':'skipped','reason':'Terms not marked reviewed; feed collection blocked'}); continue
        if not url: report.append({'provider':s.get('provider_name'),'status':'skipped','reason':'No approved feed_url configured'}); continue
        try:
            req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/atom+xml, application/rss+xml, application/xml, application/json'})
            with urllib.request.urlopen(req,timeout=25) as response: body=response.read(5_000_000); ctype=response.headers.get('Content-Type','')
            if 'json' in ctype or url.lower().endswith('.json'):
                obj=json.loads(body.decode('utf-8')); items=obj if isinstance(obj,list) else obj.get('items',obj.get('data',[])); parsed=[]
                for x in items[:args.max_per_source]:
                    title=x.get('title') or x.get('name'); link=x.get('url') or x.get('link'); desc=x.get('description') or x.get('summary') or ''
                    if title and link: parsed.append({'id':'feed-'+hashlib.sha256((s.get('provider_name','')+'|'+title+'|'+link).encode('utf-8')).hexdigest()[:20],'title':title,'provider':s.get('provider_name',''),'category':s.get('category_scope') or 'Other','description':desc[:1600] or 'Announcement discovered in provider JSON feed.','official_url':link,'application_url':'','min_age':'','max_age':'','age_notes':'Not extracted; verify on official page','eligible_countries':'','excluded_countries':'','regions':'','education_levels':'','grades':'','subjects':'','modality':'Not stated','host_country':'Not stated','language':'Not stated','funding_type':'Not stated','funding_details':'Not stated','fee':'Not stated','opens_on':'','deadline':'','deadline_timezone':'','deadline_type':'Not stated','opportunity_status':'Discovered; current cycle not verified','duration':'','required_documents':'','application_steps':'','source_type':'JSON feed candidate','verification_status':'pending_review','last_checked':datetime.now(timezone.utc).date().isoformat(),'next_review':'','verified_by':'','notes':'Feed-discovered candidate. Verify all eligibility and application facts on the official source.','record_type':'feed_candidate'})
                parsed=parsed[:args.max_per_source]
            else: parsed=parse_feed(body,s.get('provider_name',''),s.get('category_scope',''),url)[:args.max_per_source]
            candidates.extend(parsed); report.append({'provider':s.get('provider_name'),'status':'success','records_found':len(parsed)})
        except Exception as e: report.append({'provider':s.get('provider_name'),'status':'error','reason':str(e)[:300]})
        time.sleep(max(0,args.delay))
    with open(args.out,'w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=FIELDS); w.writeheader(); w.writerows(candidates)
    Path(args.report).write_text(json.dumps({'run_at':datetime.now(timezone.utc).isoformat(),'candidate_count':len(candidates),'sources':report,'policy':'All feed records require manual verification.'},indent=2),encoding='utf-8')
    print(json.dumps({'candidate_count':len(candidates),'source_results':len(report),'output':args.out},indent=2))
if __name__=='__main__': main()
