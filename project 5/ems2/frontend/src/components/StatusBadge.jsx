const styleMap = {
  upcoming: 'bg-green-100 text-green-700',
  ongoing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  booked: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed_booking: 'bg-slate-200 text-slate-600',
  draft: 'bg-slate-200 text-slate-600',
  published: 'bg-green-100 text-green-700',
};

export default function StatusBadge({ status }) {
  const cls = styleMap[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full capitalize ${cls}`}>
      {status}
    </span>
  );
}
