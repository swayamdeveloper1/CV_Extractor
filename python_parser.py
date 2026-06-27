#!/usr/bin/env python3
"""
CV/Resume Parser — extracts structured fields from resume files.
Usage: python python_parser.py <file_path> <file_name>
Outputs JSON to stdout.
"""

import json
import os
import re
import sys
from typing import List, Optional

# ─────────────────────────────────────────────────────────────────────────────
# File reading
# ─────────────────────────────────────────────────────────────────────────────

TEXT_LIMIT = 5000

def read_file(file_path: str, file_name: str) -> str:
    ext = os.path.splitext(file_name)[1].lower()
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
            text = f.read()
            return text[:TEXT_LIMIT] if len(text) > TEXT_LIMIT else text
    elif ext == ".pdf":
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(file_path) or ""
            return text[:TEXT_LIMIT]
        except ImportError:
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
                    return text[:TEXT_LIMIT]
            except ImportError:
                return ""
    elif ext == ".docx":
        try:
            from docx import Document
            doc = Document(file_path)
            text = "\n".join(p.text for p in doc.paragraphs)
            return text[:TEXT_LIMIT]
        except ImportError:
            return ""
    else:
        raise ValueError(f"Unsupported file type: {ext}")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_lines(text: str) -> List[str]:
    return [l.strip() for l in text.split("\n") if l.strip()]

SECTION_HEADINGS = [
    "summary", "professional summary", "career summary", "profile", "about me",
    "objective", "career objective",
    "experience", "work experience", "work history", "employment",
    "professional experience", "employment history",
    "education", "academic background", "qualifications",
    "educational qualifications", "academic qualifications",
    "skills", "technical skills", "core competencies", "key skills",
    "technologies", "tech stack", "expertise", "competencies",
    "projects", "certifications", "certificates", "courses", "training",
    "languages", "interests", "hobbies", "references",
    "publications", "achievements", "awards", "internship",
    "volunteer", "extracurricular", "personal details",
    "declaration", "additional information",
]

def find_section_boundaries(text: str):
    lines = text.split("\n")
    boundaries = {}
    for i, line in enumerate(lines):
        cleaned = re.sub(r'[^a-z0-9\s/]', '', line.strip().lower()).strip()
        for h in SECTION_HEADINGS:
            if cleaned == h or cleaned == h + ":" or cleaned.startswith(h + " ") or cleaned.startswith(h + ":"):
                if len(line.strip()) < 60:
                    boundaries.setdefault(h, []).append(i)
                    break
    result = {}
    headings = sorted(boundaries.items(), key=lambda x: x[1][0])
    for idx, (h, positions) in enumerate(headings):
        start = positions[0] + 1
        end = headings[idx + 1][1][0] if idx + 1 < len(headings) else len(lines)
        result[h] = (start, end)
    return result

def get_contact_header(text: str) -> List[str]:
    lines = text.split("\n")
    boundaries = find_section_boundaries(text)
    first_section = min((b[0] for b in boundaries.values()), default=len(lines))
    return [lines[i].strip() for i in range(first_section) if lines[i].strip()]

def get_section_text(text: str, headings: List[str]) -> str:
    boundaries = find_section_boundaries(text)
    lines = text.split("\n")
    for h in headings:
        if h in boundaries:
            start, end = boundaries[h]
            return "\n".join(lines[start:end]).strip()
    return ""

def extract_label(lines: List[str], pattern: str) -> str:
    regex = re.compile(rf"^\s*(?:{pattern})\s*[:\\-]\s*(.+)", re.IGNORECASE)
    for line in lines:
        m = regex.match(line)
        if m:
            return m.group(1).strip()
    return ""

NOISE_PATTERNS = re.compile(r'(email|phone|mobile|http|www\.|linkedin|github|skype|@|\.com|resume|cv|curriculum\s*vitae)', re.IGNORECASE)
SECTION_WORDS = re.compile(r'(summary|experience|education|skills|projects|objective|profile|qualifications|certifications|achievements|references|declaration|interests|languages|training|internship|volunteer)', re.IGNORECASE)
ROLE_KEYWORDS_RE = re.compile(r'(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|data|devops|scrum\s*master|owner|analytics|support)', re.IGNORECASE)
WORD_ROLE_KEYWORDS_RE = re.compile(r'\b(engineer|developer|manager|analyst|intern|associate|consultant|lead|architect|director|specialist|officer|trainee|supervisor|executive|head|chief|president|vp|designer|programmer|scientist|researcher|lecturer|professor|instructor|trainer|accountant|technician|advisor|auditor|planner|operator|coordinator|administrator|hr|data|devops|scrum\s*master|owner|analytics|support)\b', re.IGNORECASE)
MONTH_MAP = {"jan":0,"feb":1,"mar":2,"apr":3,"may":4,"jun":5,"jul":6,"aug":7,"sep":8,"oct":9,"nov":10,"dec":11}
MONTH_NAMES_LIST = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
MONTH_NAMES_REGEX = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"

def is_noise(s: str) -> bool:
    return bool(NOISE_PATTERNS.search(s)) or len(s) > 60 or len(s) < 2

def line_contains_date_only(line: str) -> bool:
    return bool(re.match(r'^\d{4}\s*[-–]', line)) or bool(re.match(r'^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)', line, re.IGNORECASE))

def contains_known_company(line: str) -> str:
    lower = line.lower()
    for c in KNOWN_COMPANIES:
        if c.lower() in lower:
            return c
    return ""

def line_has_company_signal(line: str, known_only: bool = False) -> bool:
    lower = line.lower()
    if not known_only:
        for p in COMPANY_PREFIX_LOOKUP:
            if re.search(r'\b' + escape_re(p) + r'\b', lower):
                return True
    for s in COMPANY_SUFFIX_LOOKUP:
        if re.search(r'\b' + escape_re(s) + r'\b', lower):
            return True
    for pat in COMPANY_PATTERN_LOOKUP:
        if pat.lower() in lower:
            return True
    return False

