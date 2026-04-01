import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Student } from '../services/api';
import { useSearch } from '../context/SearchContext';
import './StudentTable.css';

interface StudentTableProps {
  students: Student[];
  reportId: string;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarClass(tier: string): string {
  if (tier === 'Critical') return 'avatar--critical';
  if (tier === 'At-Risk') return 'avatar--at-risk';
  return 'avatar--stable';
}

function getRiskScoreClass(tier: string): string {
  if (tier === 'Critical') return 'risk-score--critical';
  if (tier === 'At-Risk') return 'risk-score--at-risk';
  return 'risk-score--stable';
}

function getPrimaryFactor(student: Student): { icon: string; label: string } {
  if (!student.top_factors || student.top_factors.length === 0) {
    return { icon: 'help', label: 'Unknown' };
  }
  const factor = student.top_factors[0];
  const iconMap: Record<string, string> = {
    attendance_pct: 'event_busy',
    tuition_encoded: 'payments',
    first_assignment_delay_hours: 'assignment_late',
    avg_grade: 'grade',
    lms_logins_per_week: 'computer',
    forum_messages_posted: 'forum',
    library_logins_per_week: 'local_library',
    counselor_visits: 'psychology',
    late_submissions: 'schedule',
    first_semester_credits_approved: 'description',
  };
  return {
    icon: iconMap[factor.feature] || 'info',
    label: factor.display_name,
  };
}

export default function StudentTable({ students, reportId }: StudentTableProps) {
  const navigate = useNavigate();
  const { searchTerm } = useSearch();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter students based on search term
  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.student_id.toLowerCase().includes(term);
  });

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const atRiskCount = filteredStudents.filter(s => s.risk_tier !== 'Stable').length;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <motion.section
      className="card student-table-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      id="student-table-section"
    >
      <div className="student-table__header">
        <div>
          <h2>Top At-Risk Students</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Immediate intervention recommended for the following profiles.
          </p>
        </div>
        <button className="btn btn-secondary" id="export-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
          Export List
        </button>
      </div>

      <div className="student-table__scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student Details</th>
              <th>Risk Score</th>
              <th>Primary Factor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.map((student, idx) => {
              const primaryFactor = getPrimaryFactor(student);
              return (
                <motion.tr
                  key={student.student_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
                  onClick={() => navigate(`/student/${student.student_id}?report_id=${reportId}`)}
                  id={`student-row-${student.student_id}`}
                >
                  <td>
                    <div className="student-cell">
                      <div className={`avatar ${getAvatarClass(student.risk_tier)}`}>
                        {getInitials(student.name)}
                      </div>
                      <div className="student-cell__info">
                        <span className="student-cell__name">{student.name}</span>
                        <span className="student-cell__id">#{student.student_id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="risk-cell">
                      <span className={`risk-score ${getRiskScoreClass(student.risk_tier)}`}
                            style={{ fontSize: '1.125rem' }}>
                        {Math.round(student.risk_score)}%
                      </span>
                      {student.risk_tier === 'Critical' && (
                        <span className="material-symbols-outlined icon-filled"
                              style={{ color: 'var(--error)', fontSize: 18 }}>
                          warning
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="factor-cell">
                      <div className="factor-cell__icon">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {primaryFactor.icon}
                        </span>
                      </div>
                      <span className="label-md">{primaryFactor.label}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-ghost" style={{ marginLeft: 'auto' }}>
                      <span className="material-symbols-outlined">search</span>
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="student-table__footer">
        <span className="label-xs">
          {filteredStudents.length === 0 ? 'No matching students' : (
            `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredStudents.length)} of ${filteredStudents.length} students (${atRiskCount} flagged At-Risk)`
          )}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </motion.section>
  );
}
