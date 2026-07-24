// src/lib/export.ts
// CSV and data export utilities

/**
 * Convert array of objects to CSV string
 */
export function toCsv<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) return '';
  const first = data[0]!;
  const headers = Object.keys(first);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        const str = String(val ?? '');
        // Escape quotes and wrap in quotes if contains comma/newline
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate user report CSV
 */
export function generateUserReport(users: Array<{
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date | string;
  storageGB?: number;
  fileCount?: number;
}>): string {
  const rows = users.map((u) => ({
    ID: u.id,
    Name: u.name ?? 'Unknown',
    Email: u.email,
    Role: u.role,
    'Created At': new Date(u.createdAt).toISOString().split('T')[0],
    'Storage (GB)': u.storageGB ?? 0,
    'Files': u.fileCount ?? 0,
  }));
  return toCsv(rows);
}

/**
 * Generate file inventory report
 */
export function generateFileReport(files: Array<{
  uniqueId: number;
  name: string | null;
  basename: string | null;
  mimetype: string | null;
  filesize: string | null;
  folderId: number;
  createdAt: Date | string;
}>): string {
  const rows = files.map((f) => ({
    ID: f.uniqueId,
    Name: f.name ?? f.basename ?? 'Unknown',
    Type: f.mimetype ?? 'Unknown',
    'Size (bytes)': f.filesize ?? '0',
    'Folder ID': f.folderId,
    'Created At': new Date(f.createdAt).toISOString().split('T')[0],
  }));
  return toCsv(rows);
}

/**
 * Generate share links report
 */
export function generateShareReport(shares: Array<{
  id: number;
  type: string;
  permission: string | null;
  protected: boolean;
  createdAt: Date | string;
  itemCount?: number;
}>): string {
  const rows = shares.map((s) => ({
    ID: s.id,
    Type: s.type,
    Permission: s.permission ?? 'visitor',
    Protected: s.protected ? 'Yes' : 'No',
    'Created At': new Date(s.createdAt).toISOString().split('T')[0],
  }));
  return toCsv(rows);
}

/**
 * Generate traffic report
 */
export function generateTrafficReport(traffic: Array<{
  userId: number;
  upload: number;
  download: number;
  date: string;
}>): string {
  const rows = traffic.map((t) => ({
    'User ID': t.userId,
    Date: t.date,
    'Upload (bytes)': t.upload,
    'Download (bytes)': t.download,
    'Total (bytes)': t.upload + t.download,
  }));
  return toCsv(rows);
}
