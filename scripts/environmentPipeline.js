const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');

const appRoot = path.resolve(__dirname, '..');
const publicDataDir = path.join(appRoot, 'public', 'data');
const publicReportsDir = path.join(appRoot, 'public', 'reports');
const archiveDir = path.join(appRoot, 'data', 'archive');
const logsDir = path.join(appRoot, 'logs');
const bundledPython = '/Users/rohanmahendrashelar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';

const defaultThresholds = {
  warning: 100,
  danger: 150,
  hazardous: 200,
  spikeDelta: 35,
};

const correlationPairs = [
  ['temperature', 'Temperature'],
  ['humidity', 'Humidity'],
  ['windSpeed', 'Wind Speed'],
  ['pressure', 'Pressure'],
];

const globalCityCatalog = [
  { city: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777, profile: 'coastal-megacity' },
  { city: 'Delhi', country: 'IN', lat: 28.6139, lon: 77.209, profile: 'continental-polluted' },
  { city: 'Bengaluru', country: 'IN', lat: 12.9716, lon: 77.5946, profile: 'plateau-tech' },
  { city: 'Chennai', country: 'IN', lat: 13.0827, lon: 80.2707, profile: 'coastal-megacity' },
  { city: 'Kolkata', country: 'IN', lat: 22.5726, lon: 88.3639, profile: 'river-delta' },
  { city: 'Hyderabad', country: 'IN', lat: 17.385, lon: 78.4867, profile: 'plateau-tech' },
  { city: 'Pune', country: 'IN', lat: 18.5204, lon: 73.8567, profile: 'plateau-tech' },
  { city: 'Ahmedabad', country: 'IN', lat: 23.0225, lon: 72.5714, profile: 'dry-inland' },
  { city: 'Jaipur', country: 'IN', lat: 26.9124, lon: 75.7873, profile: 'dry-inland' },
  { city: 'Lucknow', country: 'IN', lat: 26.8467, lon: 80.9462, profile: 'continental-polluted' },
  { city: 'Dhaka', country: 'BD', lat: 23.8103, lon: 90.4125, profile: 'river-delta' },
  { city: 'Karachi', country: 'PK', lat: 24.8607, lon: 67.0011, profile: 'coastal-megacity' },
  { city: 'Lahore', country: 'PK', lat: 31.5204, lon: 74.3587, profile: 'continental-polluted' },
  { city: 'Kathmandu', country: 'NP', lat: 27.7172, lon: 85.324, profile: 'mountain-basin' },
  { city: 'Colombo', country: 'LK', lat: 6.9271, lon: 79.8612, profile: 'coastal-tropical' },
  { city: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018, profile: 'coastal-tropical' },
  { city: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198, profile: 'equatorial-clean' },
  { city: 'Kuala Lumpur', country: 'MY', lat: 3.139, lon: 101.6869, profile: 'equatorial-clean' },
  { city: 'Jakarta', country: 'ID', lat: -6.2088, lon: 106.8456, profile: 'coastal-megacity' },
  { city: 'Manila', country: 'PH', lat: 14.5995, lon: 120.9842, profile: 'coastal-tropical' },
  { city: 'Hanoi', country: 'VN', lat: 21.0278, lon: 105.8342, profile: 'river-delta' },
  { city: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lon: 106.6297, profile: 'coastal-tropical' },
  { city: 'Phnom Penh', country: 'KH', lat: 11.5564, lon: 104.9282, profile: 'river-delta' },
  { city: 'Yangon', country: 'MM', lat: 16.8409, lon: 96.1735, profile: 'coastal-tropical' },
  { city: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074, profile: 'continental-polluted' },
  { city: 'Shanghai', country: 'CN', lat: 31.2304, lon: 121.4737, profile: 'coastal-megacity' },
  { city: 'Shenzhen', country: 'CN', lat: 22.5431, lon: 114.0579, profile: 'coastal-tropical' },
  { city: 'Guangzhou', country: 'CN', lat: 23.1291, lon: 113.2644, profile: 'coastal-tropical' },
  { city: 'Chengdu', country: 'CN', lat: 30.5728, lon: 104.0668, profile: 'mountain-basin' },
  { city: 'Wuhan', country: 'CN', lat: 30.5928, lon: 114.3055, profile: 'river-delta' },
  { city: 'Hong Kong', country: 'HK', lat: 22.3193, lon: 114.1694, profile: 'coastal-tropical' },
  { city: 'Taipei', country: 'TW', lat: 25.033, lon: 121.5654, profile: 'coastal-tropical' },
  { city: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978, profile: 'temperate-urban' },
  { city: 'Busan', country: 'KR', lat: 35.1796, lon: 129.0756, profile: 'coastal-clean' },
  { city: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503, profile: 'temperate-urban' },
  { city: 'Osaka', country: 'JP', lat: 34.6937, lon: 135.5023, profile: 'temperate-urban' },
  { city: 'Sapporo', country: 'JP', lat: 43.0618, lon: 141.3545, profile: 'cold-clean' },
  { city: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093, profile: 'coastal-clean' },
  { city: 'Melbourne', country: 'AU', lat: -37.8136, lon: 144.9631, profile: 'temperate-urban' },
  { city: 'Brisbane', country: 'AU', lat: -27.4698, lon: 153.0251, profile: 'coastal-clean' },
  { city: 'Perth', country: 'AU', lat: -31.9505, lon: 115.8605, profile: 'dry-clean' },
  { city: 'Auckland', country: 'NZ', lat: -36.8509, lon: 174.7645, profile: 'coastal-clean' },
  { city: 'Wellington', country: 'NZ', lat: -41.2865, lon: 174.7762, profile: 'coastal-clean' },
  { city: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708, profile: 'desert-megacity' },
  { city: 'Abu Dhabi', country: 'AE', lat: 24.4539, lon: 54.3773, profile: 'desert-megacity' },
  { city: 'Riyadh', country: 'SA', lat: 24.7136, lon: 46.6753, profile: 'desert-megacity' },
  { city: 'Jeddah', country: 'SA', lat: 21.4858, lon: 39.1925, profile: 'coastal-dry' },
  { city: 'Doha', country: 'QA', lat: 25.2854, lon: 51.531, profile: 'desert-megacity' },
  { city: 'Kuwait City', country: 'KW', lat: 29.3759, lon: 47.9774, profile: 'desert-megacity' },
  { city: 'Muscat', country: 'OM', lat: 23.588, lon: 58.3829, profile: 'coastal-dry' },
  { city: 'Tehran', country: 'IR', lat: 35.6892, lon: 51.389, profile: 'mountain-basin' },
  { city: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784, profile: 'temperate-urban' },
  { city: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357, profile: 'desert-megacity' },
  { city: 'Alexandria', country: 'EG', lat: 31.2001, lon: 29.9187, profile: 'coastal-dry' },
  { city: 'Casablanca', country: 'MA', lat: 33.5731, lon: -7.5898, profile: 'coastal-clean' },
  { city: 'Lagos', country: 'NG', lat: 6.5244, lon: 3.3792, profile: 'coastal-tropical' },
  { city: 'Abuja', country: 'NG', lat: 9.0765, lon: 7.3986, profile: 'savannah' },
  { city: 'Nairobi', country: 'KE', lat: -1.2921, lon: 36.8219, profile: 'highland-clean' },
  { city: 'Addis Ababa', country: 'ET', lat: 8.9806, lon: 38.7578, profile: 'highland-clean' },
  { city: 'Johannesburg', country: 'ZA', lat: -26.2041, lon: 28.0473, profile: 'plateau-tech' },
  { city: 'Cape Town', country: 'ZA', lat: -33.9249, lon: 18.4241, profile: 'coastal-clean' },
  { city: 'Durban', country: 'ZA', lat: -29.8587, lon: 31.0218, profile: 'coastal-clean' },
  { city: 'Accra', country: 'GH', lat: 5.6037, lon: -0.187, profile: 'coastal-tropical' },
  { city: 'Algiers', country: 'DZ', lat: 36.7538, lon: 3.0588, profile: 'coastal-clean' },
  { city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522, profile: 'temperate-urban' },
  { city: 'London', country: 'GB', lat: 51.5072, lon: -0.1276, profile: 'temperate-urban' },
  { city: 'Manchester', country: 'GB', lat: 53.4808, lon: -2.2426, profile: 'temperate-urban' },
  { city: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405, profile: 'temperate-urban' },
  { city: 'Munich', country: 'DE', lat: 48.1351, lon: 11.582, profile: 'temperate-urban' },
  { city: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038, profile: 'dry-clean' },
  { city: 'Barcelona', country: 'ES', lat: 41.3851, lon: 2.1734, profile: 'coastal-clean' },
  { city: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964, profile: 'temperate-urban' },
  { city: 'Milan', country: 'IT', lat: 45.4642, lon: 9.19, profile: 'continental-polluted' },
  { city: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041, profile: 'temperate-urban' },
  { city: 'Brussels', country: 'BE', lat: 50.8503, lon: 4.3517, profile: 'temperate-urban' },
  { city: 'Zurich', country: 'CH', lat: 47.3769, lon: 8.5417, profile: 'cold-clean' },
  { city: 'Vienna', country: 'AT', lat: 48.2082, lon: 16.3738, profile: 'temperate-urban' },
  { city: 'Prague', country: 'CZ', lat: 50.0755, lon: 14.4378, profile: 'temperate-urban' },
  { city: 'Warsaw', country: 'PL', lat: 52.2297, lon: 21.0122, profile: 'continental-polluted' },
  { city: 'Stockholm', country: 'SE', lat: 59.3293, lon: 18.0686, profile: 'cold-clean' },
  { city: 'Oslo', country: 'NO', lat: 59.9139, lon: 10.7522, profile: 'cold-clean' },
  { city: 'Copenhagen', country: 'DK', lat: 55.6761, lon: 12.5683, profile: 'cold-clean' },
  { city: 'Helsinki', country: 'FI', lat: 60.1699, lon: 24.9384, profile: 'cold-clean' },
  { city: 'Athens', country: 'GR', lat: 37.9838, lon: 23.7275, profile: 'dry-clean' },
  { city: 'Lisbon', country: 'PT', lat: 38.7223, lon: -9.1393, profile: 'coastal-clean' },
  { city: 'Dublin', country: 'IE', lat: 53.3498, lon: -6.2603, profile: 'coastal-clean' },
  { city: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6173, profile: 'cold-continental' },
  { city: 'Kyiv', country: 'UA', lat: 50.4501, lon: 30.5234, profile: 'cold-continental' },
  { city: 'New York', country: 'US', lat: 40.7128, lon: -74.006, profile: 'temperate-urban' },
  { city: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437, profile: 'dry-clean' },
  { city: 'Chicago', country: 'US', lat: 41.8781, lon: -87.6298, profile: 'cold-continental' },
  { city: 'Houston', country: 'US', lat: 29.7604, lon: -95.3698, profile: 'coastal-megacity' },
  { city: 'Phoenix', country: 'US', lat: 33.4484, lon: -112.074, profile: 'desert-megacity' },
  { city: 'Seattle', country: 'US', lat: 47.6062, lon: -122.3321, profile: 'coastal-clean' },
  { city: 'San Francisco', country: 'US', lat: 37.7749, lon: -122.4194, profile: 'coastal-clean' },
  { city: 'Miami', country: 'US', lat: 25.7617, lon: -80.1918, profile: 'coastal-tropical' },
  { city: 'Toronto', country: 'CA', lat: 43.6532, lon: -79.3832, profile: 'cold-continental' },
  { city: 'Vancouver', country: 'CA', lat: 49.2827, lon: -123.1207, profile: 'coastal-clean' },
  { city: 'Montreal', country: 'CA', lat: 45.5017, lon: -73.5673, profile: 'cold-continental' },
  { city: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332, profile: 'mountain-basin' },
  { city: 'Guadalajara', country: 'MX', lat: 20.6597, lon: -103.3496, profile: 'plateau-tech' },
  { city: 'Bogota', country: 'CO', lat: 4.711, lon: -74.0721, profile: 'highland-clean' },
  { city: 'Lima', country: 'PE', lat: -12.0464, lon: -77.0428, profile: 'coastal-dry' },
  { city: 'Santiago', country: 'CL', lat: -33.4489, lon: -70.6693, profile: 'mountain-basin' },
  { city: 'Buenos Aires', country: 'AR', lat: -34.6037, lon: -58.3816, profile: 'temperate-urban' },
  { city: 'Sao Paulo', country: 'BR', lat: -23.5558, lon: -46.6396, profile: 'megacity-humid' },
  { city: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lon: -43.1729, profile: 'coastal-tropical' },
  { city: 'Brasilia', country: 'BR', lat: -15.7939, lon: -47.8828, profile: 'savannah' },
  { city: 'Surat', country: 'IN', lat: 21.1702, lon: 72.8311, profile: 'coastal-megacity' },
  { city: 'Kanpur', country: 'IN', lat: 26.4499, lon: 80.3319, profile: 'continental-polluted' },
  { city: 'Nagpur', country: 'IN', lat: 21.1458, lon: 79.0882, profile: 'dry-inland' },
  { city: 'Indore', country: 'IN', lat: 22.7196, lon: 75.8577, profile: 'plateau-tech' },
  { city: 'Bhopal', country: 'IN', lat: 23.2599, lon: 77.4126, profile: 'dry-inland' },
  { city: 'Patna', country: 'IN', lat: 25.5941, lon: 85.1376, profile: 'river-delta' },
  { city: 'Chandigarh', country: 'IN', lat: 30.7333, lon: 76.7794, profile: 'temperate-urban' },
  { city: 'Kochi', country: 'IN', lat: 9.9312, lon: 76.2673, profile: 'coastal-tropical' },
  { city: 'Visakhapatnam', country: 'IN', lat: 17.6868, lon: 83.2185, profile: 'coastal-megacity' },
  { city: 'Coimbatore', country: 'IN', lat: 11.0168, lon: 76.9558, profile: 'plateau-tech' },
  { city: 'Chittagong', country: 'BD', lat: 22.3569, lon: 91.7832, profile: 'coastal-tropical' },
  { city: 'Islamabad', country: 'PK', lat: 33.6844, lon: 73.0479, profile: 'temperate-urban' },
  { city: 'Rawalpindi', country: 'PK', lat: 33.5651, lon: 73.0169, profile: 'continental-polluted' },
  { city: 'Faisalabad', country: 'PK', lat: 31.4504, lon: 73.135, profile: 'continental-polluted' },
  { city: 'Pokhara', country: 'NP', lat: 28.2096, lon: 83.9856, profile: 'mountain-basin' },
  { city: 'Kandy', country: 'LK', lat: 7.2906, lon: 80.6337, profile: 'coastal-tropical' },
  { city: 'Chiang Mai', country: 'TH', lat: 18.7883, lon: 98.9853, profile: 'temperate-urban' },
  { city: 'Phuket', country: 'TH', lat: 7.8804, lon: 98.3923, profile: 'coastal-tropical' },
  { city: 'Penang', country: 'MY', lat: 5.4164, lon: 100.3327, profile: 'equatorial-clean' },
  { city: 'Johor Bahru', country: 'MY', lat: 1.4927, lon: 103.7414, profile: 'equatorial-clean' },
  { city: 'Surabaya', country: 'ID', lat: -7.2575, lon: 112.7521, profile: 'coastal-megacity' },
  { city: 'Bandung', country: 'ID', lat: -6.9175, lon: 107.6191, profile: 'plateau-tech' },
  { city: 'Medan', country: 'ID', lat: 3.5952, lon: 98.6722, profile: 'coastal-tropical' },
  { city: 'Makassar', country: 'ID', lat: -5.1477, lon: 119.4327, profile: 'coastal-tropical' },
  { city: 'Yogyakarta', country: 'ID', lat: -7.7956, lon: 110.3695, profile: 'plateau-tech' },
  { city: 'Cebu', country: 'PH', lat: 10.3157, lon: 123.8854, profile: 'coastal-tropical' },
  { city: 'Davao', country: 'PH', lat: 7.1907, lon: 125.4553, profile: 'coastal-tropical' },
  { city: 'Da Nang', country: 'VN', lat: 16.0544, lon: 108.2022, profile: 'coastal-tropical' },
  { city: 'Hai Phong', country: 'VN', lat: 20.8449, lon: 106.6881, profile: 'river-delta' },
  { city: 'Siem Reap', country: 'KH', lat: 13.3671, lon: 103.8448, profile: 'river-delta' },
  { city: 'Mandalay', country: 'MM', lat: 21.9588, lon: 96.0891, profile: 'dry-inland' },
  { city: 'Nanjing', country: 'CN', lat: 32.0603, lon: 118.7969, profile: 'river-delta' },
  { city: 'Hangzhou', country: 'CN', lat: 30.2741, lon: 120.1551, profile: 'river-delta' },
  { city: 'Tianjin', country: 'CN', lat: 39.3434, lon: 117.3616, profile: 'continental-polluted' },
  { city: 'Chongqing', country: 'CN', lat: 29.4316, lon: 106.9123, profile: 'mountain-basin' },
  { city: "Xi'an", country: 'CN', lat: 34.3416, lon: 108.9398, profile: 'continental-polluted' },
  { city: 'Suzhou', country: 'CN', lat: 31.2989, lon: 120.5853, profile: 'river-delta' },
  { city: 'Harbin', country: 'CN', lat: 45.8038, lon: 126.5349, profile: 'cold-continental' },
  { city: 'Qingdao', country: 'CN', lat: 36.0671, lon: 120.3826, profile: 'coastal-clean' },
  { city: 'Dalian', country: 'CN', lat: 38.914, lon: 121.6147, profile: 'coastal-clean' },
  { city: 'Kunming', country: 'CN', lat: 24.8801, lon: 102.8329, profile: 'highland-clean' },
  { city: 'Shenyang', country: 'CN', lat: 41.8057, lon: 123.4315, profile: 'cold-continental' },
  { city: 'Xiamen', country: 'CN', lat: 24.4798, lon: 118.0894, profile: 'coastal-tropical' },
  { city: 'Zhengzhou', country: 'CN', lat: 34.7466, lon: 113.6254, profile: 'continental-polluted' },
  { city: 'Jinan', country: 'CN', lat: 36.6512, lon: 117.12, profile: 'continental-polluted' },
  { city: 'Ningbo', country: 'CN', lat: 29.8683, lon: 121.544, profile: 'coastal-tropical' },
  { city: 'Incheon', country: 'KR', lat: 37.4563, lon: 126.7052, profile: 'coastal-clean' },
  { city: 'Daegu', country: 'KR', lat: 35.8714, lon: 128.6014, profile: 'temperate-urban' },
  { city: 'Nagoya', country: 'JP', lat: 35.1815, lon: 136.9066, profile: 'temperate-urban' },
  { city: 'Fukuoka', country: 'JP', lat: 33.5904, lon: 130.4017, profile: 'coastal-clean' },
  { city: 'Kyoto', country: 'JP', lat: 35.0116, lon: 135.7681, profile: 'temperate-urban' },
  { city: 'Yokohama', country: 'JP', lat: 35.4437, lon: 139.638, profile: 'temperate-urban' },
  { city: 'Adelaide', country: 'AU', lat: -34.9285, lon: 138.6007, profile: 'coastal-clean' },
  { city: 'Canberra', country: 'AU', lat: -35.2809, lon: 149.13, profile: 'temperate-urban' },
  { city: 'Gold Coast', country: 'AU', lat: -28.0167, lon: 153.4, profile: 'coastal-clean' },
  { city: 'Newcastle', country: 'AU', lat: -32.9283, lon: 151.7817, profile: 'coastal-clean' },
  { city: 'Christchurch', country: 'NZ', lat: -43.5321, lon: 172.6362, profile: 'coastal-clean' },
  { city: 'Hamilton', country: 'NZ', lat: -37.787, lon: 175.2793, profile: 'coastal-clean' },
  { city: 'Sharjah', country: 'AE', lat: 25.3463, lon: 55.4209, profile: 'desert-megacity' },
  { city: 'Mecca', country: 'SA', lat: 21.3891, lon: 39.8579, profile: 'coastal-dry' },
  { city: 'Medina', country: 'SA', lat: 24.5247, lon: 39.5692, profile: 'desert-megacity' },
  { city: 'Dammam', country: 'SA', lat: 26.4207, lon: 50.0888, profile: 'coastal-dry' },
  { city: 'Mashhad', country: 'IR', lat: 36.2605, lon: 59.6168, profile: 'dry-inland' },
  { city: 'Isfahan', country: 'IR', lat: 32.6546, lon: 51.668, profile: 'dry-inland' },
  { city: 'Shiraz', country: 'IR', lat: 29.5918, lon: 52.5837, profile: 'dry-clean' },
  { city: 'Tabriz', country: 'IR', lat: 38.0962, lon: 46.2738, profile: 'cold-continental' },
  { city: 'Ankara', country: 'TR', lat: 39.9334, lon: 32.8597, profile: 'temperate-urban' },
  { city: 'Izmir', country: 'TR', lat: 38.4237, lon: 27.1428, profile: 'coastal-clean' },
  { city: 'Bursa', country: 'TR', lat: 40.195, lon: 29.0601, profile: 'temperate-urban' },
  { city: 'Antalya', country: 'TR', lat: 36.8969, lon: 30.7133, profile: 'coastal-clean' },
  { city: 'Giza', country: 'EG', lat: 30.0131, lon: 31.2089, profile: 'desert-megacity' },
  { city: 'Sharm El Sheikh', country: 'EG', lat: 27.9158, lon: 34.33, profile: 'coastal-dry' },
  { city: 'Marrakech', country: 'MA', lat: 31.6295, lon: -7.9811, profile: 'dry-clean' },
  { city: 'Rabat', country: 'MA', lat: 34.0209, lon: -6.8416, profile: 'coastal-clean' },
  { city: 'Tangier', country: 'MA', lat: 35.7595, lon: -5.834, profile: 'coastal-clean' },
  { city: 'Port Harcourt', country: 'NG', lat: 4.8156, lon: 7.0498, profile: 'coastal-tropical' },
  { city: 'Kano', country: 'NG', lat: 12.0022, lon: 8.592, profile: 'savannah' },
  { city: 'Ibadan', country: 'NG', lat: 7.3775, lon: 3.947, profile: 'savannah' },
  { city: 'Mombasa', country: 'KE', lat: -4.0435, lon: 39.6682, profile: 'coastal-tropical' },
  { city: 'Kisumu', country: 'KE', lat: -0.0917, lon: 34.768, profile: 'highland-clean' },
  { city: 'Dire Dawa', country: 'ET', lat: 9.6009, lon: 41.8501, profile: 'savannah' },
  { city: 'Pretoria', country: 'ZA', lat: -25.7479, lon: 28.2293, profile: 'plateau-tech' },
  { city: 'Bloemfontein', country: 'ZA', lat: -29.0852, lon: 26.1596, profile: 'dry-clean' },
  { city: 'Port Elizabeth', country: 'ZA', lat: -33.9608, lon: 25.6022, profile: 'coastal-clean' },
  { city: 'Kumasi', country: 'GH', lat: 6.6885, lon: -1.6244, profile: 'coastal-tropical' },
  { city: 'Oran', country: 'DZ', lat: 35.6971, lon: -0.6308, profile: 'coastal-clean' },
  { city: 'Constantine', country: 'DZ', lat: 36.365, lon: 6.6147, profile: 'temperate-urban' },
  { city: 'Lyon', country: 'FR', lat: 45.764, lon: 4.8357, profile: 'temperate-urban' },
  { city: 'Marseille', country: 'FR', lat: 43.2965, lon: 5.3698, profile: 'coastal-clean' },
  { city: 'Toulouse', country: 'FR', lat: 43.6047, lon: 1.4442, profile: 'temperate-urban' },
  { city: 'Nice', country: 'FR', lat: 43.7102, lon: 7.262, profile: 'coastal-clean' },
  { city: 'Birmingham', country: 'GB', lat: 52.4862, lon: -1.8904, profile: 'temperate-urban' },
  { city: 'Glasgow', country: 'GB', lat: 55.8642, lon: -4.2518, profile: 'coastal-clean' },
  { city: 'Edinburgh', country: 'GB', lat: 55.9533, lon: -3.1883, profile: 'coastal-clean' },
  { city: 'Liverpool', country: 'GB', lat: 53.4084, lon: -2.9916, profile: 'coastal-clean' },
  { city: 'Bristol', country: 'GB', lat: 51.4545, lon: -2.5879, profile: 'temperate-urban' },
  { city: 'Hamburg', country: 'DE', lat: 53.5511, lon: 9.9937, profile: 'temperate-urban' },
  { city: 'Cologne', country: 'DE', lat: 50.9375, lon: 6.9603, profile: 'temperate-urban' },
  { city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821, profile: 'temperate-urban' },
  { city: 'Stuttgart', country: 'DE', lat: 48.7758, lon: 9.1829, profile: 'temperate-urban' },
  { city: 'Dusseldorf', country: 'DE', lat: 51.2277, lon: 6.7735, profile: 'temperate-urban' },
  { city: 'Valencia', country: 'ES', lat: 39.4699, lon: -0.3763, profile: 'coastal-clean' },
  { city: 'Seville', country: 'ES', lat: 37.3891, lon: -5.9845, profile: 'dry-clean' },
  { city: 'Malaga', country: 'ES', lat: 36.7213, lon: -4.4214, profile: 'coastal-clean' },
  { city: 'Bilbao', country: 'ES', lat: 43.263, lon: -2.935, profile: 'coastal-clean' },
  { city: 'Naples', country: 'IT', lat: 40.8518, lon: 14.2681, profile: 'coastal-clean' },
  { city: 'Turin', country: 'IT', lat: 45.0703, lon: 7.6869, profile: 'continental-polluted' },
  { city: 'Florence', country: 'IT', lat: 43.7696, lon: 11.2558, profile: 'temperate-urban' },
  { city: 'Bologna', country: 'IT', lat: 44.4949, lon: 11.3426, profile: 'temperate-urban' },
  { city: 'Venice', country: 'IT', lat: 45.4408, lon: 12.3155, profile: 'coastal-clean' },
  { city: 'Rotterdam', country: 'NL', lat: 51.9244, lon: 4.4777, profile: 'temperate-urban' },
  { city: 'The Hague', country: 'NL', lat: 52.0705, lon: 4.3007, profile: 'coastal-clean' },
  { city: 'Utrecht', country: 'NL', lat: 52.0907, lon: 5.1214, profile: 'temperate-urban' },
  { city: 'Antwerp', country: 'BE', lat: 51.2194, lon: 4.4025, profile: 'temperate-urban' },
  { city: 'Ghent', country: 'BE', lat: 51.0543, lon: 3.7174, profile: 'temperate-urban' },
  { city: 'Geneva', country: 'CH', lat: 46.2044, lon: 6.1432, profile: 'cold-clean' },
  { city: 'Basel', country: 'CH', lat: 47.5596, lon: 7.5886, profile: 'cold-clean' },
  { city: 'Salzburg', country: 'AT', lat: 47.8095, lon: 13.055, profile: 'cold-clean' },
  { city: 'Graz', country: 'AT', lat: 47.0707, lon: 15.4395, profile: 'temperate-urban' },
  { city: 'Brno', country: 'CZ', lat: 49.1951, lon: 16.6068, profile: 'temperate-urban' },
  { city: 'Krakow', country: 'PL', lat: 50.0647, lon: 19.945, profile: 'continental-polluted' },
  { city: 'Gdansk', country: 'PL', lat: 54.352, lon: 18.6466, profile: 'coastal-clean' },
  { city: 'Wroclaw', country: 'PL', lat: 51.1079, lon: 17.0385, profile: 'temperate-urban' },
  { city: 'Lodz', country: 'PL', lat: 51.7592, lon: 19.456, profile: 'continental-polluted' },
  { city: 'Gothenburg', country: 'SE', lat: 57.7089, lon: 11.9746, profile: 'cold-clean' },
  { city: 'Malmo', country: 'SE', lat: 55.6049, lon: 13.0038, profile: 'cold-clean' },
  { city: 'Bergen', country: 'NO', lat: 60.3913, lon: 5.3221, profile: 'coastal-clean' },
  { city: 'Aarhus', country: 'DK', lat: 56.1629, lon: 10.2039, profile: 'cold-clean' },
  { city: 'Tampere', country: 'FI', lat: 61.4978, lon: 23.761, profile: 'cold-clean' },
  { city: 'Thessaloniki', country: 'GR', lat: 40.6401, lon: 22.9444, profile: 'coastal-clean' },
  { city: 'Porto', country: 'PT', lat: 41.1579, lon: -8.6291, profile: 'coastal-clean' },
  { city: 'Cork', country: 'IE', lat: 51.8985, lon: -8.4756, profile: 'coastal-clean' },
  { city: 'Saint Petersburg', country: 'RU', lat: 59.9311, lon: 30.3609, profile: 'cold-continental' },
  { city: 'Novosibirsk', country: 'RU', lat: 55.0084, lon: 82.9357, profile: 'cold-continental' },
  { city: 'Yekaterinburg', country: 'RU', lat: 56.8389, lon: 60.6057, profile: 'cold-continental' },
  { city: 'Kazan', country: 'RU', lat: 55.8304, lon: 49.0661, profile: 'cold-continental' },
  { city: 'Lviv', country: 'UA', lat: 49.8397, lon: 24.0297, profile: 'cold-continental' },
  { city: 'Odesa', country: 'UA', lat: 46.4825, lon: 30.7233, profile: 'coastal-clean' },
  { city: 'Philadelphia', country: 'US', lat: 39.9526, lon: -75.1652, profile: 'temperate-urban' },
  { city: 'Boston', country: 'US', lat: 42.3601, lon: -71.0589, profile: 'cold-continental' },
  { city: 'Atlanta', country: 'US', lat: 33.749, lon: -84.388, profile: 'temperate-urban' },
  { city: 'Dallas', country: 'US', lat: 32.7767, lon: -96.797, profile: 'dry-clean' },
  { city: 'Denver', country: 'US', lat: 39.7392, lon: -104.9903, profile: 'highland-clean' },
  { city: 'Detroit', country: 'US', lat: 42.3314, lon: -83.0458, profile: 'cold-continental' },
  { city: 'Minneapolis', country: 'US', lat: 44.9778, lon: -93.265, profile: 'cold-continental' },
  { city: 'Washington', country: 'US', lat: 38.9072, lon: -77.0369, profile: 'temperate-urban' },
  { city: 'San Diego', country: 'US', lat: 32.7157, lon: -117.1611, profile: 'coastal-clean' },
  { city: 'Las Vegas', country: 'US', lat: 36.1699, lon: -115.1398, profile: 'desert-megacity' },
  { city: 'Portland', country: 'US', lat: 45.5152, lon: -122.6784, profile: 'coastal-clean' },
  { city: 'Orlando', country: 'US', lat: 28.5383, lon: -81.3792, profile: 'coastal-tropical' },
  { city: 'Charlotte', country: 'US', lat: 35.2271, lon: -80.8431, profile: 'temperate-urban' },
  { city: 'San Antonio', country: 'US', lat: 29.4241, lon: -98.4936, profile: 'dry-clean' },
  { city: 'Calgary', country: 'CA', lat: 51.0447, lon: -114.0719, profile: 'cold-continental' },
  { city: 'Ottawa', country: 'CA', lat: 45.4215, lon: -75.6972, profile: 'cold-continental' },
  { city: 'Edmonton', country: 'CA', lat: 53.5461, lon: -113.4938, profile: 'cold-continental' },
  { city: 'Monterrey', country: 'MX', lat: 25.6866, lon: -100.3161, profile: 'dry-clean' },
  { city: 'Tijuana', country: 'MX', lat: 32.5149, lon: -117.0382, profile: 'coastal-clean' },
  { city: 'Puebla', country: 'MX', lat: 19.0414, lon: -98.2063, profile: 'mountain-basin' },
  { city: 'Leon', country: 'MX', lat: 21.122, lon: -101.68, profile: 'plateau-tech' },
  { city: 'Merida', country: 'MX', lat: 20.9674, lon: -89.5926, profile: 'coastal-tropical' },
  { city: 'Medellin', country: 'CO', lat: 6.2442, lon: -75.5812, profile: 'highland-clean' },
  { city: 'Cali', country: 'CO', lat: 3.4516, lon: -76.532, profile: 'highland-clean' },
  { city: 'Cartagena', country: 'CO', lat: 10.391, lon: -75.4794, profile: 'coastal-tropical' },
  { city: 'Arequipa', country: 'PE', lat: -16.409, lon: -71.5375, profile: 'highland-clean' },
  { city: 'Cusco', country: 'PE', lat: -13.5319, lon: -71.9675, profile: 'highland-clean' },
  { city: 'Valparaiso', country: 'CL', lat: -33.0472, lon: -71.6127, profile: 'coastal-clean' },
  { city: 'Concepcion', country: 'CL', lat: -36.827, lon: -73.0498, profile: 'coastal-clean' },
  { city: 'Cordoba', country: 'AR', lat: -31.4201, lon: -64.1888, profile: 'temperate-urban' },
  { city: 'Mendoza', country: 'AR', lat: -32.8895, lon: -68.8458, profile: 'dry-clean' },
  { city: 'Rosario', country: 'AR', lat: -32.9442, lon: -60.6505, profile: 'temperate-urban' },
  { city: 'Salvador', country: 'BR', lat: -12.9777, lon: -38.5016, profile: 'coastal-tropical' },
  { city: 'Fortaleza', country: 'BR', lat: -3.7319, lon: -38.5267, profile: 'coastal-tropical' },
  { city: 'Recife', country: 'BR', lat: -8.0476, lon: -34.877, profile: 'coastal-tropical' },
  { city: 'Curitiba', country: 'BR', lat: -25.429, lon: -49.2671, profile: 'temperate-urban' },
  { city: 'Porto Alegre', country: 'BR', lat: -30.0346, lon: -51.2177, profile: 'temperate-urban' },
  { city: 'Belo Horizonte', country: 'BR', lat: -19.9167, lon: -43.9345, profile: 'megacity-humid' },
  { city: 'Manaus', country: 'BR', lat: -3.119, lon: -60.0217, profile: 'equatorial-clean' },
];

