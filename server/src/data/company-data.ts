export const COMPANY_NAME_PREFIXES = [
 "Shree","Shri","Sri","Om","Sai","Raj","Shiv","Shiva","Gujarat","Maharashtra",
    "Karnataka","National","India","Indian","Universal","Global","Prime","Elite",
    "Mega","Ultra","Super","Sky","Skyline","Landmark","Heritage","Everest","Apex",
    "Vertex","Unity","Reliance","Laxmi","Lakshmi"
];

export const COMPANY_NAME_SUFFIXES = [
  "Construction","Constructions","Construction Co","Builders","Builder",
    "Developers","Developer","Infra","Infratech","Infrastructure","Infra Pvt Ltd",
    "Infra LLP","Infra Projects","Projects","Projects Pvt Ltd","Projects LLP",
    "Engineering","Engineers","Engineering Pvt Ltd","Contractors","Contractor",
    "Contracts","EPC","EPC Projects","Realty","Real Estate","Properties","Homes",
    "Housing","Development","Developments","Authority","Corporation","Group",
    "Industries","Turnkey Projects","Buildcon","Buildwell","Buildtech","Infracom",
    "Infracon","Infra Build","Infra Buildcon"
];

export const COMPANY_NAME_PATTERNS = [
  "& Co","& Sons","& Associates","& Engineers","& Contractors","& Developers",
  "& Builders","& Infra","& Projects","& Company","& Partners","& Group",
  "& Co.","& Bros","& Brothers","& Company","(P) Ltd","(Pvt) Ltd",
];

export const KNOWN_COMPANIES = [
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
];
export const COMPANY_REJECT_WORDS = [
  "responsible",
  "responsibilities",
  "worked",
  "working",
  "developed",
  "developing",
  "conducting",
  "surveying",
  "planning",
  "checking",
  "inspection",
  "installation",
  "maintenance",
  "project",
  "projects",
  "profile",
  "summary",
  "objective",
  "education",
  "skills",
  "experience",
  "qualification",
  "certification",
  "achievement",
  "reference",
  "declaration",
  "language",
  "hobby",
  "interest",
  "nationality",
  "gender",
  "father",
  "mother",
  "dob",
  "email",
  "phone",
  "mobile"
];

export const COMPANY_PREFIX_LOOKUP = [...COMPANY_NAME_PREFIXES].sort((a, b) => b.length - a.length);
export const COMPANY_SUFFIX_LOOKUP = [...COMPANY_NAME_SUFFIXES].sort((a, b) => b.length - a.length);
export const COMPANY_PATTERN_LOOKUP = [...COMPANY_NAME_PATTERNS].sort((a, b) => b.length - a.length);
// ─── Company name reference lists (construction/infra domain) ───────────────
// Used to STRICTLY validate the Employer field.
// A line is accepted as a company name only if it contains at least one
// known prefix, suffix, or pattern from these lists. The FULL matching line
// is returned as the employer (not just the matched word).

// const COMPANY_DATA = {
//   "companyNamePrefixes": [
//     "Shree","Shri","Sri","Om","Sai","Raj","Shiv","Shiva","Gujarat","Maharashtra",
//     "Karnataka","National","India","Indian","Universal","Global","Prime","Elite",
//     "Mega","Ultra","Super","Sky","Skyline","Landmark","Heritage","Everest","Apex",
//     "Vertex","Unity","Reliance","Laxmi","Lakshmi"
//   ],
//   "companyNameSuffixes": [
//     "Construction","Constructions","Construction Co","Builders","Builder",
//     "Developers","Developer","Infra","Infratech","Infrastructure","Infra Pvt Ltd",
//     "Infra LLP","Infra Projects","Projects","Projects Pvt Ltd","Projects LLP",
//     "Engineering","Engineers","Engineering Pvt Ltd","Contractors","Contractor",
//     "Contracts","EPC","EPC Projects","Realty","Real Estate","Properties","Homes",
//     "Housing","Developments","Associates","Enterprises","Corporation","Group",
//     "Industries","Turnkey Projects","Buildcon","Buildwell","Buildtech","Infracom",
//     "Infracon","Infra Build","Infra Buildcon"
//   ],
//   "companyNamePatterns": [
//     "& Co","& Sons","& Associates","& Engineers","& Contractors","& Developers",
//     "& Builders","& Infra","& Projects"
//   ]
// };

// // Longest-first so multi-word entries (e.g. "Infra Buildcon") are checked
// // before shorter overlapping ones (e.g. "Infra") when scanning a line.
// const COMPANY_PREFIX_LOOKUP  = [...COMPANY_DATA.companyNamePrefixes].sort((a,b)=>b.length-a.length);
// const COMPANY_SUFFIX_LOOKUP  = [...COMPANY_DATA.companyNameSuffixes].sort((a,b)=>b.length-a.length);
// const COMPANY_PATTERN_LOOKUP = [...COMPANY_DATA.companyNamePatterns].sort((a,b)=>b.length-a.length);
