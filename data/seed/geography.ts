import type { NamedPlace } from "@/lib/map/geo";

/**
 * Reference places along representative Indian logistics corridors. Used to
 * build lane geometry and to describe positions ("Near Agra, UP").
 * Coordinates are approximate city centroids — illustrative demo geography.
 */
export const PLACES = {
  Delhi: { name: "Delhi", state: "DL", lat: 28.6139, lng: 77.209 },
  Gurugram: { name: "Gurugram", state: "HR", lat: 28.4595, lng: 77.0266 },
  Faridabad: { name: "Faridabad", state: "HR", lat: 28.4089, lng: 77.3178 },
  Palwal: { name: "Palwal", state: "HR", lat: 28.1447, lng: 77.326 },
  GreaterNoida: { name: "Greater Noida", state: "UP", lat: 28.4744, lng: 77.504 },
  Jewar: { name: "Jewar", state: "UP", lat: 28.12, lng: 77.55 },
  Mathura: { name: "Mathura", state: "UP", lat: 27.4924, lng: 77.6737 },
  Agra: { name: "Agra", state: "UP", lat: 27.1767, lng: 78.0081 },
  Firozabad: { name: "Firozabad", state: "UP", lat: 27.1592, lng: 78.3957 },
  Shikohabad: { name: "Shikohabad", state: "UP", lat: 27.1, lng: 78.58 },
  Saifai: { name: "Saifai", state: "UP", lat: 26.93, lng: 79.02 },
  Etawah: { name: "Etawah", state: "UP", lat: 26.7856, lng: 79.0158 },
  Kannauj: { name: "Kannauj", state: "UP", lat: 27.05, lng: 79.92 },
  Bangarmau: { name: "Bangarmau", state: "UP", lat: 26.89, lng: 80.21 },
  Lucknow: { name: "Lucknow", state: "UP", lat: 26.8467, lng: 80.9462 },
  Kanpur: { name: "Kanpur", state: "UP", lat: 26.4499, lng: 80.3319 },
  Fatehpur: { name: "Fatehpur", state: "UP", lat: 25.93, lng: 80.81 },
  Prayagraj: { name: "Prayagraj", state: "UP", lat: 25.4358, lng: 81.8463 },
  Varanasi: { name: "Varanasi", state: "UP", lat: 25.3176, lng: 82.9739 },
  Mohania: { name: "Mohania", state: "BR", lat: 25.17, lng: 83.62 },
  AurangabadBR: { name: "Aurangabad", state: "BR", lat: 24.75, lng: 84.37 },
  Barhi: { name: "Barhi", state: "JH", lat: 24.3, lng: 85.42 },
  Dhanbad: { name: "Dhanbad", state: "JH", lat: 23.7957, lng: 86.4304 },
  Asansol: { name: "Asansol", state: "WB", lat: 23.6739, lng: 86.9524 },
  Durgapur: { name: "Durgapur", state: "WB", lat: 23.5204, lng: 87.3119 },
  Bardhaman: { name: "Bardhaman", state: "WB", lat: 23.2324, lng: 87.8615 },
  Kolkata: { name: "Kolkata", state: "WB", lat: 22.5726, lng: 88.3639 },
  Neemrana: { name: "Neemrana", state: "RJ", lat: 27.99, lng: 76.38 },
  Jaipur: { name: "Jaipur", state: "RJ", lat: 26.9124, lng: 75.7873 },
  Ajmer: { name: "Ajmer", state: "RJ", lat: 26.4499, lng: 74.6399 },
  Bhilwara: { name: "Bhilwara", state: "RJ", lat: 25.3407, lng: 74.6313 },
  Udaipur: { name: "Udaipur", state: "RJ", lat: 24.5854, lng: 73.7125 },
  Himmatnagar: { name: "Himmatnagar", state: "GJ", lat: 23.5979, lng: 72.9661 },
  Ahmedabad: { name: "Ahmedabad", state: "GJ", lat: 23.0225, lng: 72.5714 },
  Vadodara: { name: "Vadodara", state: "GJ", lat: 22.3072, lng: 73.1812 },
  Bharuch: { name: "Bharuch", state: "GJ", lat: 21.7051, lng: 72.9959 },
  Surat: { name: "Surat", state: "GJ", lat: 21.1702, lng: 72.8311 },
  Vapi: { name: "Vapi", state: "GJ", lat: 20.3893, lng: 72.9106 },
  Bhiwandi: { name: "Bhiwandi", state: "MH", lat: 19.2967, lng: 73.0631 },
  Mumbai: { name: "Mumbai", state: "MH", lat: 19.076, lng: 72.8777 },
  Lonavala: { name: "Lonavala", state: "MH", lat: 18.7546, lng: 73.4062 },
  Pune: { name: "Pune", state: "MH", lat: 18.5204, lng: 73.8567 },
  Satara: { name: "Satara", state: "MH", lat: 17.6805, lng: 74.0183 },
  Kolhapur: { name: "Kolhapur", state: "MH", lat: 16.705, lng: 74.2433 },
  Belagavi: { name: "Belagavi", state: "KA", lat: 15.8497, lng: 74.4977 },
  Hubballi: { name: "Hubballi", state: "KA", lat: 15.3647, lng: 75.124 },
  Davangere: { name: "Davangere", state: "KA", lat: 14.4644, lng: 75.9218 },
  Chitradurga: { name: "Chitradurga", state: "KA", lat: 14.2251, lng: 76.398 },
  Tumakuru: { name: "Tumakuru", state: "KA", lat: 13.3379, lng: 77.1173 },
  Bengaluru: { name: "Bengaluru", state: "KA", lat: 12.9716, lng: 77.5946 },
  Hosur: { name: "Hosur", state: "TN", lat: 12.7409, lng: 77.8253 },
  Krishnagiri: { name: "Krishnagiri", state: "TN", lat: 12.5186, lng: 78.2137 },
  Vellore: { name: "Vellore", state: "TN", lat: 12.9165, lng: 79.1325 },
  Sriperumbudur: { name: "Sriperumbudur", state: "TN", lat: 12.9675, lng: 79.9419 },
  Chennai: { name: "Chennai", state: "TN", lat: 13.0827, lng: 80.2707 },
  Nellore: { name: "Nellore", state: "AP", lat: 14.4426, lng: 79.9865 },
  Ongole: { name: "Ongole", state: "AP", lat: 15.5057, lng: 80.0499 },
  Vijayawada: { name: "Vijayawada", state: "AP", lat: 16.5062, lng: 80.648 },
  Rajahmundry: { name: "Rajahmundry", state: "AP", lat: 17.0005, lng: 81.804 },
  Visakhapatnam: { name: "Visakhapatnam", state: "AP", lat: 17.6868, lng: 83.2185 },
  Srikakulam: { name: "Srikakulam", state: "AP", lat: 18.2949, lng: 83.8938 },
  Berhampur: { name: "Berhampur", state: "OD", lat: 19.315, lng: 84.7941 },
  Bhubaneswar: { name: "Bhubaneswar", state: "OD", lat: 20.2961, lng: 85.8245 },
  Cuttack: { name: "Cuttack", state: "OD", lat: 20.4625, lng: 85.883 },
  Balasore: { name: "Balasore", state: "OD", lat: 21.4934, lng: 86.9135 },
  Kharagpur: { name: "Kharagpur", state: "WB", lat: 22.346, lng: 87.232 },
  Indapur: { name: "Indapur", state: "MH", lat: 18.1167, lng: 75.0167 },
  Solapur: { name: "Solapur", state: "MH", lat: 17.6599, lng: 75.9064 },
  Umarga: { name: "Umarga", state: "MH", lat: 17.84, lng: 76.62 },
  Zaheerabad: { name: "Zaheerabad", state: "TS", lat: 17.68, lng: 77.61 },
  Sangareddy: { name: "Sangareddy", state: "TS", lat: 17.62, lng: 78.08 },
  Hyderabad: { name: "Hyderabad", state: "TS", lat: 17.385, lng: 78.4867 },
  Jadcherla: { name: "Jadcherla", state: "TS", lat: 16.76, lng: 78.14 },
  Kurnool: { name: "Kurnool", state: "AP", lat: 15.8281, lng: 78.0373 },
  Anantapur: { name: "Anantapur", state: "AP", lat: 14.6819, lng: 77.6006 },
  Penukonda: { name: "Penukonda", state: "AP", lat: 14.08, lng: 77.59 },
  Chikkaballapur: { name: "Chikkaballapur", state: "KA", lat: 13.43, lng: 77.73 },
  Sonipat: { name: "Sonipat", state: "HR", lat: 28.9931, lng: 77.0151 },
  Panipat: { name: "Panipat", state: "HR", lat: 29.3909, lng: 76.9635 },
  Karnal: { name: "Karnal", state: "HR", lat: 29.6857, lng: 76.9905 },
  Ambala: { name: "Ambala", state: "HR", lat: 30.3782, lng: 76.7767 },
  Rajpura: { name: "Rajpura", state: "PB", lat: 30.48, lng: 76.59 },
  Ludhiana: { name: "Ludhiana", state: "PB", lat: 30.901, lng: 75.8573 },
  Nagpur: { name: "Nagpur", state: "MH", lat: 21.1458, lng: 79.0882 },
  Pandharkawada: { name: "Pandharkawada", state: "MH", lat: 20.02, lng: 78.53 },
  Adilabad: { name: "Adilabad", state: "TS", lat: 19.66, lng: 78.53 },
  Nirmal: { name: "Nirmal", state: "TS", lat: 19.1, lng: 78.34 },
  Kamareddy: { name: "Kamareddy", state: "TS", lat: 18.32, lng: 78.34 },
  Medchal: { name: "Medchal", state: "TS", lat: 17.63, lng: 78.48 },
  Krishnanagar: { name: "Krishnanagar", state: "WB", lat: 23.4, lng: 88.5 },
  Baharampur: { name: "Baharampur", state: "WB", lat: 24.1, lng: 88.25 },
  Malda: { name: "Malda", state: "WB", lat: 25.0, lng: 88.14 },
  Raiganj: { name: "Raiganj", state: "WB", lat: 25.62, lng: 88.12 },
  Siliguri: { name: "Siliguri", state: "WB", lat: 26.7271, lng: 88.3953 },
  Dhupguri: { name: "Dhupguri", state: "WB", lat: 26.59, lng: 89.0 },
  Bongaigaon: { name: "Bongaigaon", state: "AS", lat: 26.48, lng: 90.56 },
  Guwahati: { name: "Guwahati", state: "AS", lat: 26.1445, lng: 91.7362 },
  Igatpuri: { name: "Igatpuri", state: "MH", lat: 19.7, lng: 73.56 },
  Shirdi: { name: "Shirdi", state: "MH", lat: 19.77, lng: 74.48 },
  Sambhajinagar: { name: "Chh. Sambhajinagar", state: "MH", lat: 19.8762, lng: 75.3433 },
  Jalna: { name: "Jalna", state: "MH", lat: 19.84, lng: 75.88 },
  Mehkar: { name: "Mehkar", state: "MH", lat: 20.15, lng: 76.57 },
  Karanja: { name: "Karanja", state: "MH", lat: 20.48, lng: 77.49 },
  Wardha: { name: "Wardha", state: "MH", lat: 20.7453, lng: 78.6022 },
  Dharmapuri: { name: "Dharmapuri", state: "TN", lat: 12.13, lng: 78.16 },
  Salem: { name: "Salem", state: "TN", lat: 11.6643, lng: 78.146 },
  Erode: { name: "Erode", state: "TN", lat: 11.341, lng: 77.7172 },
  Tiruppur: { name: "Tiruppur", state: "TN", lat: 11.1085, lng: 77.3411 },
  Coimbatore: { name: "Coimbatore", state: "TN", lat: 11.0168, lng: 76.9558 },
  Indore: { name: "Indore", state: "MP", lat: 22.7196, lng: 75.8577 },
  Dhamnod: { name: "Dhamnod", state: "MP", lat: 22.21, lng: 75.47 },
  Sendhwa: { name: "Sendhwa", state: "MP", lat: 21.68, lng: 75.09 },
  Dhule: { name: "Dhule", state: "MH", lat: 20.9042, lng: 74.7749 },
  Malegaon: { name: "Malegaon", state: "MH", lat: 20.55, lng: 74.53 },
  Nashik: { name: "Nashik", state: "MH", lat: 19.9975, lng: 73.7898 },
  Nawada: { name: "Nawada", state: "BR", lat: 24.88, lng: 85.54 },
  BiharSharif: { name: "Bihar Sharif", state: "BR", lat: 25.2, lng: 85.52 },
  Patna: { name: "Patna", state: "BR", lat: 25.5941, lng: 85.1376 },
  Godhra: { name: "Godhra", state: "GJ", lat: 22.7788, lng: 73.6143 },
  Dahod: { name: "Dahod", state: "GJ", lat: 22.835, lng: 74.25 },
  Jhabua: { name: "Jhabua", state: "MP", lat: 22.77, lng: 74.59 },
} as const satisfies Record<string, NamedPlace>;

