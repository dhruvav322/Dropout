/**
 * Centralized API client for DropoutRadar backend.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export interface ShapFactor {
  feature: string;
  display_name: string;
  shap_value: number;
  raw_value: number;
  direction: 'risk_increasing' | 'risk_decreasing';
}

export interface Intervention {
  type: string;
  icon: string;
  action: string;
}

export interface Student {
  student_id: string;
  name: string;
  department?: string;
  year?: string;
  first_semester_credits_approved: number;
  tuition_payment_status: string;
  first_assignment_delay_hours: number;
  forum_messages_posted: number;
  attendance_pct: number;
  lms_logins_per_week: number;
  library_logins_per_week: number;
  avg_grade: number;
  counselor_visits: number;
  late_submissions: number;
  risk_score: number;
  risk_tier: 'Critical' | 'At-Risk' | 'Stable';
  top_factors?: ShapFactor[];
  intervention?: Intervention;
}

export interface DashboardData {
  report_id: string;
  institution: string;
  total_students: number;
  critical_count: number;
  at_risk_count: number;
  stable_count: number;
  avg_risk_score: number;
  students: Student[];
}

export interface UploadResponse {
  report_id: string;
  message: string;
  total_students: number;
  critical_count: number;
  at_risk_count: number;
}

export interface CounselorNote {
  note: string;
  priority: string;
  intervention_type: string;
  generated_by: string;
}

// ---- API Methods ----

export async function getDashboard(reportId?: string): Promise<DashboardData> {
  const url = reportId ? `/dashboard/${reportId}` : '/dashboard';
  return request<DashboardData>(url);
}

export async function getStudent(studentId: string, reportId?: string): Promise<{ student: Student; institution: string; report_id: string }> {
  const params = reportId ? `?report_id=${reportId}` : '';
  return request(`/student/${studentId}${params}`);
}

export async function uploadCSV(file: File, institution: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('institution', institution);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function generateNote(data: {
  student_name: string;
  risk_score: number;
  risk_tier: string;
  top_factors: ShapFactor[];
  intervention_type: string;
  department?: string;
  year?: string;
}): Promise<CounselorNote> {
  return request<CounselorNote>('/generate-note', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---- Admin API (requires API key) ----

function getAdminKey(): string {
  return sessionStorage.getItem('admin_api_key') || '';
}

export function setAdminKey(key: string) {
  sessionStorage.setItem('admin_api_key', key);
}

export function clearAdminKey() {
  sessionStorage.removeItem('admin_api_key');
}

async function adminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const key = getAdminKey();
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': key,
    },
    ...options,
  });
  if (response.status === 403) {
    clearAdminKey();
    throw new Error('AUTH_FAILED');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export interface SystemHealth {
  status: string;
  version: string;
  uptime: string;
  boot_time: string;
  system: {
    python_version: string;
    memory_usage_mb: number;
    cpu_percent: number;
    pid: number;
  };
  model: {
    loaded: boolean;
    file_size_kb: number;
    features: string[];
    algorithm: string;
  };
  data: {
    training_dataset_exists: boolean;
    reports_in_memory: number;
    total_students_loaded: number;
  };
  security: Record<string, boolean>;
}

export interface AuditEvent {
  id: number;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  ip_address: string;
  request_id: string;
  severity: string;
}

export interface AuditLogResponse {
  events: AuditEvent[];
  total: number;
  total_since_boot: number;
}

export interface ModelStats {
  algorithm: string;
  n_estimators: number;
  max_depth: number;
  learning_rate: number;
  feature_importance: { feature: string; importance: number }[];
}

export async function getAdminHealth(): Promise<SystemHealth> {
  return adminRequest<SystemHealth>('/admin/health');
}

export async function getAuditLog(limit = 50, offset = 0): Promise<AuditLogResponse> {
  return adminRequest<AuditLogResponse>(`/admin/audit-log?limit=${limit}&offset=${offset}`);
}

export async function getAuditSummary(): Promise<Record<string, unknown>> {
  return adminRequest('/admin/audit-summary');
}

export async function getModelStats(): Promise<ModelStats> {
  return adminRequest<ModelStats>('/admin/model-stats');
}

export async function retrainModel(): Promise<{ status: string; message: string }> {
  return adminRequest('/admin/retrain', { method: 'POST' });
}

export async function deleteReport(reportId: string): Promise<{ status: string }> {
  return adminRequest(`/admin/reports/${reportId}`, { method: 'DELETE' });
}
