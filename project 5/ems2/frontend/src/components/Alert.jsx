export default function Alert({ message, type = 'error', onClose }) {
  if (!message) return null;

  const styles =
    type === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-green-50 text-green-700 border-green-200';

  return (
    <div className={`border rounded-lg px-4 py-2.5 mb-4 text-sm flex justify-between items-center ${styles}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">✕</button>
      )}
    </div>
  );
}
