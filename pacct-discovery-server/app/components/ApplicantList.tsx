import { StatusBadge } from './StatusBadge';

interface Applicant {
  node_id: string;
  status: string;
  applied_at: number;
}

export function ApplicantList({ applicants }: { applicants: Applicant[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>
        Applicants
        <span className="ml-2 text-sm font-normal" style={{ color: 'var(--pacct-text-muted)' }}>({applicants.length})</span>
      </h3>
      {applicants.length === 0 ? (
        <p className="text-sm italic" style={{ color: 'var(--pacct-text-muted)' }}>No applicants</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-ds">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a, i) => (
                <tr key={a.node_id} className={i % 2 === 1 ? 'bg-[var(--pacct-bg-raised)]/30' : ''}>
                  <td>
                    <code className="text-xs font-mono" style={{ color: 'var(--pacct-text-secondary)' }}>{a.node_id}</code>
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>{new Date(a.applied_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
