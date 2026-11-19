import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PanelLeftOpen, AlertTriangle, X } from 'lucide-react';
import { conversations, documents, generations } from '../services/api';
import { KIND } from '../components/plan/kindConfig';
import ConversationList from '../components/workspace/ConversationList';
import MessageList from '../components/workspace/MessageList';
import Composer from '../components/workspace/Composer';
import Review from './Review';
import DocReview from './DocReview';

const EDITORS = { deck: Review, doc: DocReview };
const panelDefaults = (gid) => ({ gid, selected: 0, scope: gid ? 'item' : null, addAfter: null, focus: null, command: null, expanded: false });

/**
 * The workspace: conversations about the documents (left), the chat (middle) and, when one is open, the deck or
 * training document made in it (right). Routes: /, /c/:conversationId, /c/:conversationId/g/:generationId.
 */
export default function Workspace() {
  const params = useParams();
  const cid = params.conversationId ? Number(params.conversationId) : null;
  const gid = params.generationId ? Number(params.generationId) : null;
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [docs, setDocs] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draftDocIds, setDraftDocIds] = useState(null); // documents chosen before the first message
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [sidebar, setSidebar] = useState(true);
  const [skill, setSkill] = useState(null);
  const [panelGen, setPanelGen] = useState(null);
  const [panel, setPanel] = useState(() => panelDefaults(gid));
  const [reloadKey, setReloadKey] = useState(0);
  const [shownCid, setShownCid] = useState(cid);
  const endRef = useRef(null);

  // Switching conversation (not the one just created by sending) starts from a clean slate.
  if (cid !== shownCid) {
    setShownCid(cid);
    if (!(conversation && conversation.id === cid)) {
      setConversation(null);
      setMessages([]);
      setPending(null);
      setError(null);
      setSkill(null);
    }
  }
  // Opening another deck/document resets what the panel had selected.
  if (panel.gid !== gid) setPanel(panelDefaults(gid));

  const loadList = useCallback(() => conversations.list().then((d) => setList(d.conversations)).catch(() => {}), []);
  const loadDocs = useCallback(() => documents.list().then((d) => setDocs(d.docs || [])).catch(() => {}), []);
  useEffect(() => { loadList(); loadDocs(); }, [loadList, loadDocs]);

  useEffect(() => {
    if (!cid || conversation?.id === cid) return undefined;
    let live = true;
    conversations.get(cid)
      .then((d) => { if (live) { setConversation(d.conversation); setMessages(d.messages); } })
      .catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [cid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gid) return undefined;
    let live = true;
    generations.get(gid)
      .then(({ generation }) => { if (live) setPanelGen({ id: generation.id, type: generation.type }); })
      .catch(() => { if (live) setPanelGen(null); });
    return () => { live = false; };
  }, [gid, reloadKey]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, pending]);

  // The conversation's documents; before the first message, every ready document unless the user chose.
  const readyIds = docs.filter((d) => d.status === 'ready').map((d) => d.id);
  const docIds = conversation ? conversation.doc_ids : (draftDocIds ?? readyIds);
  const docIdsRef = useRef(docIds);
  useEffect(() => { docIdsRef.current = docIds; });

  function setDocIds(ids) {
    if (!conversation) { setDraftDocIds(ids); return; }
    setConversation((c) => ({ ...c, doc_ids: ids }));
    conversations.update(conversation.id, { docIds: ids }).catch((err) => setError(err.message));
  }

  function docsChanged(newDocId) {
    loadDocs();
    if (newDocId && !docIdsRef.current.includes(newDocId)) setDocIds([...docIdsRef.current, newDocId]);
  }

  const kind = panelGen && KIND[panelGen.type];
  const editing = gid && panelGen && panelGen.id === gid && panel.scope && !skill ? {
    type: panelGen.type, noun: kind.noun, product: kind.product,
    scope: panel.scope, index: panel.selected, after: panel.addAfter,
  } : null;

  /**
   * Sends a message: a skill request, a change to the open deck/document, or a question. `forced` sends a change
   * to one item regardless of the box's mode (the editor's Shorter/Simpler buttons).
   */
  async function send(text, forced) {
    setError(null);
    const mode = forced ? 'edit' : skill ? 'skill' : editing ? 'edit' : 'ask';
    const scope = forced ? 'item' : editing?.scope;
    setPending({ content: text, phase: mode === 'skill' ? (skill === 'image' ? 'imaging' : 'skill') : mode === 'ask' ? 'rewriting' : scope === 'add' ? 'writing' : scope === 'all' ? 'planning' : 'editing' });
    try {
      let conv = conversation;
      if (!conv) {
        conv = (await conversations.create({ docIds })).conversation;
        setConversation(conv);
        setMessages([]);
        navigate(`/c/${conv.id}`);
      }
      let added;
      if (mode === 'skill') {
        added = (await conversations.skill(conv.id, skill, text)).messages;
        setSkill(null);
      } else {
        const target = mode === 'edit' ? {
          generationId: gid,
          ...(scope === 'item' ? { index: forced ? forced.index : panel.selected } : scope === 'add' ? { after: panel.addAfter } : {}),
        } : undefined;
        const done = await conversations.send(conv.id, text, target, (evt) => {
          if (evt.phase !== 'done') setPending((p) => p && { ...p, phase: evt.phase });
        });
        added = done?.messages || [];
        if (mode === 'edit') {
          setReloadKey((k) => k + 1);
          const reply = added[1];
          setPanel((p) => ({
            ...p,
            ...(scope === 'add' ? { scope: 'item', addAfter: null } : {}),
            ...(reply?.kind === 'edit' && reply.data?.index != null ? { focus: { index: reply.data.index } } : {}),
          }));
        }
      }
      setMessages((m) => [...m, ...added]);
    } catch (err) {
      setError(err.message);
    }
    setPending(null);
    loadList();
  }

  async function deleteConversation(id) {
    try {
      await conversations.delete(id);
      if (id === cid) navigate('/');
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  const Editor = panelGen && panelGen.id === gid ? EDITORS[panelGen.type] : null;
  // While a deck/document is open, figures under answers and images made in the chat can go onto its selected
  // slide/section (the editor adds them, so it is one undo step).
  const addLabel = Editor ? `Add to ${kind.noun} ${panel.selected + 1}` : null;
  const addPicture = Editor ? (source) => setPanel((p) => ({ ...p, command: { picture: source, at: Date.now() } })) : null;
  const chatHidden = gid && panel.expanded;

  return (
    <div className="h-full flex overflow-hidden bg-canvas">
      {sidebar && !chatHidden && (
        <div className={gid ? 'hidden 2xl:flex' : 'hidden md:flex'}>
          <ConversationList items={list} activeId={cid} onNew={() => navigate('/')} onDelete={deleteConversation} onCollapse={() => setSidebar(false)} />
        </div>
      )}

      {!chatHidden && (
        <section className={`min-w-0 flex-col ${gid ? 'hidden xl:flex w-[440px] shrink-0 border-r border-border' : 'flex flex-1'}`}>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-[780px] mx-auto px-5 py-6">
              {!sidebar && (
                <button type="button" onClick={() => setSidebar(true)} className="btn-ghost text-[13px] mb-3">
                  <PanelLeftOpen size={15} />Conversations
                </button>
              )}
              {!cid && !messages.length && !pending ? (
                <div className="pt-[12vh] text-center flex flex-col gap-2">
                  <h1 className="font-heading text-[28px] font-bold text-navy m-0">What are we working on?</h1>
                  <p className="text-[15px] text-slate m-0">
                    Ask about your documents, then turn what you find into a slide deck or a training document.
                  </p>
                </div>
              ) : (
                <MessageList conversationId={conversation?.id} messages={messages} pending={pending}
                  openGenerationId={gid}
                  addLabel={addLabel} onAddPicture={addPicture}
                  onOpenGeneration={(id) => navigate(`/c/${conversation.id}/g/${id}`)}
                  onShowItem={(id, index) => {
                    if (id !== gid) navigate(`/c/${conversation.id}/g/${id}`);
                    setPanel((p) => ({ ...p, focus: { index } }));
                  }}
                  onMessageUpdated={(msg) => setMessages((ms) => ms.map((m) => (m.id === msg.id ? msg : m)))}
                  onDeckChanged={() => setReloadKey((k) => k + 1)} />
              )}
              <div ref={endRef} />
            </div>
          </div>
          <div className="shrink-0 border-t border-border bg-canvas px-5 py-3">
            <div className="max-w-[780px] mx-auto flex flex-col gap-2">
              {error && (
                <p className="m-0 text-[13px] text-red-700 flex items-center gap-1.5">
                  <AlertTriangle size={14} />{error}
                  <button type="button" onClick={() => setError(null)} className="ml-auto p-0.5 bg-transparent border-0 text-red-700 cursor-pointer" aria-label="Dismiss"><X size={13} /></button>
                </p>
              )}
              <Composer
                docs={docs} docIds={docIds} onDocIdsChange={setDocIds} onDocsChanged={docsChanged}
                skill={skill} onSkill={setSkill}
                edit={editing}
                onEditScope={(scope) => setPanel((p) => ({ ...p, scope }))}
                onStopEditing={() => setPanel((p) => ({ ...p, scope: null, addAfter: null }))}
                disabled={Boolean(pending)}
                onSend={(text) => send(text)} />
            </div>
          </div>
        </section>
      )}

      {gid && (
        <section className="flex-1 min-w-0 bg-white">
          {Editor ? (
            <Editor key={gid} id={gid} reloadKey={reloadKey} addAfter={panel.scope === 'add' ? panel.addAfter : null} focus={panel.focus} command={panel.command}
              onSelect={(i) => setPanel((p) => ({ ...p, selected: i, scope: p.scope === 'add' || !p.scope ? 'item' : p.scope, addAfter: null }))}
              onAddAfter={(i) => setPanel((p) => ({ ...p, scope: 'add', addAfter: i }))}
              onAsk={(instruction, _label, index) => { if (!pending) send(instruction, { index }); }}
              onClose={() => navigate(`/c/${cid}`)}
              expanded={panel.expanded}
              onToggleExpand={() => setPanel((p) => ({ ...p, expanded: !p.expanded }))} />
          ) : <p className="hint p-6">Loading…</p>}
        </section>
      )}
    </div>
  );
}
