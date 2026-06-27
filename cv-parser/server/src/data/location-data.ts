export const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal",
];

export const UNION_TERRITORIES = [
  "Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

export const CITIES = [
  "Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Pune","Surat","Jaipur",
  "Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam","Patna","Vadodara","Ghaziabad",
  "Ludhiana","Agra","Nashik","Faridabad","Meerut","Rajkot","Kalyan-Dombivli","Vasai-Virar","Varanasi",
  "Srinagar","Aurangabad","Dhanbad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Howrah","Coimbatore",
  "Jabalpur","Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Guwahati","Chandigarh",
  "Solapur","Hubballi-Dharwad","Bareilly","Moradabad","Mysuru","Gurugram","Aligarh","Jalandhar",
  "Tiruchirappalli","Bhubaneswar","Salem","Warangal","Guntur","Bhiwandi","Saharanpur","Gorakhpur",
  "Bikaner","Amravati","Noida","Jamshedpur","Bhilai","Cuttack","Firozabad","Kochi","Nellore",
  "Bhavnagar","Dehradun","Durgapur","Asansol","Rourkela","Nanded","Kolhapur","Ajmer","Akola",
  "Gulbarga","Jamnagar","Ujjain","Loni","Siliguri","Jhansi","Ulhasnagar","Jammu","Sangli",
  "Mangalore","Erode","Belgaum","Kurnool","Ambattur","Rajahmundry","Tirunelveli","Malegaon",
  "Gaya","Tiruppur","Davanagere","Kozhikode","Akbarpur","Kollam","Udaipur","Muzaffarnagar",
  "Bokaro","Bellary","Patiala","Rohtak","Farrukhabad","Kakinada","Panipat","Korba","Bhilwara",
  "Shimoga","Sambalpur","Shahjahanpur","Satna","Ratlam","Rewa","Haridwar","Vellore","Gopalpur",
  "Tirupati","Karimnagar","Anantapur","Nizamabad","Bardhaman","Kulti","Berhampur","Ahmednagar",
  "Mathura","Kharagpur","Bhatpara","Karnal","Bathinda","Imphal","Alwar","Sagar","Gandhinagar",
  "Bilaspur","Shivamogga","Hapur","Hisar","Rampur","Muzaffarpur","Chandrapur","Junagadh",
  "Thrissur","Gandhidham","Haldwani","Naihati","Tiruvottiyur","Pondicherry","Nandyal","Purnia",
  "Hosur","Serampore","Durg","Chinsurah","Alappuzha","Machilipatnam","Ongole","Bhimavaram",
  "Adoni","Madanapalle","Proddatur","Chittoor","Suryapet","Miryalaguda","Khammam","Mahbubnagar",
  "Bidar","Hospet","Raichur","Chikkamagaluru","Bagalkot","Hassan","Mandya","Tumkur","Chitradurga",
  "Dharwad","Bijapur","Gadag","Haveri","Karwar","Sirsi","Udupi","Karkala","Kundapura","Puttur",
  "Kasargod","Kannur","Palakkad","Malappuram","Kottayam","Pathanamthitta","Idukki","Wayanad",
  "Kargil","Leh","Baramulla","Kupwara","Pulwama","Anantnag","Shopian","Budgam",
  "Samba","Kathua","Udhampur","Reasi","Doda","Kishtwar","Poonch","Rajouri",
  "Aizawl","Kohima","Itanagar","Gangtok","Agartala","Shillong","Dimapur","Tura",
  "Port Blair","Daman","Diu","Silvassa","Kavaratti","Yanam","Mahe","Karaikal",
  "Morbi","Surendranagar","Botad","Amreli","Bhuj","Mandvi","Porbandar","Veraval",
  "Somnath","Palanpur","Mehsana","Anand","Nadiad","Bharuch","Navsari","Valsad","Vapi",
  "Godhra","Dahod","Chhota Udepur","Rajpipla","Vyara","Ahwa","Modasa","Himmatnagar",
  "Kalol","Sanand","Dahegam","Halol","Padra","Karjan","Ankleshwar","Umbergaon","Bilimora",
  "Chikhli","Borsad","Petlad","Sojitra","Dholka","Dhandhuka","Wadhwan","Dhrangadhra",
  "Jetpur","Gondal","Jasdan","Upleta","Visnagar","Unjha","Siddhpur","Patan","Radhanpur",
  "Santalpur","Deesa","Tharad","Vijapur","Mansa","Kadi","Viramgam","Becharaji","Detroj",
];

export const LOCATION_LOOKUP = [
  ...CITIES,
  ...STATES,
  ...UNION_TERRITORIES,
].sort((a, b) => b.length - a.length);
