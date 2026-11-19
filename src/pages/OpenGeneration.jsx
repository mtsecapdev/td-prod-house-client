import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { conversations, generations } from '../services/api';

/**
 * /g/:id (and old /create/deck|doc/:id/... links): opens a deck/document in the conversation it was made in.
 * One made before conversations existed gets its own conversation first, so it can be changed by chatting.
 */
export default function OpenGeneration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const { generation } = await generations.get(id);
      const cid = generation.conversation_id ?? (await conversations.create({ generationId: generation.id })).conversation.id;
      if (live) navigate(`/c/${cid}/g/${generation.id}`, { replace: true });
    })().catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [id, navigate]);

  return <main className="max-w-[780px] mx-auto py-10 px-5"><p className={error ? 'text-red-700' : 'hint'}>{error || 'Opening…'}</p></main>;
}
