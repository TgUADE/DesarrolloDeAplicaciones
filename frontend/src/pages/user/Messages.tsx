import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/user.api';

export default function Messages() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['messages', user?.id],
    queryFn: () => userApi.getMessages(user!.id),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const readMutation = useMutation({
    mutationFn: (msgId: string) => userApi.markMessageRead(user!.id, msgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', user?.id] }),
  });

  const messages = data?.data?.data?.messages ?? [];
  const unread = messages.filter((m: any) => !m.leido).length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h1>Mensajes {unread > 0 && <span style={{ background: 'red', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: 14 }}>{unread}</span>}</h1>
      {messages.length === 0 && <p>No tenés mensajes.</p>}
      {messages.map((msg: any) => (
        <div key={msg.id} style={{
          border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12,
          background: msg.leido ? '#fff' : '#f0f7ff',
          opacity: msg.leido ? 0.8 : 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: 0 }}>{msg.asunto}</h3>
              <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{msg.cuerpo}</p>
              <small style={{ color: '#999' }}>{new Date(msg.createdAt).toLocaleString('es-AR')}</small>
            </div>
            {!msg.leido && (
              <button onClick={() => readMutation.mutate(msg.id)} style={{ padding: '4px 12px', fontSize: 12 }}>
                Marcar leído
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