const profileSeeds = {
  'coastal-megacity': { aqi: 118, temperature: 29, humidity: 72, windSpeed: 4.6, pressure: 1008, condition: 'Haze', pollutants: { pm25: 58, pm10: 82, no2: 28, so2: 13, o3: 26, co: 7 } },
  'continental-polluted': { aqi: 176, temperature: 26, humidity: 50, windSpeed: 3.2, pressure: 1002, condition: 'Smoke', pollutants: { pm25: 102, pm10: 148, no2: 42, so2: 18, o3: 21, co: 10 } },
  'plateau-tech': { aqi: 88, temperature: 24, humidity: 57, windSpeed: 4.2, pressure: 1009, condition: 'Clouds', pollutants: { pm25: 30, pm10: 44, no2: 18, so2: 8, o3: 29, co: 4 } },
  'river-delta': { aqi: 132, temperature: 28, humidity: 74, windSpeed: 3.8, pressure: 1006, condition: 'Mist', pollutants: { pm25: 64, pm10: 96, no2: 26, so2: 12, o3: 24, co: 6 } },
  'mountain-basin': { aqi: 142, temperature: 22, humidity: 48, windSpeed: 2.8, pressure: 1004, condition: 'Haze', pollutants: { pm25: 72, pm10: 101, no2: 24, so2: 11, o3: 18, co: 5 } },
  'coastal-tropical': { aqi: 96, temperature: 30, humidity: 76, windSpeed: 4.9, pressure: 1009, condition: 'Clouds', pollutants: { pm25: 34, pm10: 52, no2: 16, so2: 7, o3: 31, co: 4 } },
  'equatorial-clean': { aqi: 61, temperature: 31, humidity: 79, windSpeed: 4.7, pressure: 1010, condition: 'Rain', pollutants: { pm25: 20, pm10: 29, no2: 10, so2: 5, o3: 20, co: 3 } },
  'temperate-urban': { aqi: 74, temperature: 18, humidity: 66, windSpeed: 5, pressure: 1014, condition: 'Clouds', pollutants: { pm25: 24, pm10: 37, no2: 17, so2: 6, o3: 28, co: 3 } },
  'cold-clean': { aqi: 39, temperature: 9, humidity: 62, windSpeed: 5.6, pressure: 1018, condition: 'Clear', pollutants: { pm25: 12, pm10: 18, no2: 8, so2: 4, o3: 17, co: 2 } },
  'dry-clean': { aqi: 82, temperature: 27, humidity: 40, windSpeed: 4.1, pressure: 1011, condition: 'Clear', pollutants: { pm25: 29, pm10: 40, no2: 15, so2: 6, o3: 34, co: 4 } },
  'desert-megacity': { aqi: 124, temperature: 36, humidity: 28, windSpeed: 3.9, pressure: 1003, condition: 'Dust', pollutants: { pm25: 48, pm10: 92, no2: 25, so2: 9, o3: 33, co: 5 } },
  'coastal-dry': { aqi: 91, temperature: 28, humidity: 52, windSpeed: 4.8, pressure: 1009, condition: 'Clear', pollutants: { pm25: 31, pm10: 49, no2: 14, so2: 6, o3: 29, co: 4 } },
  savannah: { aqi: 68, temperature: 27, humidity: 58, windSpeed: 4.5, pressure: 1008, condition: 'Clouds', pollutants: { pm25: 24, pm10: 34, no2: 12, so2: 5, o3: 24, co: 3 } },
  'highland-clean': { aqi: 58, temperature: 19, humidity: 61, windSpeed: 4.4, pressure: 1012, condition: 'Clouds', pollutants: { pm25: 19, pm10: 27, no2: 11, so2: 5, o3: 21, co: 3 } },
  'coastal-clean': { aqi: 52, temperature: 21, humidity: 68, windSpeed: 5.4, pressure: 1015, condition: 'Clear', pollutants: { pm25: 16, pm10: 24, no2: 10, so2: 4, o3: 22, co: 2 } },
  'cold-continental': { aqi: 79, temperature: 12, humidity: 60, windSpeed: 4.7, pressure: 1013, condition: 'Clouds', pollutants: { pm25: 28, pm10: 41, no2: 17, so2: 7, o3: 23, co: 3 } },
  'megacity-humid': { aqi: 108, temperature: 27, humidity: 73, windSpeed: 4.1, pressure: 1008, condition: 'Clouds', pollutants: { pm25: 42, pm10: 61, no2: 20, so2: 9, o3: 28, co: 4 } },
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .reduce((env, line) => {
      const [key, ...valueParts] = line.split('=');
      env[key.trim()] = valueParts.join('=').trim();
      return env;
    }, {});
}

