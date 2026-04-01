import { useState, useEffect } from 'react';
import { getDashboard, getStudent, type DashboardData, type Student } from '../services/api';

export function useDashboard(reportId?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDashboard(reportId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  return { data, loading, error, refetch: () => getDashboard(reportId).then(setData) };
}

export function useStudent(studentId: string, reportId?: string) {
  const [student, setStudent] = useState<Student | null>(null);
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStudent(studentId, reportId)
      .then((res) => {
        setStudent(res.student);
        setInstitution(res.institution);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studentId, reportId]);

  return { student, institution, loading, error };
}
