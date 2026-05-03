export interface Transaction {
  id: string;
  date: string;
  customer: string;
  category: 'Electronics' | 'SaaS' | 'Furniture' | 'Consulting' | 'Hardware' | 'Infrastructure' | 'Analytics' | 'Fintech' | 'Research' | 'Cloud';
  region: 'Global' | 'EMEA' | 'APAC' | 'North America' | 'Latin America';
  amount: number;
  status: 'Completed' | 'Pending' | 'Refunded' | 'Failed';
}

export interface KPI {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  id: string;
  href: string;
}

export interface Insight {
  id: number;
  type: 'trend' | 'anomaly' | 'highlight';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export const REVENUE_DATA = [
  { name: 'Jan', revenue: 4000, profit: 2400 },
  { name: 'Feb', revenue: 3000, profit: 1398 },
  { name: 'Mar', revenue: 2000, profit: 9800 },
  { name: 'Apr', revenue: 2780, profit: 3908 },
  { name: 'May', revenue: 1890, profit: 4800 },
  { name: 'Jun', revenue: 2390, profit: 3800 },
  { name: 'Jul', revenue: 3490, profit: 4300 },
];

export const CATEGORY_DATA = [
  { name: 'Electronics', value: 400 },
  { name: 'Clothing', value: 300 },
  { name: 'Home & Garden', value: 300 },
  { name: 'Sports', value: 200 },
];

export const REGION_DATA = [
  { name: 'North America', value: 45 },
  { name: 'Europe', value: 30 },
  { name: 'Asia Pacific', value: 15 },
  { name: 'Latin America', value: 10 },
];

export const INSIGHTS: Insight[] = [
  { id: 1, type: 'trend', title: 'Revenue Growth', description: 'Monthly revenue increased by 12.5% compared to previous month.', priority: 'high' },
  { id: 2, type: 'anomaly', title: 'High Discount Alert', description: 'Profit dropped in West region due to aggressive discounting (avg 45%).', priority: 'critical' },
  { id: 3, type: 'highlight', title: 'New Market Entry', description: 'Asia Pacific region showing 3x growth in hardware sales.', priority: 'medium' },
];

export const TRANSACTIONS: Transaction[] = [
  { id: 'TX-1001', date: '2024-01-05', customer: 'Global Corp', category: 'SaaS', region: 'Global', amount: 12500.00, status: 'Completed' },
  { id: 'TX-1002', date: '2024-01-12', customer: 'Acme Inc', category: 'Electronics', region: 'North America', amount: 4200.50, status: 'Pending' },
  { id: 'TX-1003', date: '2024-01-18', customer: 'Nexus Soft', category: 'Consulting', region: 'EMEA', amount: 8900.00, status: 'Completed' },
  { id: 'TX-1004', date: '2024-01-25', customer: 'Vertex Ltd', category: 'Furniture', region: 'APAC', amount: 1540.20, status: 'Refunded' },
  { id: 'TX-1005', date: '2024-02-02', customer: 'CloudScale', category: 'Infrastructure', region: 'Global', amount: 22000.00, status: 'Completed' },
  { id: 'TX-1006', date: '2024-02-08', customer: 'DataFlow', category: 'Analytics', region: 'APAC', amount: 6700.00, status: 'Completed' },
  { id: 'TX-1007', date: '2024-02-14', customer: 'SwiftPay', category: 'Fintech', region: 'EMEA', amount: 1200.00, status: 'Failed' },
  { id: 'TX-1008', date: '2024-02-21', customer: 'BioTech', category: 'Research', region: 'Global', amount: 9500.00, status: 'Completed' },
  { id: 'TX-1009', date: '2024-03-01', customer: 'Urban Styles', category: 'Furniture', region: 'North America', amount: 3200.00, status: 'Completed' },
  { id: 'TX-1010', date: '2024-03-05', customer: 'Tech Haven', category: 'Hardware', region: 'APAC', amount: 840.00, status: 'Pending' },
  { id: 'TX-1011', date: '2024-03-12', customer: 'Lumina SaaS', category: 'SaaS', region: 'EMEA', amount: 15000.00, status: 'Completed' },
  { id: 'TX-1012', date: '2024-03-18', customer: 'Eco Solutions', category: 'Consulting', region: 'Global', amount: 4500.00, status: 'Completed' },
  { id: 'TX-1013', date: '2024-03-24', customer: 'Aero Dynamics', category: 'Infrastructure', region: 'North America', amount: 35000.00, status: 'Completed' },
  { id: 'TX-1014', date: '2024-04-02', customer: 'Future Edge', category: 'Analytics', region: 'APAC', amount: 2100.00, status: 'Completed' },
  { id: 'TX-1015', date: '2024-04-10', customer: 'Blue Wave', category: 'Fintech', region: 'EMEA', amount: 890.00, status: 'Failed' },
  { id: 'TX-1016', date: '2024-04-15', customer: 'Solar Systems', category: 'Cloud', region: 'Global', amount: 18000.00, status: 'Completed' },
  { id: 'TX-1017', date: '2024-04-20', customer: 'Market Mind', category: 'SaaS', region: 'North America', amount: 5600.00, status: 'Completed' },
  { id: 'TX-1018', date: '2024-04-25', customer: 'Silver Oak', category: 'Furniture', region: 'EMEA', amount: 7200.00, status: 'Pending' },
  { id: 'TX-1019', date: '2024-05-02', customer: 'Nova Labs', category: 'Research', region: 'APAC', amount: 11000.00, status: 'Completed' },
  { id: 'TX-1020', date: '2024-05-08', customer: 'Core Logic', category: 'Hardware', region: 'Global', amount: 2400.00, status: 'Completed' },
  { id: 'TX-1021', date: '2024-05-15', customer: 'Peak Pharma', category: 'Research', region: 'EMEA', amount: 13500.00, status: 'Completed' },
  { id: 'TX-1022', date: '2024-05-22', customer: 'Prime Goods', category: 'Electronics', region: 'North America', amount: 450.00, status: 'Completed' },
  { id: 'TX-1023', date: '2024-05-28', customer: 'Alpha Build', category: 'Infrastructure', region: 'APAC', amount: 48000.00, status: 'Completed' },
  { id: 'TX-1024', date: '2024-06-03', customer: 'Stark Ind', category: 'SaaS', region: 'Global', amount: 25000.00, status: 'Completed' },
  { id: 'TX-1025', date: '2024-06-10', customer: 'Cyber Dyne', category: 'Hardware', region: 'North America', amount: 670.00, status: 'Pending' },
  { id: 'TX-1026', date: '2024-06-15', customer: 'Wayne Ent', category: 'Consulting', region: 'EMEA', amount: 4100.00, status: 'Completed' },
  { id: 'TX-1027', date: '2024-06-20', customer: 'Oscorp', category: 'Research', region: 'APAC', amount: 15600.00, status: 'Completed' },
  { id: 'TX-1028', date: '2024-06-25', customer: 'Initech', category: 'Cloud', region: 'North America', amount: 3200.00, status: 'Refunded' },
  { id: 'TX-1029', date: '2024-07-01', customer: 'Dunder M', category: 'Furniture', region: 'EMEA', amount: 120.00, status: 'Completed' },
  { id: 'TX-1030', date: '2024-07-05', customer: 'Gringotts', category: 'Fintech', region: 'Global', amount: 94000.00, status: 'Completed' },
  { id: 'TX-1031', date: '2024-07-12', customer: 'Pied Piper', category: 'SaaS', region: 'North America', amount: 12000.00, status: 'Pending' },
  { id: 'TX-1032', date: '2024-07-18', customer: 'Hooli', category: 'Hardware', region: 'APAC', amount: 3400.00, status: 'Completed' },
  { id: 'TX-1033', date: '2024-07-24', customer: 'E-Corp', category: 'Cloud', region: 'EMEA', amount: 56000.00, status: 'Completed' },
  { id: 'TX-1034', date: '2024-08-01', customer: 'Sterling C', category: 'Consulting', region: 'Global', amount: 890.00, status: 'Completed' },
  { id: 'TX-1035', date: '2024-08-08', customer: 'Globex', category: 'Infrastructure', region: 'North America', amount: 12400.00, status: 'Completed' },
  { id: 'TX-1036', date: '2024-08-15', customer: 'Massive D', category: 'Analytics', region: 'APAC', amount: 2100.00, status: 'Completed' },
  { id: 'TX-1037', date: '2024-08-22', customer: 'Umbrella', category: 'Research', region: 'EMEA', amount: 6500.00, status: 'Failed' },
  { id: 'TX-1038', date: '2024-08-28', customer: 'Aperture', category: 'Electronics', region: 'Global', amount: 340.00, status: 'Completed' },
  { id: 'TX-1039', date: '2024-09-03', customer: 'Black Mesa', category: 'Research', region: 'North America', amount: 17800.00, status: 'Completed' },
  { id: 'TX-1040', date: '2024-09-10', customer: 'Tyrell Corp', category: 'Hardware', region: 'APAC', amount: 45000.00, status: 'Completed' },
  { id: 'TX-1041', date: '2024-09-15', customer: 'Soylent', category: 'Consulting', region: 'EMEA', amount: 1200.00, status: 'Pending' },
  { id: 'TX-1042', date: '2024-09-20', customer: 'Encom', category: 'SaaS', region: 'Global', amount: 8900.00, status: 'Completed' },
  { id: 'TX-1043', date: '2024-09-25', customer: 'Zoolander', category: 'Electronics', region: 'North America', amount: 50.00, status: 'Completed' },
  { id: 'TX-1044', date: '2024-10-02', customer: 'Veridian', category: 'Consulting', region: 'APAC', amount: 6700.00, status: 'Completed' },
  { id: 'TX-1045', date: '2024-10-10', customer: 'Mom Corp', category: 'Hardware', region: 'EMEA', amount: 1500.00, status: 'Completed' },
  { id: 'TX-1046', date: '2024-10-15', customer: 'Wernham H', category: 'Infrastructure', region: 'Global', amount: 420.00, status: 'Failed' },
  { id: 'TX-1047', date: '2024-10-20', customer: 'Bluth Co', category: 'Furniture', region: 'North America', amount: 23000.00, status: 'Completed' },
  { id: 'TX-1048', date: '2024-10-25', customer: 'Vandelay', category: 'SaaS', region: 'EMEA', amount: 1100.00, status: 'Completed' },
  { id: 'TX-1049', date: '2024-11-02', customer: 'Oceanic', category: 'Infrastructure', region: 'APAC', amount: 78000.00, status: 'Completed' },
  { id: 'TX-1050', date: '2024-11-08', customer: 'Weyland', category: 'Cloud', region: 'Global', amount: 4300.00, status: 'Completed' },
  { id: 'TX-1051', date: '2024-11-15', customer: 'Cyberdyne', category: 'Hardware', region: 'North America', amount: 950.00, status: 'Pending' },
  { id: 'TX-1052', date: '2024-11-22', customer: 'Nakatomi', category: 'Consulting', region: 'EMEA', amount: 15600.00, status: 'Completed' },
  { id: 'TX-1053', date: '2024-11-28', customer: 'Los Pollos', category: 'Furniture', region: 'Global', amount: 3400.00, status: 'Completed' },
];
