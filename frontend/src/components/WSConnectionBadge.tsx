import { useWsStore } from '../store/wsStore';

export default function WSConnectionBadge() {
  const isConnected = useWsStore((s) => s.isConnected);
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium select-none border ${
        isConnected
          ? 'bg-green-500/10 border-green-500/30 text-green-300'
          : 'bg-red-500/10 border-red-500/30 text-red-300'
      }`}
      title={isConnected ? 'WebSocket conectado' : 'Reconectando...'}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isConnected ? 'bg-green-400 shadow-[0_0_4px_#4ade80]' : 'bg-red-400 animate-pulse'
        }`}
      />
      <span>{isConnected ? 'En vivo' : 'Sin conexión'}</span>
    </div>
  );
}