function buildDefaultCityList() {
  return globalCityCatalog.map((entry) => entry.city);
}

function loadConfig() {
  const env = {
    ...parseEnvFile(path.join(appRoot, '.env')),
    ...parseEnvFile(path.join(appRoot, '.env.local')),
    ...process.env,
  };

  const cityList = env.CITY_LIST
    ? env.CITY_LIST.split(',').map((city) => city.trim()).filter(Boolean)
    : env.CITY
      ? env.CITY.split(',').map((city) => city.trim()).filter(Boolean)
      : buildDefaultCityList();

  return {
    waqiApiKey: env.WAQI_API_KEY || '',
    weatherApiKey: env.OPENWEATHER_API_KEY || env.REACT_APP_OPENWEATHER_API_KEY || '',
    alertMode: env.ALERT_MODE || 'console',
    emailUser: env.EMAIL_USER || '',
    emailPass: env.EMAIL_PASS || '',
    alertRecipient: env.ALERT_RECIPIENT || env.EMAIL_USER || '',
    twilioAccountSid: env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: env.TWILIO_PHONE_NUMBER || '',
    smsRecipient: env.SMS_RECIPIENT || '',
    schedule: env.PIPELINE_CRON || '*/30 * * * *',
    liveConcurrency: Number(env.PIPELINE_CONCURRENCY || 8),
    cityList,
    thresholds: {
      warning: Number(env.AQI_WARNING_THRESHOLD || defaultThresholds.warning),
      danger: Number(env.AQI_DANGER_THRESHOLD || defaultThresholds.danger),
      hazardous: Number(env.AQI_HAZARDOUS_THRESHOLD || defaultThresholds.hazardous),
      spikeDelta: Number(env.AQI_SPIKE_DELTA || defaultThresholds.spikeDelta),
    },
  };
}