def clean_employer_value(employer: str) -> str:
    e = employer
    e = re.sub(r'\s+\d{4}\s*[-–to]+\s*(?:present|current|till now|\d{4}).*?$', '', e, flags=re.IGNORECASE).strip()
    e = re.sub(r'\s*\([^)]*\d{4}[^)]*\)\s*$', '', e).strip()
    e = re.sub(r'[,\s][-–]\s*[A-Z][a-zA-Z\s]+$', '', e).strip()
    e = re.sub(r',\s*[A-Z][a-zA-Z\s]+$', '', e).strip()
    e = re.sub(r'\([^)]*\)\s*$', '', e).strip()
    return e or employer

def is_valid_company_name(name: str) -> bool:
    if len(name) < 2: return False
    if contains_known_company(name): return True
    words = name.split()
    if len(words) >= 2: return True
    lower = name.lower()
    for s in COMPANY_SUFFIX_LOOKUP:
        if lower == s.lower(): return False
    for p in COMPANY_PREFIX_LOOKUP:
        if lower == p.lower(): return False
    for pat in COMPANY_PATTERN_LOOKUP:
        if lower == pat.lower(): return False
    return True

def is_likely_name(s: str) -> bool:
    if len(s) < 3 or len(s) > 50: return False
    if NOISE_PATTERNS.search(s): return False
    if SECTION_WORDS.search(s): return False
    if s[0].isdigit(): return False
    if contains_known_company(s): return False
    if line_has_company_signal(s, True): return False
    if WORD_ROLE_KEYWORDS_RE.search(s): return False
    words = s.split()
    if len(words) < 2 or len(words) > 5: return False
    for w in words:
        if not w[0].isupper(): return False
        if not re.match(r'^[A-Za-z\'.\-]+$', w): return False
    return True

# ─────────────────────────────────────────────────────────────────────────────
# Email
# ─────────────────────────────────────────────────────────────────────────────

def extract_email(text: str) -> str:
    emails = re.findall(r'[\w.-]+@[\w.-]+\.\w{2,}', text)
    if not emails:
        return ""
    primary = emails[0].lower()
    if re.search(r'\.(png|jpg|jpeg|gif|svg)$', primary):
        return ""
    return primary

# ─────────────────────────────────────────────────────────────────────────────
# Phone
# ─────────────────────────────────────────────────────────────────────────────