export type PlaceKey = keyof typeof PLACES;

export const PLACE_LIST: readonly NamedPlace[] = Object.values(PLACES);

/* -------------------------------------------------------------------------- */
/* Hubs                                                                       */
/* -------------------------------------------------------------------------- */

export interface HubDefinition {
  id: string;
  code: string;
  name: string;
  place: PlaceKey;
  /** Relative size — drives baseline arrivals and vehicle allocation. */
  weight: number;
  /** Registration prefix for vehicles homed at this hub. */
  rto: string[];
}

export const HUB_DEFINITIONS: readonly HubDefinition[] = [
  { id: "hub_del", code: "DEL", name: "Delhi Hub", place: "Delhi", weight: 10, rto: ["DL01", "DL04", "DL1L"] },
  { id: "hub_bom", code: "BOM", name: "Mumbai Hub (Bhiwandi)", place: "Bhiwandi", weight: 10, rto: ["MH04", "MH05", "MH43"] },
  { id: "hub_blr", code: "BLR", name: "Bengaluru Hub", place: "Bengaluru", weight: 8, rto: ["KA01", "KA51"] },
  { id: "hub_maa", code: "MAA", name: "Chennai Hub", place: "Chennai", weight: 8, rto: ["TN01", "TN09"] },
  { id: "hub_ccu", code: "CCU", name: "Kolkata Hub", place: "Kolkata", weight: 8, rto: ["WB11", "WB19"] },
  { id: "hub_agr", code: "AGR", name: "Agra Hub", place: "Agra", weight: 4, rto: ["UP80"] },
  { id: "hub_hyd", code: "HYD", name: "Hyderabad Hub", place: "Hyderabad", weight: 7, rto: ["TS07", "TS08"] },
  { id: "hub_amd", code: "AMD", name: "Ahmedabad Hub", place: "Ahmedabad", weight: 6, rto: ["GJ01", "GJ18"] },
  { id: "hub_pnq", code: "PNQ", name: "Pune Hub", place: "Pune", weight: 6, rto: ["MH12", "MH14"] },
  { id: "hub_jai", code: "JAI", name: "Jaipur Hub", place: "Jaipur", weight: 5, rto: ["RJ14"] },
  { id: "hub_lko", code: "LKO", name: "Lucknow Hub", place: "Lucknow", weight: 5, rto: ["UP32"] },
  { id: "hub_knu", code: "KNU", name: "Kanpur Hub", place: "Kanpur", weight: 4, rto: ["UP78"] },
  { id: "hub_nag", code: "NAG", name: "Nagpur Hub", place: "Nagpur", weight: 6, rto: ["MH31", "MH40"] },
  { id: "hub_vns", code: "VNS", name: "Varanasi Hub", place: "Varanasi", weight: 3, rto: ["UP65"] },
  { id: "hub_vga", code: "VGA", name: "Vijayawada Hub", place: "Vijayawada", weight: 4, rto: ["AP16", "AP39"] },
  { id: "hub_cjb", code: "CJB", name: "Coimbatore Hub", place: "Coimbatore", weight: 4, rto: ["TN37"] },
  { id: "hub_gau", code: "GAU", name: "Guwahati Hub", place: "Guwahati", weight: 3, rto: ["AS01"] },
  { id: "hub_luh", code: "LUH", name: "Ludhiana Hub", place: "Ludhiana", weight: 4, rto: ["PB10"] },
  { id: "hub_idr", code: "IDR", name: "Indore Hub", place: "Indore", weight: 5, rto: ["MP09"] },
  { id: "hub_pat", code: "PAT", name: "Patna Hub", place: "Patna", weight: 3, rto: ["BR01"] },
];