function ensureDirectories() {
  [publicDataDir, publicReportsDir, archiveDir, logsDir].forEach((dirPath) => fs.mkdirSync(dirPath, { recursive: true }));
}

function slugify(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function categorizeAqi(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCityMetadata(cityName) {
  return globalCityCatalog.find((entry) => entry.city.toLowerCase() === cityName.toLowerCase()) || null;
}

async function fetchWeather(city, apiKey) {
  const url = 'https://api.openweathermap.org/data/2.5/weather';
  const response = await axios.get(url, {
    params: {
      q: city,
      appid: apiKey,
      units: 'metric',
    },
    timeout: 15000,
  });

  return response.data;
}

async function fetchAqi(city, apiKey) {
  const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/`;
  const response = await axios.get(url, {
    params: {
      token: apiKey,
    },
    timeout: 15000,
  });

  if (response.data.status !== 'ok') {
    throw new Error(`WAQI request failed for ${city}: ${response.data.data || response.data.status}`);
  }

  return response.data.data;
}

function normalizeSnapshot(city, weatherPayload, aqiPayload) {
  const fallbackMeta = getCityMetadata(city);
  const fetchedAt = new Date().toISOString();
  const pollutants = {
    pm25: toNumber(aqiPayload.iaqi?.pm25?.v),
    pm10: toNumber(aqiPayload.iaqi?.pm10?.v),
    no2: toNumber(aqiPayload.iaqi?.no2?.v),
    so2: toNumber(aqiPayload.iaqi?.so2?.v),
    o3: toNumber(aqiPayload.iaqi?.o3?.v),
    co: toNumber(aqiPayload.iaqi?.co?.v),
  };

  return {
    id: `${slugify(city)}-${Date.now()}`,
    city: weatherPayload.name || city,
    country: weatherPayload.sys?.country || fallbackMeta?.country || aqiPayload.city?.name?.split(',').pop()?.trim() || 'NA',
    fetchedAt,
    aqi: Number(aqiPayload.aqi),
    aqiCategory: categorizeAqi(Number(aqiPayload.aqi)),
    dominantPollutant: aqiPayload.dominentpol || 'pm25',
    weather: {
      temperature: toNumber(weatherPayload.main.temp, 0),
      feelsLike: toNumber(weatherPayload.main.feels_like, 0),
      humidity: toNumber(weatherPayload.main.humidity, 0),
      windSpeed: toNumber(weatherPayload.wind.speed, 0),
      pressure: toNumber(weatherPayload.main.pressure, 0),
      condition: weatherPayload.weather?.[0]?.main || 'Unknown',
      clouds: toNumber(weatherPayload.clouds?.all, 0),
    },
    geo: {
      lat: toNumber(weatherPayload.coord?.lat, fallbackMeta?.lat || 0),
      lon: toNumber(weatherPayload.coord?.lon, fallbackMeta?.lon || 0),
    },
    pollutants,
  };
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function dedupeLatestHistory(records, maxRecords = 2400) {
  return records
    .sort((left, right) => new Date(right.fetchedAt).getTime() - new Date(left.fetchedAt).getTime())
    .slice(0, maxRecords);
}

function calculatePearsonCorrelation(records, metric) {
  const pairs = records
    .map((record) => ({
      aqi: toNumber(record.aqi),
      metric: toNumber(record.weather?.[metric]),
    }))
    .filter((pair) => pair.aqi !== null && pair.metric !== null);

  if (pairs.length < 2) {
    return 0;
  }

  const count = pairs.length;
  const sumX = pairs.reduce((total, pair) => total + pair.metric, 0);
  const sumY = pairs.reduce((total, pair) => total + pair.aqi, 0);
  const sumXY = pairs.reduce((total, pair) => total + pair.metric * pair.aqi, 0);
  const sumX2 = pairs.reduce((total, pair) => total + pair.metric ** 2, 0);
  const sumY2 = pairs.reduce((total, pair) => total + pair.aqi ** 2, 0);

  const numerator = count * sumXY - sumX * sumY;
  const denominator = Math.sqrt((count * sumX2 - sumX ** 2) * (count * sumY2 - sumY ** 2));

  if (!denominator) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(3));
}

function summarizeInsights(latestCities, fullHistory, alerts) {
  const averageAqi = latestCities.reduce((sum, city) => sum + city.aqi, 0) / latestCities.length;
  const highestAqiRecord = [...latestCities].sort((left, right) => right.aqi - left.aqi)[0] || null;
  const correlations = correlationPairs.map(([metric, label]) => ({
    metric,
    label,
    coefficient: calculatePearsonCorrelation(fullHistory, metric),
  }));

  const pollutantTotals = latestCities.reduce((totals, city) => {
    Object.entries(city.pollutants || {}).forEach(([pollutant, value]) => {
      if (typeof value === 'number') {
        totals[pollutant] = (totals[pollutant] || 0) + value;
      }
    });
    return totals;
  }, {});

  const topPollutantEntry = Object.entries(pollutantTotals).sort((left, right) => right[1] - left[1])[0];
  const countrySpread = latestCities.reduce((accumulator, city) => {
    accumulator[city.country] = (accumulator[city.country] || 0) + 1;
    return accumulator;
  }, {});

  return {
    averageAqi,
    highestAqiCity: highestAqiRecord?.city || 'N/A',
    totalCities: latestCities.length,
    criticalCities: latestCities.filter((city) => city.aqi >= 150).length,
    alertCount: alerts.length,
    correlations,
    topPollutant: topPollutantEntry ? topPollutantEntry[0] : 'unknown',
    totalCountries: Object.keys(countrySpread).length,
    warningCities: latestCities.filter((city) => city.aqi >= 100).length,
  };
}

function escapePdfText(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(pages) {
  const objects = [];
  const pageObjectIds = [];
  const fontObjectId = 3;

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj');
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  pages.forEach((lines) => {
    const contentLines = ['BT', '/F1 12 Tf', '50 790 Td', '16 TL'];
    lines.forEach((line, index) => {
      if (index === 0) {
        contentLines.push(`(${escapePdfText(line)}) Tj`);
      } else {
        contentLines.push('T*');
        contentLines.push(`(${escapePdfText(line)}) Tj`);
      }
    });
    contentLines.push('ET');

    const contentStream = contentLines.join('\n');
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      `${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjectId} 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>\nendobj`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function writeJudgePdf(latestCities, summary, alerts) {
  const latestPath = path.join(publicDataDir, 'environment-latest.json');
  const alertsPath = path.join(publicDataDir, 'alerts.json');
  const analyticsPath = path.join(publicDataDir, 'analytics.json');
  const outputPath = path.join(publicReportsDir, 'judge-brief.pdf');
  const pythonCandidates = [bundledPython, 'python3'];

  for (const pythonBinary of pythonCandidates) {
    const result = spawnSync(
      pythonBinary,
      [path.join(appRoot, 'scripts', 'generate_judge_deck.py'), latestPath, alertsPath, analyticsPath, outputPath],
      { encoding: 'utf8' }
    );

    if (result.status === 0) {
      return;
    }
  }

  const topRisk = [...latestCities].sort((left, right) => right.aqi - left.aqi).slice(0, 10);
  const regionBuckets = latestCities.reduce((accumulator, city) => {
    const country = city.country;
    accumulator[country] = accumulator[country] || { count: 0, total: 0 };
    accumulator[country].count += 1;
    accumulator[country].total += city.aqi;
    return accumulator;
  }, {});
  const topCountries = Object.entries(regionBuckets)
    .map(([country, stats]) => `${country}: avg AQI ${Math.round(stats.total / stats.count)} across ${stats.count} cities`)
    .sort()
    .slice(0, 12);

  const pages = [
    [
      'Global Air Quality & Weather Intelligence System',
      'Judge Deck - Executive Summary',
      `Generated: ${new Date().toISOString()}`,
      `Tracked cities: ${summary.totalCities}`,
      `Covered countries: ${summary.totalCountries}`,
      `Average AQI: ${Math.round(summary.averageAqi)}`,
      `Critical cities: ${summary.criticalCities}`,
      `Triggered alerts: ${summary.alertCount}`,
      `Top pollutant: ${summary.topPollutant}`,
      '',
      'This deck is generated automatically by the pipeline.',
    ],
    [
      'Judge Deck - Top Risk Cities',
      ...topRisk.map((city, index) => `${index + 1}. ${city.city}, ${city.country} | AQI ${city.aqi} | ${city.aqiCategory}`),
    ],
    [
      'Judge Deck - Country Coverage',
      ...topCountries,
      '',
      'Latest Alerts:',
      ...(alerts.length ? alerts.slice(0, 10).map((alert) => `- ${alert.city}: ${alert.rule} | AQI ${alert.aqi}`) : ['- No active alerts']),
    ],
  ];

  fs.writeFileSync(outputPath, buildSimplePdf(pages));
}

function writeJudgeHtmlReport(latestCities, summary, alerts) {
  const outputPath = path.join(publicReportsDir, 'judge-brief.html');
  const topRisk = [...latestCities].sort((left, right) => right.aqi - left.aqi).slice(0, 12);
  const groupedCountries = latestCities.reduce((accumulator, city) => {
    const bucket = accumulator[city.country] || { count: 0, totalAqi: 0, maxAqi: 0 };
    bucket.count += 1;
    bucket.totalAqi += city.aqi;
    bucket.maxAqi = Math.max(bucket.maxAqi, city.aqi);
    accumulator[city.country] = bucket;
    return accumulator;
  }, {});
  const topCountries = Object.entries(groupedCountries)
    .map(([country, stats]) => ({
      country,
      count: stats.count,
      averageAqi: Math.round(stats.totalAqi / stats.count),
      maxAqi: stats.maxAqi,
    }))
    .sort((left, right) => right.averageAqi - left.averageAqi)
    .slice(0, 10);
  const latestAlerts = alerts.slice(0, 14);
  const generatedAt = new Date().toISOString();

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Global Air Quality & Weather Intelligence System - Executive Brief</title>
    <style>
      :root {
        --ink: #0c1626;
        --muted: #5c6d82;
        --panel: #ffffff;
        --line: #dbe4ef;
        --paper: #eef4f8;
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; background: var(--paper); color: var(--ink); }
      .page { width: 100%; max-width: none; margin: 0; padding: clamp(20px, 3vw, 56px) clamp(20px, 3vw, 64px) 56px; }
      .page > * { width: 100%; }
      .hero { background: linear-gradient(135deg, #0c1a2c, #16314f 55%, #234a64); color: white; border-radius: 28px; padding: 36px; }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: #8bd4e7; font-weight: 700; margin-bottom: 12px; }
      h1, h2 { margin: 0; }
      h1 { font-family: Georgia, serif; font-size: 44px; line-height: 1.05; max-width: 12ch; }
      .hero p { max-width: 72ch; color: rgba(255,255,255,0.84); line-height: 1.7; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 22px; }
      .stat, .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 16px 38px rgba(12, 22, 38, 0.06); }
      .stat { padding: 18px; }
      .stat span, .meta, th { color: #52657c; font-size: 13px; font-weight: 600; }
      .stat strong { display: block; margin-top: 8px; font-size: 26px; }
      .section { margin-top: 26px; }
      .section h2 { margin-bottom: 14px; font-size: 28px; font-family: Georgia, serif; }
      .two-up { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 20px; align-items: start; }
      .country-alerts { align-items: stretch; }
      .country-alerts > .panel:first-child { display: flex; flex-direction: column; }
      .country-insight { margin-top: auto; padding: 22px; border-radius: 18px; color: #f5fbff; background: linear-gradient(135deg, #102a46, #1c4964); }
      .country-insight .meta { color: #9ed9e8; }
      .country-insight h3 { margin: 6px 0 8px; font-size: 22px; }
      .country-insight p { margin: 0; color: rgba(245,251,255,0.82); line-height: 1.6; }
      .insight-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
      .insight-metric { padding: 12px 14px; border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; background: rgba(255,255,255,0.08); }
      .insight-metric span { display: block; color: #b7cede; font-size: 12px; }
      .insight-metric strong { display: block; margin-top: 5px; font-size: 19px; }
      .panel { padding: 24px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
      ul { margin: 0; padding-left: 18px; }
      li { margin-bottom: 10px; line-height: 1.5; }
      .alert-list { list-style: none; padding: 0; display: grid; gap: 12px; }
      .alert-item { overflow-wrap: anywhere; }
      .alert-item { padding: 14px 16px; border-radius: 16px; border: 1px solid var(--line); background: linear-gradient(180deg, #ffffff, #f7fafc); line-height: 1.55; }
      .alert-item strong { color: #0f2743; }
      .badge-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
      .badge { padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(139, 212, 231, 0.28); background: rgba(255,255,255,0.92); color: #14304d; font-size: 13px; font-weight: 700; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); }
      .footer { margin-top: 28px; color: var(--muted); font-size: 12px; }
      @media print {
        body { background: white; }
        .page { max-width: none; padding: 20px; }
        .hero, .panel, .stat { box-shadow: none; }
      }
      @media (max-width: 900px) {
        .grid, .two-up { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <div class="eyebrow">Global Air Quality & Weather Intelligence System</div>
        <h1>Executive Environmental Intelligence Brief</h1>
        <p>
          This report summarizes the premium multi-city air-quality and weather intelligence pipeline, including integrated ingestion,
          normalized storage, automated alerts, regional comparison, and intervention-oriented decision support.
        </p>
        <div class="badge-row">
          <div class="badge">Generated ${generatedAt}</div>
          <div class="badge">Tracked cities ${summary.totalCities}</div>
          <div class="badge">Covered countries ${summary.totalCountries || 'N/A'}</div>
          <div class="badge">Top pollutant ${String(summary.topPollutant || '').toUpperCase()}</div>
        </div>
      </section>
      <section class="section">
        <div class="grid">
          <div class="stat"><span>Average AQI</span><strong>${Math.round(summary.averageAqi)}</strong></div>
          <div class="stat"><span>Critical cities</span><strong>${summary.criticalCities}</strong></div>
          <div class="stat"><span>Warning cities</span><strong>${summary.warningCities || 0}</strong></div>
          <div class="stat"><span>Triggered alerts</span><strong>${summary.alertCount}</strong></div>
        </div>
      </section>
      <section class="section two-up">
        <div class="panel">
          <div class="meta">Top Risk Cities</div>
          <h2>Highest AQI locations</h2>
          <table>
            <thead><tr><th>City</th><th>Country</th><th>AQI</th><th>Category</th></tr></thead>
            <tbody>${topRisk.map((city) => `<tr><td>${city.city}</td><td>${city.country}</td><td>${city.aqi}</td><td>${city.aqiCategory}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="panel">
          <div class="meta">Automation Summary</div>
          <h2>What the system already does</h2>
          <ul>
            <li>Ingests AQI and weather data across a global watchlist.</li>
            <li>Normalizes and merges both sources into structured records.</li>
            <li>Stores latest, history, archive, analytics, and exported reports.</li>
            <li>Detects threshold breaches, hazardous levels, and sudden spikes.</li>
            <li>Supports dashboard, API, PDF deck, and print-ready HTML outputs.</li>
          </ul>
        </div>
      </section>
      <section class="section two-up country-alerts">
        <div class="panel">
          <div class="meta">Country Intelligence</div>
          <h2>Highest average AQI by country</h2>
          <table>
            <thead><tr><th>Country</th><th>Cities</th><th>Avg AQI</th><th>Max AQI</th></tr></thead>
            <tbody>${topCountries.map((item) => `<tr><td>${item.country}</td><td>${item.count}</td><td>${item.averageAqi}</td><td>${item.maxAqi}</td></tr>`).join('')}</tbody>
          </table>
          <div class="country-insight">
            <div class="meta">Priority response</div>
            <h3>Focus attention where risk is highest</h3>
            <p>${topCountries[0]?.country || 'No region'} has the highest average AQI in this snapshot. Start with local validation and targeted public guidance; review the highest-risk city before broadening interventions.</p>
            <div class="insight-metrics">
              <div class="insight-metric"><span>Highest-risk city</span><strong>${topRisk[0]?.city || 'N/A'} · ${topRisk[0]?.aqi ?? '—'}</strong></div>
              <div class="insight-metric"><span>Highest country average</span><strong>${topCountries[0]?.country || 'N/A'} · ${topCountries[0]?.averageAqi ?? '—'}</strong></div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="meta">Latest Alerts</div>
          <h2>Most recent escalations</h2>
          <div class="alert-list">${latestAlerts.length ? latestAlerts.map((alert) => `<div class="alert-item"><strong>${alert.city}</strong>: ${alert.rule} at AQI ${alert.aqi}. ${alert.message}</div>`).join('') : '<div class="alert-item">No active alerts in the latest generation cycle.</div>'}</div>
        </div>
      </section>
      <div class="footer">
        Generated automatically by the environmental pipeline. Open this file in a browser and print to PDF for a polished executive handout.
      </div>
    </div>
  </body>
</html>`;

  fs.writeFileSync(outputPath, html);
}

function buildAlerts(latestCities, previousHistory, thresholds) {
  const previousByCity = previousHistory.reduce((map, record) => {
    if (!map[record.city]) {
      map[record.city] = record;
    }
    return map;
  }, {});

  return latestCities.flatMap((record) => {
    const previous = previousByCity[record.city];
    const delta = previous ? record.aqi - previous.aqi : 0;
    const alerts = [];

    if (record.aqi >= thresholds.danger) {
      alerts.push({
        id: `${record.id}-danger`,
        city: record.city,
        severity: record.aqi >= thresholds.hazardous ? 'critical' : 'warning',
        rule: 'AQI danger threshold',
        message: `${record.city} AQI reached ${record.aqi}, crossing the configured danger threshold.`,
        aqi: record.aqi,
        delta,
        createdAt: record.fetchedAt,
      });
    }

    if (record.aqi >= thresholds.warning && record.aqi < thresholds.danger) {
      alerts.push({
        id: `${record.id}-warning`,
        city: record.city,
        severity: 'warning',
        rule: 'AQI warning threshold',
        message: `${record.city} AQI reached ${record.aqi}, moving into an elevated-risk band.`,
        aqi: record.aqi,
        delta,
        createdAt: record.fetchedAt,
      });
    }

    if (record.aqi >= thresholds.hazardous) {
      alerts.push({
        id: `${record.id}-hazardous`,
        city: record.city,
        severity: 'critical',
        rule: 'Hazardous pollution level',
        message: `${record.city} has entered hazardous air-quality conditions. Immediate intervention is recommended.`,
        aqi: record.aqi,
        delta,
        createdAt: record.fetchedAt,
      });
    }

    if (delta >= thresholds.spikeDelta) {
      alerts.push({
        id: `${record.id}-spike`,
        city: record.city,
        severity: delta >= thresholds.spikeDelta * 1.5 ? 'critical' : 'warning',
        rule: 'Sudden AQI spike',
        message: `${record.city} AQI jumped by ${Math.round(delta)} points since the last stored snapshot.`,
        aqi: record.aqi,
        delta,
        createdAt: record.fetchedAt,
      });
    }

    return alerts;
  });
}

function writeOutputs(latestCities, fullHistory, alerts) {
  const generatedAt = new Date().toISOString();
  const summary = summarizeInsights(latestCities, fullHistory, alerts);
  const latestPayload = {
    generatedAt,
    cities: latestCities,
    summary,
  };

  fs.writeFileSync(path.join(publicDataDir, 'environment-latest.json'), JSON.stringify(latestPayload, null, 2));
  fs.writeFileSync(
    path.join(publicDataDir, 'environment-history.json'),
    JSON.stringify({ generatedAt, records: fullHistory }, null, 2)
  );
  fs.writeFileSync(path.join(publicDataDir, 'alerts.json'), JSON.stringify({ generatedAt, alerts }, null, 2));
  fs.writeFileSync(path.join(publicDataDir, 'analytics.json'), JSON.stringify({ generatedAt, summary }, null, 2));
  writeJudgeHtmlReport(latestCities, summary, alerts);
  writeJudgePdf(latestCities, summary, alerts);

  const archivePath = path.join(archiveDir, `${generatedAt.slice(0, 10)}.jsonl`);
  const archiveLines = latestCities.map((record) => JSON.stringify(record)).join('\n') + '\n';
  fs.appendFileSync(archivePath, archiveLines);
}

function logAlerts(alerts) {
  if (!alerts.length) {
    return;
  }

  const logPath = path.join(logsDir, 'alerts.log');
  const lines = alerts.map((alert) => `[${alert.createdAt}] ${alert.severity.toUpperCase()} ${alert.city}: ${alert.message}`);
  fs.appendFileSync(logPath, lines.join('\n') + '\n');
}

function sendConsoleAlerts(alerts) {
  alerts.forEach((alert) => {
    console.log(`[${alert.severity.toUpperCase()}] ${alert.city}: ${alert.message}`);
  });
}

function sendEmailAlerts(alerts, config) {
  if (!alerts.length || !config.emailUser || !config.emailPass || !config.alertRecipient) {
    return;
  }

  const messageLines = [
    `From: ${config.emailUser}`,
    `To: ${config.alertRecipient}`,
    'Subject: AQI Alert Digest',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Automated environmental alerts:',
    '',
    ...alerts.slice(0, 25).map((alert) => `- ${alert.city}: ${alert.message}`),
    '',
    `Generated at ${new Date().toISOString()}`,
  ];

  const result = spawnSync(
    'curl',
    [
      '--silent',
      '--show-error',
      '--url',
      'smtps://smtp.gmail.com:465',
      '--ssl-reqd',
      '--mail-from',
      config.emailUser,
      '--mail-rcpt',
      config.alertRecipient,
      '--upload-file',
      '-',
      '--user',
      `${config.emailUser}:${config.emailPass}`,
    ],
    {
      input: messageLines.join('\n'),
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    console.error('Email alert delivery failed:', result.stderr || result.stdout);
  }
}

async function sendSmsAlerts(alerts, config) {
  if (
    !alerts.length ||
    !config.twilioAccountSid ||
    !config.twilioAuthToken ||
    !config.twilioPhoneNumber ||
    !config.smsRecipient
  ) {
    return;
  }

  const body = alerts
    .slice(0, 3)
    .map((alert) => `${alert.city}: ${alert.rule} (AQI ${alert.aqi})`)
    .join(' | ');

  const payload = new URLSearchParams({
    To: config.smsRecipient,
    From: config.twilioPhoneNumber,
    Body: `AQI Alert Digest: ${body}`,
  });

  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
      payload.toString(),
      {
        auth: {
          username: config.twilioAccountSid,
          password: config.twilioAuthToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );
  } catch (error) {
    console.error('SMS alert delivery failed:', error.response?.data || error.message);
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

async function runLivePipeline() {
  const config = loadConfig();
  ensureDirectories();

  if (!config.waqiApiKey || !config.weatherApiKey) {
    throw new Error('Missing WAQI_API_KEY or OPENWEATHER_API_KEY in .env.local or environment variables.');
  }

  const latestCities = await mapWithConcurrency(config.cityList, config.liveConcurrency, async (city) => {
    const [weatherPayload, aqiPayload] = await Promise.all([
      fetchWeather(city, config.weatherApiKey),
      fetchAqi(city, config.waqiApiKey),
    ]);

    return normalizeSnapshot(city, weatherPayload, aqiPayload);
  });

  const previousHistoryPayload = readJson(path.join(publicDataDir, 'environment-history.json'), { records: [] });
  const fullHistory = dedupeLatestHistory([...latestCities, ...previousHistoryPayload.records], config.cityList.length * 24);
  const alerts = buildAlerts(latestCities, previousHistoryPayload.records, config.thresholds);

  writeOutputs(latestCities, fullHistory, alerts);
  logAlerts(alerts);

  if (config.alertMode === 'email') {
    sendEmailAlerts(alerts, config);
  } else if (config.alertMode === 'sms') {
    await sendSmsAlerts(alerts, config);
  } else if (config.alertMode === 'all') {
    sendConsoleAlerts(alerts);
    sendEmailAlerts(alerts, config);
    await sendSmsAlerts(alerts, config);
  } else {
    sendConsoleAlerts(alerts);
  }

  console.log(`Pipeline completed for ${latestCities.length} cities at ${new Date().toISOString()}.`);
}

function buildDemoSnapshot(meta, offset, cityIndex) {
  const seed = profileSeeds[meta.profile] || profileSeeds['temperate-urban'];
  const aqiNoise = Math.sin((offset + cityIndex) / 2.1) * 11 + Math.cos(cityIndex / 4) * 7;
  const tempNoise = Math.cos(offset / 3 + cityIndex / 9) * 1.8;
  const humidityNoise = Math.sin(offset / 4 + cityIndex / 11) * 8;
  const windNoise = Math.cos(offset / 5 + cityIndex / 10) * 0.9;
  const pressureNoise = Math.sin(offset / 6 + cityIndex / 15) * 4;
  const recordTime = new Date(Date.now() - offset * 60 * 60 * 1000).toISOString();
  const aqi = Math.max(24, Math.round(seed.aqi + aqiNoise - offset * 0.8));

  return {
    id: `${slugify(meta.city)}-${offset}`,
    city: meta.city,
    country: meta.country,
    fetchedAt: recordTime,
    aqi,
    aqiCategory: categorizeAqi(aqi),
    dominantPollutant: seed.pollutants.pm25 >= seed.pollutants.o3 ? 'pm25' : 'o3',
    weather: {
      temperature: Number((seed.temperature + tempNoise).toFixed(1)),
      feelsLike: Number((seed.temperature + tempNoise + 1.3).toFixed(1)),
      humidity: Math.max(18, Math.round(seed.humidity + humidityNoise)),
      windSpeed: Number(Math.max(1.2, seed.windSpeed + windNoise).toFixed(1)),
      pressure: Math.round(seed.pressure + pressureNoise),
      condition: seed.condition,
      clouds: Math.max(10, Math.round(46 + Math.sin(offset / 2 + cityIndex / 7) * 28)),
    },
    geo: {
      lat: meta.lat,
      lon: meta.lon,
    },
    pollutants: Object.fromEntries(
      Object.entries(seed.pollutants).map(([pollutant, value]) => [
        pollutant,
        Math.max(1, Math.round(value + Math.sin(offset / 3 + cityIndex / 10) * (value * 0.12))),
      ])
    ),
  };
}

function generateDemoHistory(cities) {
  const metadataList = cities
    .map((city) => getCityMetadata(city))
    .filter(Boolean);

  const records = [];
  metadataList.forEach((meta, cityIndex) => {
    for (let offset = 23; offset >= 0; offset -= 1) {
      records.push(buildDemoSnapshot(meta, offset, cityIndex));
    }
  });

  return records.sort((left, right) => new Date(right.fetchedAt).getTime() - new Date(left.fetchedAt).getTime());
}

function runDemoPipeline() {
  const config = loadConfig();
  ensureDirectories();
  const records = generateDemoHistory(config.cityList);
  const latestMap = new Map();

  records.forEach((record) => {
    if (!latestMap.has(record.city)) {
      latestMap.set(record.city, record);
    }
  });

  const latestCities = Array.from(latestMap.values());
  const alerts = buildAlerts(latestCities, records.slice(latestCities.length), config.thresholds);
  writeOutputs(latestCities, records, alerts);
  logAlerts(alerts);
  sendConsoleAlerts(alerts.slice(0, 20));
  console.log(`Demo dataset generated for ${latestCities.length} cities.`);
}

function runScheduledPipeline() {
  const config = loadConfig();
  ensureDirectories();

  if (!cron.validate(config.schedule)) {
    throw new Error(`Invalid PIPELINE_CRON expression: ${config.schedule}`);
  }

  console.log(`Scheduler started with cron "${config.schedule}" for ${config.cityList.length} cities.`);

  const trigger = async () => {
    try {
      await runLivePipeline();
    } catch (error) {
      console.error(`Scheduled pipeline failed: ${error.message}`);
    }
  };

  trigger();
  cron.schedule(config.schedule, trigger);
}

const mode = process.argv[2] || 'live';

if (mode === 'demo') {
  runDemoPipeline();
} else if (mode === 'schedule') {
  runScheduledPipeline();
} else {
  runLivePipeline().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