def extract_phone(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    patterns = [
        # +91 98765 43210 or 98765 43210 (5+5 Indian format)
        re.compile(r'(?<![-\d])(\+\d{1,3}[-.\s]?)?\b\d{5}[-.\s]?\d{5}\b(?![-\d])'),
        # (123) 456-7890 or 123-456-7890 (3+3+4 standard format)
        re.compile(r'(?<![-\d])(\+\d{1,3}[-.\s]?)?\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b(?![-\d])'),
    ]
    for pat in patterns:
        for m in pat.finditer(text):
            raw = m.group(0)
            cleaned = re.sub(r'[()\s.-]', '', raw)
            digits = re.sub(r'[^\d+]', '', cleaned)
            has_plus = digits.startswith('+')
            raw_digits = re.sub(r'[^0-9]', '', digits)
            digit_count = len(raw_digits)
            if digit_count == 10 or (has_plus and 10 <= digit_count <= 12):
                local_part = raw_digits[-10:]
                if re.match(r'^[6-9]', local_part):
                    return raw.strip()
    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Name
# ─────────────────────────────────────────────────────────────────────────────

def extract_name(contact_lines: List[str]) -> str:
    labeled = extract_label(contact_lines, "name|candidate name|applicant name|full name")
    if labeled and is_likely_name(labeled):
        return labeled
    for line in contact_lines:
        if NOISE_PATTERNS.search(line): continue
        if SECTION_WORDS.search(line): continue
        if is_likely_name(line): return line
    for line in contact_lines:
        cleaned = re.sub(r'^(resume|cv|curriculum vitae)\s*[-:]*\s*', '', line, flags=re.IGNORECASE).strip()
        if cleaned and is_likely_name(cleaned): return cleaned
    for line in contact_lines:
        if is_likely_name(line): return line
    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Designation
# ─────────────────────────────────────────────────────────────────────────────

# ─── Reference data for strict lookups ─────────────────────────────────────────
# (mirrors the server/src/data/ files for consistency)

DESIGNATION_LOOKUP = sorted([
    "Civil Engineer","Site Engineer","Junior Engineer","Senior Engineer",
    "Project Engineer","Mechanical Engineer","Electrical Engineer","MEP Engineer",
    "Planning Engineer","Billing Engineer","Quantity Surveyor","Senior Quantity Surveyor",
    "Estimator","Cost Engineer","Structural Engineer","Design Engineer","Architect",
    "Junior Architect","Senior Architect","Interior Designer","Draughtsman",
    "AutoCAD Draughtsman","Revit Modeller","BIM Engineer","BIM Coordinator","BIM Manager",
    "Project Manager","Assistant Project Manager","Construction Manager","Site Manager",
    "Project Coordinator","Execution Engineer","Quality Engineer","QA QC Engineer",
    "Safety Engineer","HSE Officer","HSE Manager","Fire & Safety Officer","Surveyor",
    "Land Surveyor","Senior Surveyor","Procurement Engineer","Procurement Manager",
    "Contracts Engineer","Contracts Manager","Tendering Engineer","Tendering Manager",
    "Planning Manager","Billing Manager","Project Head","Construction Head",
    "Operations Head","General Manager Projects","Vice President Projects",
    "Director Projects","EPC Engineer","EPC Manager","Infrastructure Engineer",
    "Highway Engineer","Bridge Engineer","Urban Planner","Project Scheduler",
    "Site Supervisor","Foreman","Senior Foreman","Store Keeper","Store Manager",
    "Lab Technician","Material Engineer","Quality Manager","PMC Engineer",
    "Resident Engineer","Client Engineer","Accountant","Liaison Officer",
], key=lambda x: -len(x))

DEGREE_LOOKUP = sorted([
    "ITI","Diploma","B.E","BE","Bachelor","ME",
    "BE Civil Engineering","BTech Civil Engineering","Diploma Civil Engineering",
    "ME Civil Engineering","MTech Civil Engineering",
    "BE Mechanical Engineering","BTech Mechanical Engineering",
    "Diploma Mechanical Engineering","ME Mechanical Engineering",
    "MTech Mechanical Engineering",
    "BE Electrical Engineering","BTech Electrical Engineering",
    "Diploma Electrical Engineering","ME Electrical Engineering",
    "MTech Electrical Engineering",
    "BE Electronics Engineering","BTech Electronics Engineering",
    "BArch","BPlan","MPlan",
    "BSc Construction Management","MSc Construction Management",
    "MBA Construction Management","PG Diploma in Construction Management",
    "PG Diploma in Project Management","MBA Project Management",
    "BSc Quantity Surveying","MSc Quantity Surveying",
    "PG Diploma in Quantity Surveying","BSc Structural Engineering",
    "MSc Structural Engineering","MTech Structural Engineering",
    "Diploma in Structural Drafting","Diploma in Architecture",
    "Diploma in Surveying","Diploma in Safety Engineering","BSc Safety Engineering",
    "NEBOSH IGC","IOSH Managing Safely","PG Diploma in Fire & Safety",
    "BSc Fire & Safety","MSc Fire & Safety","RICS Certification","PMP","Prince2",
    "AutoCAD Certification","Revit Certification","Primavera P6 Certification",
    "MS Project Certification",
], key=lambda x: -len(x))

LOCATION_LOOKUP = sorted([
    "Andaman and Nicobar Islands","Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
    "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
    "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
    "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
    "Uttar Pradesh","Uttarakhand","West Bengal",
    "Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata",
    "Pune","Surat","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane",
    "Bhopal","Visakhapatnam","Patna","Vadodara","Ghaziabad","Ludhiana","Agra",
    "Nashik","Faridabad","Meerut","Rajkot","Varanasi","Srinagar","Aurangabad",
    "Dhanbad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Howrah","Coimbatore",
    "Jabalpur","Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota",
    "Guwahati","Chandigarh","Solapur","Bareilly","Moradabad","Mysuru","Gurugram",
    "Aligarh","Jalandhar","Tiruchirappalli","Bhubaneswar","Salem","Warangal",
    "Guntur","Bhiwandi","Saharanpur","Gorakhpur","Bikaner","Amravati","Noida",
    "Jamshedpur","Bhilai","Cuttack","Firozabad","Kochi","Nellore","Bhavnagar",
    "Dehradun","Durgapur","Asansol","Rourkela","Nanded","Kolhapur","Ajmer",
    "Akola","Jamnagar","Ujjain","Siliguri","Jhansi","Ulhasnagar","Jammu",
    "Sangli","Mangalore","Erode","Belgaum","Kurnool","Rajahmundry",
    "Tirunelveli","Malegaon","Gaya","Tiruppur","Davanagere","Kozhikode",
    "Kollam","Udaipur","Muzaffarnagar","Bokaro","Patiala","Rohtak","Kakinada",
    "Panipat","Korba","Bhilwara","Haridwar","Vellore","Tirupati","Karimnagar",
    "Anantapur","Nizamabad","Karnal","Bathinda","Imphal","Alwar","Gandhinagar",
    "Bilaspur","Hisar","Rampur","Muzaffarpur","Chandrapur","Junagadh",
    "Thrissur","Gandhidham","Haldwani","Pondicherry","Purnia","Hosur",
    "Durg","Alappuzha","Machilipatnam","Ongole","Bhimavaram","Adoni",
    "Chittoor","Suryapet","Khammam","Mahbubnagar","Bidar","Hospet","Raichur",
    "Hassan","Mandya","Tumkur","Dharwad","Bijapur","Gadag","Haveri","Karwar",
    "Udupi","Kannur","Palakkad","Malappuram","Kottayam","Pathanamthitta",
    "Kargil","Leh","Baramulla","Pulwama","Anantnag","Shopian","Budgam",
    "Samba","Kathua","Udhampur","Reasi","Doda","Poonch","Rajouri",
    "Aizawl","Kohima","Itanagar","Gangtok","Agartala","Shillong","Dimapur",
    "Port Blair","Daman","Diu","Silvassa","Kavaratti","Yanam",
    "Morbi","Surendranagar","Botad","Amreli","Bhuj","Mandvi","Porbandar",
    "Palanpur","Mehsana","Anand","Nadiad","Bharuch","Navsari","Valsad","Vapi",
    "Godhra","Dahod","Modasa",
], key=lambda x: -len(x))

COMPANY_PREFIXES = [
    "Shree","Shri","Sri","Om","Sai","Raj","Shiv","Shiva",
    "National","India","Indian","Universal","Global","Prime","Elite",
    "Mega","Ultra","Super","Sky","Skyline","Landmark","Heritage","Everest","Apex",
    "Vertex","Unity","Reliance","Laxmi","Lakshmi","Tata","Adani","Larsen","Toubro",
    "L&T","DLF","Godrej","Oberoi","Prestige","Sobha","Brigade","Purvankara",
    "Kolte","Patil","Rustomjee","Hiranandani","Lodha","Piramal","Mahindra",
    "Royal","Premier","Supreme","Perfect","Metro",
    "Star","Sun","Fortune","Future","Vision","Bright",
    "Brilliant","Dynamic","Innovative","Creative","United",
    "Consolidated","Associated","Standard","Modern","Classic",
    "Continental","International","Intercontinental",
]
COMPANY_SUFFIXES = [
    "Construction","Constructions","Construction Co","Builders","Builder",
    "Developers","Developer","Infra","Infratech","Infrastructure","Infra Pvt Ltd",
    "Infra LLP","Infra Projects","Projects","Projects Pvt Ltd","Projects LLP",
    "Engineering","Engineers","Engineering Pvt Ltd","Contractors","Contractor",
    "Contracts","EPC","EPC Projects","Realty","Real Estate","Properties","Homes",
    "Housing","Developments","Associates","Enterprises","Corporation","Group",
    "Industries","Turnkey Projects","Buildcon","Buildwell","Buildtech","Infracom",
    "Infracon","Infra Build","Infra Buildcon","Limited","Ltd","Pvt Ltd","Pvt",
    "LLP","Inc","Incorporated","Corp","Corporation","Co","Company",
    "Solutions","Services","Technologies","Technology","Tech","Systems",
    "Software","Consulting","Consultancy","Consultants","Advisory",
    "Ventures","Holdings","Global","International","Group","Industries",
    "Enterprises","Associates","Partners","Development","Management",
    "Infrastructure","Facilities","Energy","Power","Renewables","Solar",
    "Hospitality","Hotels","Resorts","Retail","Education","Academy",
    "Institute","Healthcare","Hospital","Finance","Financial","Banking",
    "Communications","Media","Entertainment","Manufacturing","Industrial",
    "Mining","Metals","Steel","Cement","Chemicals","Oil","Gas",
    "Shipping","Marine","Aviation","Railways","Transport","Logistics",
    "Food","Beverages","Textile","Telecom","Telecommunications",
    "IT","ITES","BPO","KPO","Hardware","Electronics","Robotics",
]
COMPANY_PATTERNS = [
    "& Co","& Sons","& Associates","& Engineers","& Contractors","& Developers",
    "& Builders","& Infra","& Projects","& Company","& Partners","& Group",
    "& Co.","& Bros","& Brothers","(P) Ltd","(Pvt) Ltd",
]
KNOWN_COMPANIES = [
    "Google","Alphabet","Amazon","AWS","Microsoft","Meta","Facebook","Apple","Netflix",
    "TCS","Tata Consultancy Services","Infosys","Wipro","HCL","HCL Technologies",
    "Tech Mahindra","LTI","Mindtree","L&T","Larsen & Toubro","Larsen and Toubro",
    "Reliance","Reliance Industries","Adani","Adani Group","Adani Enterprises",
    "Adani Ports","Adani Green","Adani Power","Adani Transmission",
    "Bharti Airtel","Airtel","Vodafone","Idea","Vodafone Idea","Jio","Reliance Jio",
    "Bajaj","Bajaj Group","Mahindra","Mahindra & Mahindra","M&M",
    "Tata Motors","Tata Steel","Tata Power","Tata Group","Tata Sons",
    "Godrej","Dabur","Marico","HUL","Hindustan Unilever","ITC","Britannia","Nestle",
    "P&G","Procter & Gamble","Colgate","Patanjali","Amul",
    "SBI","State Bank of India","HDFC","HDFC Bank","ICICI","ICICI Bank",
    "Axis Bank","Kotak","Yes Bank","IndusInd","PNB","Bank of Baroda",
    "Deloitte","KPMG","EY","Ernst & Young","PwC","PricewaterhouseCoopers","Accenture",
    "Capgemini","IBM","Oracle","SAP","Salesforce","Adobe","Cisco","Intel",
    "Qualcomm","AMD","NVIDIA","Samsung","LG","Sony","Panasonic",
    "BYJU'S","Byju's","Unacademy","UpGrad","WhiteHat Jr","Vedantu","Simplilearn",
    "Zomato","Swiggy","Uber","Ola","Rapido","MakeMyTrip","OYO",
    "Flipkart","Myntra","Snapdeal","Paytm","PhonePe","Google Pay","Amazon Pay",
    "BharatPe","CRED","Groww","Zerodha","Upstox","Angel Broking","PolicyBazaar",
    "OLA Electric","Ather Energy","Hero","Hero MotoCorp","Bajaj Auto","TVS","Yamaha",
    "Maruti","Maruti Suzuki","Hyundai","Tata Motors","Honda","Toyota",
    "Shapoorji Pallonji","Shapoorji","Pallonji",
    "L&T Construction","L&T ECC","L&T Infra","L&T Realty","L&T Finance",
    "DLF","DLF Group","Oberoi Realty","Oberoi","Prestige","Prestige Group",
    "Brigade","Brigade Group","Sobha","Sobha Group","Puravankara","Purvankara",
    "Kolte Patil","Rustomjee","Hiranandani","Lodha","Piramal","Mahindra Lifespaces",
    "Shapoorji","Shapoorji Pallonji","Gammon","HCC","Hindustan Construction",
    "NCC","Nagarjuna Construction","IVRCL","Simplex","Afcons","JMC",
    "IRB Infrastructure","Welspun","KNR Constructions","Sadbhav Engineering",
    "Ashoka Buildcon","PNC Infratech","J Kumar Infra","MBL Infra",
    "NBCC","NBCC India","MEP Infrastructure","MEP Infrastructure Developers",
    "HG Infra","GR Infra","Dilip Buildcon","Man Infracon",
    "BHEL","Bharat Heavy Electricals","NTPC","NTPC Limited","Power Grid",
    "NHPC","SJVN","THDC","ONGC","Oil and Natural Gas Corporation",
    "GAIL","HPCL","BPCL","IOCL","Indian Oil","Bharat Petroleum","Hindustan Petroleum",
    "ISRO","DRDO","HAL","BEL","BEML","Cochin Shipyard","Garden Reach Shipbuilders",
    "Railways","Indian Railways","Metro Rail","Delhi Metro","BMRCL","Kochi Metro",
    "DRDO","ADA","HAL","NAL","VSSC","LPSC","SAC",
    "PCMC","Pimpri Chinchwad Municipal Corporation","PMC","Pune Municipal Corporation",
    "CIDCO","MHADA","PMRDA",
]

COMPANY_PREFIX_LOOKUP = sorted(COMPANY_PREFIXES, key=lambda x: -len(x))
COMPANY_SUFFIX_LOOKUP = sorted(COMPANY_SUFFIXES, key=lambda x: -len(x))
COMPANY_PATTERN_LOOKUP = sorted(COMPANY_PATTERNS, key=lambda x: -len(x))

def escape_re(s: str) -> str:
    return re.sub(r'[.*+?^${}()|[\]\\]', r'\\\g<0>', s)

# ─── Designation — strict lookup, contact header first then full text
# ─────────────────────────────────────────────────────────────────────────────

def extract_designation(text: str, contact_lines: list = None) -> str:
    # 1. Labeled designation
    all_lines = text.split("\n") if isinstance(text, str) else []
    labeled = extract_label([l.strip() for l in all_lines if l.strip()], "designation|current designation|position|current position|role|title|job title|job role")
    if labeled:
        for title in DESIGNATION_LOOKUP:
            if re.search(r'\b' + escape_re(title) + r'\b', labeled, re.IGNORECASE):
                return title
    # 2. Contact header
    if contact_lines:
        for line in contact_lines:
            for title in DESIGNATION_LOOKUP:
                if re.search(r'\b' + escape_re(title) + r'\b', line, re.IGNORECASE):
                    return title
    # 3. First experience entry
    exp_text = get_section_text(text, ["experience", "work experience", "employment", "work history"])
    if exp_text:
        exp_lines = [l.strip() for l in exp_text.split("\n") if l.strip()]
        for line in exp_lines[:3]:
            for title in DESIGNATION_LOOKUP:
                if re.search(r'\b' + escape_re(title) + r'\b', line, re.IGNORECASE):
                    return title
    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Experience
# ─────────────────────────────────────────────────────────────────────────────

def extract_experience(text: str) -> List[dict]:
    exp_text = get_section_text(text, [
        "experience", "work experience", "employment", "work history",
        "professional experience", "employment history", "career history",
    ])
    if not exp_text:
        return []

    exp_lines = [l.strip() for l in exp_text.split("\n") if l.strip()]
    results = []

    date_range_re = re.compile(
        r'(?:({month_names})\.?\s*)?(\d{{4}})\s*[-–to]+\s*(?:({month_names})\.?\s*)?(present|current|till now|\d{{4}})'.format(
            month_names=MONTH_NAMES_REGEX
        ), re.IGNORECASE
    )
    role_re = ROLE_KEYWORDS_RE

    for i, line in enumerate(exp_lines):
        if re.match(r'^(experience|employment|work\s*history|career)', line, re.IGNORECASE):
            continue
        if line.startswith("-") or line.startswith("•") or line.startswith("*"):
            continue
        if line_contains_date_only(line):
            continue
        if not role_re.search(line) or len(line) > 80:
            continue

        role = line
        company = ""
        duration = ""
        start_date = ""

        # Check if role line contains company after separator
        sep_match = re.search(r'\s+[-–|]\s+', role)
        if sep_match:
            parts = re.split(r'\s+[-–|]\s+', role)
            before = parts[0].strip()
            after = " ".join(parts[1:]).strip()
            if role_re.search(before) and after and not WORD_ROLE_KEYWORDS_RE.search(after):
                role = before
                company = after
            elif not company and role_re.search(after) and before and not role_re.search(before) and len(before) < 50:
                role = after
                company = before
        if not company and ',' in role:
            parts = role.split(',')
            first = parts[0].strip()
            rest = ",".join(parts[1:]).strip()
            if role_re.search(first) and rest and not WORD_ROLE_KEYWORDS_RE.search(rest) and len(rest) < 40:
                role = first
                company = rest
        if not company:
            at_match = re.match(r'^(.*?)\s+at\s+(\S[\w\s&.]+)$', role, re.IGNORECASE)
            if at_match and role_re.search(at_match.group(1)) and len(at_match.group(2)) < 50:
                role = at_match.group(1)
                company = at_match.group(2)

        for j in range(i + 1, min(i + 6, len(exp_lines))):
            if exp_lines[j].startswith("-") or exp_lines[j].startswith("•") or exp_lines[j].startswith("*"):
                continue
            if role_re.search(exp_lines[j]) and len(exp_lines[j]) < 80 and not line_contains_date_only(exp_lines[j]):
                break
            dm = date_range_re.search(exp_lines[j])
            if dm:
                duration = exp_lines[j].strip()
                sy = int(dm.group(2)) if dm.group(2) else 0
                sm = 0
                if dm.group(1):
                    m3 = dm.group(1).lower()[:3]
                    sm = MONTH_MAP.get(m3, 0)
                if sy > 0:
                    start_date = f"{MONTH_NAMES_LIST[sm]} {sy}"
                if not company:
                    after_date = exp_lines[j].replace(dm.group(0), "").strip()
                    if after_date and not role_re.search(after_date) and not line_contains_date_only(after_date):
                        company = after_date
            elif not company and len(exp_lines[j]) > 2 and len(exp_lines[j]) < 80 and not exp_lines[j][0].isdigit():
                parts = re.split(r'[|,–—]', exp_lines[j])
                candidate = parts[0].strip()
                if not role_re.search(candidate) and not line_contains_date_only(candidate):
                    company = candidate

        if not duration:
            full_text = " ".join(exp_lines[i:min(i + 5, len(exp_lines))])
            rm = re.search(r'(\d{4})\s*[-–to]+\s*(present|current|till now|\d{4})', full_text, re.IGNORECASE)
            if rm:
                duration = rm.group(0)
                start_date = rm.group(1)

        if role:
            results.append({"company": company, "role": role, "duration": duration, "startDate": start_date})

    return results

# ─────────────────────────────────────────────────────────────────────────────
# Employer
# ─────────────────────────────────────────────────────────────────────────────

def clean_employer_line(line: str) -> str:
    seps = [" at ", " @ ", " - ", " – ", " — ", " | ", " At ", " AT ", " At ", " AT "]
    for sep in seps:
        idx = line.find(sep)
        if idx > 0:
            before = line[:idx].strip()
            after = line[idx + len(sep):].strip()
            if after and ROLE_KEYWORDS_RE.search(before) and not WORD_ROLE_KEYWORDS_RE.search(after):
                return after
    return line

# Try to extract company from any line in experience section using broad heuristics
ACTION_VERBS_RE = re.compile(r'\b(project|summary|responsible|manage|oversee|lead|develop|implement|create|design|prepare|review|coordinate|supervise|monitor|control|ensure|maintain|support|provide|assist|participate|report|conduct|perform|achieve|complete|deliver|execute|establish|improve|optimize|reduce|increase|handle|processing|handling|budget|evaluate|analyze|plan|organize|direct|administer|process|responsible for|key responsibilities|duties include|role includes)\b', re.IGNORECASE)

def extract_company_from_exp_lines(exp_lines: list) -> str:
    for line in exp_lines:
        if len(line) < 3 or len(line) > 110: continue
        if NOISE_PATTERNS.search(line): continue
        if is_likely_name(line): continue
        if SECTION_WORDS.search(line): continue
        if line_contains_date_only(line): continue
        if re.match(r'^[•\-–*\d]', line): continue
        if ACTION_VERBS_RE.search(line): continue

        known = contains_known_company(line)
        if known: return known

        cleaned = clean_employer_line(line)
        if line_has_company_signal(cleaned):
            cv = clean_employer_value(cleaned)
            if is_valid_company_name(cv): return cv

        # Broad heuristic: 2+ capitalized words AND at least one company signal
        words = [w for w in line.split() if w]
        capitalized = [w for w in words if w[0].isupper()]
        if len(capitalized) >= 2 and 2 <= len(words) <= 12:
            no_parens = re.sub(r'[()]', '', line).strip()
            if len(no_parens) > 3 and not WORD_ROLE_KEYWORDS_RE.search(no_parens) and line_has_company_signal(no_parens):
                cv = clean_employer_value(no_parens)
                if is_valid_company_name(cv): return cv
    return ""

def extract_employer(text: str, experiences: list = None) -> str:
    # 1. Known company from experience entries
    if experiences:
        for exp in experiences:
            c = exp.get("company", "")
            if c:
                stripped = re.sub(r'[,;].*$', '', c).strip()
                if stripped and len(stripped) > 1:
                    known = contains_known_company(stripped)
                    if known and is_valid_company_name(known): return known
                    if not WORD_ROLE_KEYWORDS_RE.search(stripped) and not is_likely_name(stripped) and not SECTION_WORDS.search(stripped) and not line_contains_date_only(stripped):
                        if line_has_company_signal(stripped):
                            cv = clean_employer_value(stripped)
                            if is_valid_company_name(cv): return cv

    # 2. Broad fallback: scan experience section for company-like lines
    exp_section = get_section_text(text, [
        "experience", "work experience", "employment", "work history",
        "professional experience", "employment history", "career history",
    ])
    exp_lines = [l.strip() for l in exp_section.split("\n") if l.strip()] if exp_section else []
    exp_company = extract_company_from_exp_lines(exp_lines)
    if exp_company: return exp_company

    # 3. Check contact header lines
    contact_lines = get_contact_header(text)
    for line in contact_lines:
        if len(line) < 3 or len(line) > 80: continue
        if NOISE_PATTERNS.search(line): continue
        if is_likely_name(line): continue
        if SECTION_WORDS.search(line): continue
        if line_contains_date_only(line): continue
        if not line_has_company_signal(line, True) and is_likely_name(line): continue

        known = contains_known_company(line)
        if known and is_valid_company_name(known): return known

        cleaned = clean_employer_line(line)
        if WORD_ROLE_KEYWORDS_RE.search(cleaned) and not line_has_company_signal(cleaned, True): continue
        if is_likely_name(cleaned): continue
        if not line_has_company_signal(line, True) and is_likely_name(line): continue
        if line_has_company_signal(cleaned):
            cv = clean_employer_value(cleaned)
            if is_valid_company_name(cv): return cv

    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Working Since & Total Experience
# ─────────────────────────────────────────────────────────────────────────────

def extract_working_since(experiences: List[dict]) -> str:
    if experiences and experiences[0].get("startDate"):
        sd = experiences[0]["startDate"]
        try:
            from datetime import datetime
            d = datetime.strptime(sd, "%b %Y")
            if 1980 < d.year <= datetime.now().year:
                return sd
        except:
            pass
    for exp in experiences:
        if exp.get("duration"):
            y = re.search(r'(\d{4})', exp["duration"])
            if y:
                year = int(y.group(1))
                if 1900 < year <= 2100:
                    return y.group(1)
    return ""

def extract_total_experience(experiences: List[dict], text: str, contact_lines: List[str]) -> str:
    labeled = extract_label(contact_lines, "total experience|total exp|overall experience|years of experience|work experience")
    if labeled:
        p = re.search(r'(\d+)\s*(?:years?|yrs?)(?:\s+(?:and\s+)?(\d+)\s*(?:months?|mons?))?', labeled, re.IGNORECASE)
        if p:
            return f"{p.group(1)}y {p.group(2)}m" if p.group(2) else f"{p.group(1)}y"

    for line in contact_lines:
        p = re.search(r'(\d+)\s*(?:years?|yrs?)(?:\s+(?:and\s+)?(\d+)\s*(?:months?|mons?))?', line, re.IGNORECASE)
        if p:
            return f"{p.group(1)}y {p.group(2)}m" if p.group(2) else f"{p.group(1)}y"

    if experiences:
        total_months = 0
        for exp in experiences:
            if exp.get("startDate"):
                try:
                    from datetime import datetime
                    start = datetime.strptime(exp["startDate"], "%b %Y")
                    end = datetime.now()
                    if exp.get("duration"):
                        ey_match = re.findall(r'(\d{4})', exp["duration"])
                        if ey_match and len(ey_match) >= 2:
                            all_month_matches = re.findall(r'(' + MONTH_NAMES_REGEX + r')', exp["duration"], re.IGNORECASE)
                            em = 0
                            if len(all_month_matches) >= 2:
                                m3 = all_month_matches[1].lower()[:3]
                                em = MONTH_MAP.get(m3, 0)
                            end = datetime(int(ey_match[-1]), em + 1, 1)
                        elif re.search(r'present|current|till now', exp["duration"], re.IGNORECASE):
                            end = datetime.now()
                    months = (end.year - start.year) * 12 + (end.month - start.month)
                    if months > 0: total_months += months
                except: pass

        if total_months == 0:
            for exp in experiences:
                years = re.findall(r'(\d{4})', exp.get("duration", ""))
                if len(years) >= 2:
                    sy = int(years[0])
                    ey_str = years[-1].lower()
                    ey = datetime.now().year if ey_str == "present" else int(ey_str)
                    if sy > 1900 and ey > 1900 and ey >= sy:
                        total_months += (ey - sy) * 12

        if total_months > 0 and total_months < 600:
            y = total_months // 12
            m = total_months % 12
            if y > 0 and m > 0: return f"{y}y {m}m"
            if y > 0: return f"{y}y"
            if m > 0: return f"{m}m"

    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Address
# ─────────────────────────────────────────────────────────────────────────────

ADDRESS_KEYWORDS_RE = re.compile(r'\b(road|rd|street|st|nagar|colony|society|layout|sector|phase|block|building|complex|plaza|tower|avenue|area|township|village|post|district|taluka|tehsil|pincode|pin\s*cod|zip|metro|mall|market|chowk|square|circle|extension|industrial|estate|floor|office|shop|house|flat|door|plot|landmark|lane|cross|gate|apartment|residency|bungalow|villa|residence|near|opposite|behind|beside|adjacent)\b', re.IGNORECASE)

def is_likely_address(s: str) -> bool:
    if len(s) < 8: return False
    if NOISE_PATTERNS.search(s): return False
    if WORD_ROLE_KEYWORDS_RE.search(s): return False
    if is_likely_name(s): return False
    if SECTION_WORDS.search(s): return False
    if line_contains_date_only(s): return False
    has_pincode = bool(re.search(r'\b\d{6}\b', s))
    has_number = bool(re.search(r'\d', s))
    has_letter = bool(re.search(r'[A-Za-z]', s))
    has_comma = ',' in s
    has_year = bool(re.search(r'\b\d{4}\b', s))
    has_addr_kw = bool(ADDRESS_KEYWORDS_RE.search(s))
    if has_pincode: return True
    if has_year and not has_comma: return False
    if has_number and has_letter and len(s) > 10 and (has_addr_kw or has_comma or s[0].isdigit()): return True
    if has_addr_kw and has_letter and len(s) > 15: return True
    return False

def get_leftover_header_lines(contact_lines: list, used_name: str) -> list:
    result = []
    for line in contact_lines:
        if NOISE_PATTERNS.search(line): continue
        if SECTION_WORDS.search(line): continue
        if line_contains_date_only(line): continue
        if is_likely_name(line) and line == used_name: continue
        if extract_phone(line): continue
        if extract_email(line): continue
        label_check = extract_label([line], "designation|position|role|title|job title|location|city|place|current location|total experience|years of experience|name|full name|candidate name|applicant name|address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address")
        if label_check: continue
        if WORD_ROLE_KEYWORDS_RE.search(line): continue
        if contains_known_company(line): continue
        if line_has_company_signal(line): continue
        # Only keep lines that look address-like
        if not ADDRESS_KEYWORDS_RE.search(line) and not re.match(r'^\s*\d', line) and not (bool(re.search(r'\d', line)) and bool(re.search(r'[A-Za-z]', line)) and len(line) > 8):
            continue
        result.append(line)
    return result

def extract_address(text: str, contact_lines: list = None) -> str:
    all_lines = [l.strip() for l in text.split("\n") if l.strip()]

    # 1. Labeled address field (trust the label)
    labeled = extract_label(all_lines, "address|current address|permanent address|residence|residential address|correspondence address|present address|local address|mailing address|communication address")
    if labeled and len(labeled) > 3 and not NOISE_PATTERNS.search(labeled) and not is_likely_name(labeled):
        return labeled

    src = contact_lines if contact_lines else get_contact_header(text)

    # 2. Multi-line address: combine consecutive address-like lines
    best_multi = ""
    for i in range(len(src)):
        if not is_likely_address(src[i]): continue
        combined = src[i]
        for j in range(i + 1, min(i + 4, len(src))):
            if is_likely_address(src[j]) or (len(src[j]) > 5 and bool(re.search(r'\d', src[j])) and bool(re.search(r'[A-Za-z]', src[j]))):
                combined += ", " + src[j]
            else: break
        if len(combined) > len(best_multi): best_multi = combined
    if best_multi: return best_multi

    # 3. Single line that looks like an address
    for line in src:
        if is_likely_address(line):
            return line

    # 4. Last resort: combine ALL leftover contact header lines
    leftovers = get_leftover_header_lines(src, extract_name(src))
    if leftovers:
        filtered = [l for l in leftovers if bool(re.search(r'[A-Za-z]', l)) and (bool(re.search(r'\d', l)) or len(l) > 8)]
        if filtered:
            combined = ", ".join(filtered)
            if len(combined) > 8:
                return combined

    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Location
# ─────────────────────────────────────────────────────────────────────────────

def find_location_in_text(text: str) -> str:
    for place in LOCATION_LOOKUP:
        if re.search(r'\b' + escape_re(place) + r'\b', text, re.IGNORECASE):
            return place
    return ""

def extract_location(text: str) -> str:
    contact_lines = get_contact_header(text)
    header_text = " ".join(contact_lines)
    contact_place = find_location_in_text(header_text)
    if contact_place:
        return contact_place
    addr = extract_address(text, contact_lines)
    if addr:
        addr_place = find_location_in_text(addr)
        if addr_place:
            return addr_place
    labeled = extract_label(contact_lines, "location|city|place|current location|current city|current address")
    if labeled:
        labeled_place = find_location_in_text(labeled)
        if labeled_place:
            return labeled_place
    exp_text = get_section_text(text, ["experience", "work experience", "employment", "work history"])
    if exp_text:
        first_300 = exp_text[:300]
        exp_place = find_location_in_text(first_300)
        if exp_place:
            return exp_place
    return find_location_in_text(text)

# ─────────────────────────────────────────────────────────────────────────────
# Education & Qualification
# ──────────────────────────────────�───────────────────────────────────────────

def extract_education(text: str) -> List[dict]:
    edu_text = get_section_text(text, [
        "education", "academic background", "qualifications", "academic qualifications",
        "educational qualifications", "education qualifications",
    ])
    source = edu_text if edu_text else text
    lines = [l.strip() for l in source.split("\n") if l.strip()]
    results = []

    for i, line in enumerate(lines):
        if len(line) < 80 and any(re.search(r'\b' + escape_re(d) + r'\b', line, re.IGNORECASE) for d in DEGREE_LOOKUP):
            degree_line = line
            institution = lines[i + 1] if i + 1 < len(lines) else ""
            ym = re.search(r'(\d{4})\s*[-–to]+\s*(\d{4})', degree_line)
            sy = re.search(r'(\d{4})', degree_line)
            year = f"{ym.group(1)}-{ym.group(2)}" if ym else (sy.group(1) if sy else "")

            if re.search(r'\s+[-–]\s+', degree_line):
                parts = re.split(r'\s+[-–]\s+', degree_line)
                degree_line = parts[0].strip()
                if len(parts) >= 2 and not institution:
                    institution = parts[1].strip()
                if institution:
                    institution = re.sub(r'\s*\(\d{4}[-–to]*\d{0,4}\)', '', institution).strip()

            results.append({"degree": degree_line, "institution": institution, "year": year})

    return results

def extract_qualification(text: str) -> str:
    for degree in DEGREE_LOOKUP:
        if re.search(r'\b' + escape_re(degree) + r'\b', text, re.IGNORECASE):
            return degree
    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Skills
# ─────────────────────────────────────────────────────────────────────────────

KNOWN_SKILLS = [
    "javascript","typescript","python","java","c#","c++","c","ruby","php","go","rust","swift","kotlin",
    "react","angular","vue","svelte","next.js","nuxt.js","node.js","express","django","flask","spring",
    "spring boot","asp.net",".net","jquery","bootstrap","tailwind","sass","less",
    "html","css","html5","css3","redux","graphql","rest","rest api","soap",
    "mysql","postgresql","mongodb","oracle","sql server","sql","redis","elasticsearch","firebase",
    "aws","azure","gcp","google cloud","docker","kubernetes","jenkins","terraform","ansible",
    "git","github","gitlab","bitbucket","svn","jira","confluence",
    "agile","scrum","kanban","waterfall",
    "machine learning","deep learning","ai","nlp","computer vision","tensorflow","pytorch","keras",
    "data science","data analysis","data engineering","big data","hadoop","spark","kafka",
    "testing","unit testing","jest","mocha","chai","cypress","selenium","junit",
    "photoshop","illustrator","figma","sketch","adobe xd","ui design","ux design",
    "linux","unix","windows","bash","powershell","shell",
    "salesforce","sap","oracle erp","peoplesoft","servicenow",
]

def extract_skills(text: str) -> List[str]:
    skill_text = get_section_text(text, [
        "skills", "technical skills", "core competencies", "key skills",
        "technologies", "tech stack", "tool stack", "expertise",
        "competencies", "proficiencies",
    ])
    source = skill_text if skill_text else text
    tokens = [re.sub(r'[^a-z0-9.#+\s]', '', t.strip().lower()).strip()
              for t in re.split(r'[,;\n|•\-–()]', source)
              if len(t.strip()) > 1 and len(t.strip()) < 50]

    found = []
    for skill in KNOWN_SKILLS:
        if any(t == skill or t.startswith(skill + " ") or t.endswith(" " + skill) for t in tokens):
            found.append(skill)
    return list(dict.fromkeys(found))[:20]

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def parse(file_path: str, file_name: str) -> dict:
    text = read_file(file_path, file_name)
    contact_lines = get_contact_header(text)
    experiences = extract_experience(text)

    employer = extract_employer(text, experiences)
    address = extract_address(text, contact_lines)

    # Post-processing: if employer still empty, scan experience section only
    if not employer:
        exp_section_text = get_section_text(text, [
            "experience", "work experience", "employment", "work history",
            "professional experience", "employment history", "career history",
        ]) or text
        for c in KNOWN_COMPANIES:
            if re.search(r'\b' + escape_re(c) + r'\b', exp_section_text, re.IGNORECASE):
                employer = c
                break

    return {
        "fileName": file_name,
        "name": extract_name(contact_lines),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "designation": extract_designation(text, contact_lines),
        "employer": employer,
        "address": address,
        "workingSince": extract_working_since(experiences),
        "totalExperience": extract_total_experience(experiences, text, contact_lines),
        "location": extract_location(text),
        "qualification": extract_qualification(text),
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python_parser.py <file_path> <file_name>"}))
        sys.exit(1)
    try:
        result = parse(sys.argv[1], sys.argv[2])
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