/* -------------------------------------------------------------------------- */
/* Lanes                                                                      */
/* -------------------------------------------------------------------------- */

export interface LaneDefinition {
  code: string;
  corridor: string;
  /** Waypoints in travel order; hub places must be included. */
  waypoints: PlaceKey[];
  /** Hub ids on the lane, in travel order (first = origin, last = destination). */
  hubIds: string[];
  /** Historical transit factor (1.0 = plan). */
  historicalFactor: number;
}

export const LANE_DEFINITIONS: readonly LaneDefinition[] = [
  {
    code: "DEL-BOM",
    corridor: "NH48",
    waypoints: ["Delhi", "Gurugram", "Neemrana", "Jaipur", "Ajmer", "Bhilwara", "Udaipur", "Himmatnagar", "Ahmedabad", "Vadodara", "Bharuch", "Surat", "Vapi", "Bhiwandi"],
    hubIds: ["hub_del", "hub_jai", "hub_amd", "hub_bom"],
    historicalFactor: 1.06,
  },
  {
    code: "DEL-CCU",
    corridor: "NH19",
    waypoints: ["Delhi", "Faridabad", "Palwal", "Mathura", "Agra", "Firozabad", "Etawah", "Kanpur", "Fatehpur", "Prayagraj", "Varanasi", "Mohania", "AurangabadBR", "Barhi", "Dhanbad", "Asansol", "Durgapur", "Bardhaman", "Kolkata"],
    hubIds: ["hub_del", "hub_agr", "hub_knu", "hub_vns", "hub_ccu"],
    historicalFactor: 1.08,
  },
  {
    code: "BOM-BLR",
    corridor: "NH48",
    waypoints: ["Bhiwandi", "Lonavala", "Pune", "Satara", "Kolhapur", "Belagavi", "Hubballi", "Davangere", "Chitradurga", "Tumakuru", "Bengaluru"],
    hubIds: ["hub_bom", "hub_pnq", "hub_blr"],
    historicalFactor: 1.04,
  },
  {
    code: "BLR-MAA",
    corridor: "NH48",
    waypoints: ["Bengaluru", "Hosur", "Krishnagiri", "Vellore", "Sriperumbudur", "Chennai"],
    hubIds: ["hub_blr", "hub_maa"],
    historicalFactor: 1.03,
  },
  {
    code: "DEL-AGR",
    corridor: "Yamuna Expressway",
    waypoints: ["Delhi", "GreaterNoida", "Jewar", "Mathura", "Agra"],
    hubIds: ["hub_del", "hub_agr"],
    historicalFactor: 1.02,
  },
  {
    code: "MAA-CCU",
    corridor: "NH16",
    waypoints: ["Chennai", "Nellore", "Ongole", "Vijayawada", "Rajahmundry", "Visakhapatnam", "Srikakulam", "Berhampur", "Bhubaneswar", "Cuttack", "Balasore", "Kharagpur", "Kolkata"],
    hubIds: ["hub_maa", "hub_vga", "hub_ccu"],
    historicalFactor: 1.07,
  },
  {
    code: "BOM-HYD",
    corridor: "NH65",
    waypoints: ["Bhiwandi", "Lonavala", "Pune", "Indapur", "Solapur", "Umarga", "Zaheerabad", "Sangareddy", "Hyderabad"],
    hubIds: ["hub_bom", "hub_pnq", "hub_hyd"],
    historicalFactor: 1.05,
  },
  {
    code: "HYD-BLR",
    corridor: "NH44",
    waypoints: ["Hyderabad", "Jadcherla", "Kurnool", "Anantapur", "Penukonda", "Chikkaballapur", "Bengaluru"],
    hubIds: ["hub_hyd", "hub_blr"],
    historicalFactor: 1.03,
  },
  {
    code: "DEL-LUH",
    corridor: "NH44",
    waypoints: ["Delhi", "Sonipat", "Panipat", "Karnal", "Ambala", "Rajpura", "Ludhiana"],
    hubIds: ["hub_del", "hub_luh"],
    historicalFactor: 1.04,
  },
  {
    code: "DEL-LKO",
    corridor: "Agra–Lucknow Expressway",
    waypoints: ["Delhi", "GreaterNoida", "Jewar", "Mathura", "Agra", "Shikohabad", "Saifai", "Kannauj", "Bangarmau", "Lucknow"],
    hubIds: ["hub_del", "hub_agr", "hub_lko"],
    historicalFactor: 1.03,
  },
  {
    code: "NAG-HYD",
    corridor: "NH44",
    waypoints: ["Nagpur", "Pandharkawada", "Adilabad", "Nirmal", "Kamareddy", "Medchal", "Hyderabad"],
    hubIds: ["hub_nag", "hub_hyd"],
    historicalFactor: 1.04,
  },
  {
    code: "CCU-GAU",
    corridor: "NH12 / NH27",
    waypoints: ["Kolkata", "Krishnanagar", "Baharampur", "Malda", "Raiganj", "Siliguri", "Dhupguri", "Bongaigaon", "Guwahati"],
    hubIds: ["hub_ccu", "hub_gau"],
    historicalFactor: 1.12,
  },
  {
    code: "BOM-NAG",
    corridor: "Samruddhi Expressway",
    waypoints: ["Bhiwandi", "Igatpuri", "Shirdi", "Sambhajinagar", "Jalna", "Mehkar", "Karanja", "Wardha", "Nagpur"],
    hubIds: ["hub_bom", "hub_nag"],
    historicalFactor: 1.02,
  },
  {
    code: "MAA-CJB",
    corridor: "NH44 / NH544",
    waypoints: ["Chennai", "Sriperumbudur", "Vellore", "Krishnagiri", "Dharmapuri", "Salem", "Erode", "Tiruppur", "Coimbatore"],
    hubIds: ["hub_maa", "hub_cjb"],
    historicalFactor: 1.04,
  },
  {
    code: "IDR-BOM",
    corridor: "NH52 / NH160",
    waypoints: ["Indore", "Dhamnod", "Sendhwa", "Dhule", "Malegaon", "Nashik", "Igatpuri", "Bhiwandi"],
    hubIds: ["hub_idr", "hub_bom"],
    historicalFactor: 1.05,
  },
  {
    code: "CCU-PAT",
    corridor: "NH19 / NH20",
    waypoints: ["Kolkata", "Bardhaman", "Durgapur", "Asansol", "Dhanbad", "Barhi", "Nawada", "BiharSharif", "Patna"],
    hubIds: ["hub_ccu", "hub_pat"],
    historicalFactor: 1.09,
  },
  {
    code: "AMD-IDR",
    corridor: "NH47",
    waypoints: ["Ahmedabad", "Godhra", "Dahod", "Jhabua", "Indore"],
    hubIds: ["hub_amd", "hub_idr"],
    historicalFactor: 1.04,
  },
];
