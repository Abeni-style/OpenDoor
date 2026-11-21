#!/usr/bin/env python3
"""Validate, normalize, deduplicate and expire OpenDoor CSV catalogue rows."""
import argparse, csv, json, re, sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

REQUIRED = {"title", "provider", "category", "description", "official_url"}
VALID_STATUS = {"pending_review", "verified", "needs_update", "closed", "expired"}

def clean(v): return (v or "").strip()
def key(v): return re.sub(r"\s+", " ", clean(v).lower())
def split(v): return [x.strip() for x in re.split(r"[;|]", clean(v)) if x.strip()]
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("input",type=Path)
    p.add_argument("--output",type=Path,default=Path("global_opportunities_clean.csv"))
    p.add_argument("--report",type=Path,default=Path("catalogue_validation_report.json"))
    a=p.parse_args()
    with a.input.open(encoding="utf-8-sig",newline="") as f: rows=list(csv.DictReader(f))
    seen_urls=set(); seen_names=set(); valid=[]; issues=[]; warnings=[]; today=date.today().isoformat()
    for n,row in enumerate(rows, start=2):
        row={k:clean(v) for k,v in row.items() if k}
        problems=[]
        for field in REQUIRED:
            if not row.get(field): problems.append(f"missing {field}")
        url=row.get("official_url","")
        parsed=urlparse(url)
        if url and (parsed.scheme!="https" or not parsed.netloc): problems.append("official_url must be HTTPS")
        try:
            lo=int(row["min_age"]) if row.get("min_age") else None
            hi=int(row["max_age"]) if row.get("max_age") else None
            if lo is not None and hi is not None and lo>hi: problems.append("min_age exceeds max_age")
            if lo is not None and lo<0 or hi is not None and hi<0: problems.append("age cannot be negative")
        except ValueError: problems.append("age values must be whole numbers")
        status=(row.get("verification_status") or "pending_review").lower()
        if status not in VALID_STATUS: problems.append("invalid verification_status")
        if status=="verified" and (not row.get("last_checked") or not row.get("verified_by") or not row.get("official_url")):
            row["verification_status"]="pending_review"
            warnings.append({"row":n,"title":row.get("title",""),"warning":"verified status downgraded to pending_review: add last_checked and verified_by only after source review"})
        deadline=row.get("deadline","")
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}",deadline):
            try:
                date.fromisoformat(deadline)
                if deadline<today and row.get("deadline_type","").lower()!="rolling": row["verification_status"]="expired"
            except ValueError: problems.append("deadline is not a real calendar date")
        u=key(url); name=key(row.get("title",""))+"|"+key(row.get("provider",""))
        if u and u in seen_urls: problems.append("duplicate official_url")
        if name!="|" and name in seen_names: problems.append("duplicate title/provider")
        if problems: issues.append({"row":n,"title":row.get("title",""),"issues":problems}); continue
        seen_urls.add(u); seen_names.add(name); valid.append(row)
    if valid:
        with a.output.open("w",encoding="utf-8-sig",newline="") as f:
            w=csv.DictWriter(f,fieldnames=list(valid[0].keys()));w.writeheader();w.writerows(valid)
    report={"input":str(a.input),"rows_read":len(rows),"valid_rows":len(valid),"rejected_rows":len(issues),"warning_count":len(warnings),"checked_on":today,"warnings":warnings,"issues":issues}
    a.report.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k not in {"issues","warnings"}},indent=2))
    if issues or warnings: print(f"See {a.report} for row-level issues and warnings.",file=sys.stderr)
    return 1 if issues else 0
if __name__=="__main__": raise SystemExit(main())
