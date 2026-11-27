import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { PanelRightOpen, AlertTriangle, X, Upload, Loader2, Layers } from 'lucide-react';
import { conversations, documents, generations } from '../services/api';
import { KIND } from '../components/plan/kindConfig';
import RecentWork from '../components/workspace/RecentWork';
import MessageList from '../components/workspace/MessageList';
import Composer from '../components/workspace/Composer';
import { useMediaQuery } from '../components/workspace/useMediaQuery';
import { useUpload } from '../contexts/upload';
import Review from './Review';
import DocReview from './DocReview';

const EDITORS = { deck: Review, doc: DocReview };
const panelDefaults = (gid) => ({ gid, selected: 0, scope: gid ? 'item' : null, addAfter: null, focus: null, command: null, expanded: false, view: 'panel' });
const ACCEPTED = /\.(pdf|docx|pptx|md|txt)$/i;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * The workspace: the chat and, when one is open, the deck or training document made in it beside it (the app's
 * sidebar lists the conversations). Routes: /, /c/:conversationId, /c/:conversationId/g/:generationId.
 * A new chat starts from a centred message box with recent work below it.
 */
export default function Workspace() {
  const params = useParams();
  const cid = params.conversationId ? Number(params.conversationId) : null;
  const gid = params.generationId ? Number(params.generationId) : null;
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draftDocIds, setDraftDocIds] = useState(null); // documents chosen before the first message
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  // Chat and deck side by side need room (the sidebar shrinks to its rail while a deck is open).
  const wide = useMediaQuery('(min-width: 1360px)');
  const { reloadConversations, setCompactSidebar } = useOutletContext();
  const { uploading, uploadMsg, uploadProgress, uploadFileName, startUpload } = useUpload();
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

  const loadDocs = useCallback(() => documents.list().then((d) => setDocs(d.docs || [])).catch(() => {}), []);
  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => {
    setCompactSidebar(Boolean(gid));
    return () => setCompactSidebar(false);
  }, [gid, setCompactSidebar]);

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
   * to one item regardless of the box's mode (the editor's Shorter/Simpler buttons); `skillOverride` sends it as
   * that skill (a typed "/deck …" command).
   */
  async function send(text, forced, skillOverride, picked) {
    setError(null);
    const skill_ = skillOverride || skill;
    // While the planning interview asks a question, a message is its answer.
    const answering = !forced && !skill_ && interviewQuestion;
    const mode = forced ? 'edit' : skill_ ? 'skill' : answering ? 'ask' : editing ? 'edit' : 'ask';
    const scope = forced ? 'item' : editing?.scope;
    setPending({ content: text, phase: answering ? 'interview' : mode === 'skill' ? (skill_ === 'image' ? 'imaging' : 'starting') : mode === 'ask' ? 'rewriting' : scope === 'add' ? 'writing' : scope === 'all' ? 'planning' : 'editing' });
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
        added = (await conversations.skill(conv.id, skill_, text)).messages;
        setSkill(null);
      } else {
        const target = mode === 'edit' ? {
          generationId: gid,
          ...(scope === 'item' ? { index: forced ? forced.index : panel.selected } : scope === 'add' ? { after: panel.addAfter } : {}),
        } : undefined;
        const done = await conversations.send(conv.id, text, target, (evt) => {
          if (evt.phase !== 'done') setPending((p) => p && { ...p, phase: evt.phase });
        }, picked);
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
      setMessages((m) => [...closeInterviewIn(m), ...added]);
    } catch (err) {
      setError(err.message);
    }
    setPending(null);
    reloadConversations();
  }

  // The planning interview: its latest question or summary, while still open.
  const lastInterview = [...messages].reverse().find((m) => m.kind === 'interview' || m.kind === 'brief');
  const openInterview = lastInterview?.data?.interview?.active ? lastInterview : null;
  const interviewQuestion = openInterview?.kind === 'interview';
  // A reply replaces the open question or summary (the server closed it too).
  const closeInterviewIn = (list) => list.map((m) => (m.id === openInterview?.id
    ? { ...m, data: { ...m.data, interview: { ...m.data.interview, active: false } } } : m));

  /** Just make it, Change an answer, Cancel, or Make the plan. */
  async function interviewAction(action, slot) {
    if (!conversation) return;
    setError(null);
    setPending({ content: '', phase: action === 'plan' ? 'skill' : 'planning_interview' });
    try {
      const api = conversations.interview;
      const { messages: added } = action === 'change' ? await api.change(conversation.id, slot) : await api[action](conversation.id);
      setMessages((m) => [...closeInterviewIn(m), ...added]);
    } catch (err) {
      setError(err.message);
    }
    setPending(null);
    reloadConversations();
  }

  const Editor = panelGen && panelGen.id === gid ? EDITORS[panelGen.type] : null;
  // While a deck/document is open, figures under answers and images made in the chat can go onto its selected
  // slide/section (the editor adds them, so it is one undo step).
  const addLabel = Editor ? `Add to ${kind.noun} ${panel.selected + 1}` : null;
  const addPicture = Editor ? (source) => setPanel((p) => ({ ...p, command: { picture: source, at: Date.now() } })) : null;
  // Wide screens show the chat and the open deck side by side; narrower ones show one at a time.
  const showChat = !gid || (wide ? !panel.expanded : panel.view === 'chat');
  const showPanel = Boolean(gid) && (wide || panel.view === 'panel');

  const fresh = !cid && !messages.length && !pending;
  const composer = (variant) => (
    <div className="flex flex-col gap-2">
      {uploading && (
        <p className="m-0 text-[13px] text-slate flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin text-cobalt" />
          Adding {uploadFileName}: {uploadMsg || 'uploading'} ({uploadProgress}%)
        </p>
      )}
      {error && (
        <p className="m-0 text-[13px] text-red-700 flex items-center gap-1.5">
          <AlertTriangle size={14} />{error}
          <button type="button" onClick={() => setError(null)} className="ml-auto p-0.5 bg-transparent border-0 text-red-700 cursor-pointer" aria-label="Dismiss"><X size={13} /></button>
        </p>
      )}
      <Composer variant={variant}
        docs={docs} docIds={docIds} onDocIdsChange={setDocIds} onDocsChanged={docsChanged}
        skill={skill} onSkill={setSkill} onStartSkill={(type) => { setSkill(null); send('', null, type); }}
        edit={editing}
        onEditScope={(scope) => setPanel((p) => ({ ...p, scope }))}
        onStopEditing={() => setPanel((p) => ({ ...p, scope: null, addAfter: null }))}
        disabled={Boolean(pending)}
        answering={interviewQuestion}
        onSend={(text, skillOverride) => send(text, null, skillOverride)} />
    </div>
  );

  function backToChat() {
    setPanel((p) => (wide ? { ...p, expanded: !p.expanded } : { ...p, view: 'chat' }));
  }

  // Files dropped on the chat are uploaded one after another and join this conversation when ready.
  async function dropFiles(e) {
    e.preventDefault();
    setDragging(false);
    const files = [...(e.dataTransfer?.files || [])];
    const accepted = files.filter((f) => ACCEPTED.test(f.name));
    if (accepted.length < files.length) setError(`Only PDF, Word, PowerPoint, Markdown and text files can be added (${files.length - accepted.length} skipped).`);
    for (const file of accepted) {
      await new Promise((done) => startUpload(file, (docId) => { docsChanged(docId); done(); }, () => loadDocs()));
    }
  }

  return (
    <div className="h-full flex overflow-hidden bg-canvas">
      {showChat && (
        <section
          className={`relative min-w-0 flex flex-col ${gid && wide ? 'w-[440px] shrink-0 border-r border-border' : 'flex-1'}`}
          onDragOver={(e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={dropFiles}>
          {dragging && (
            <div className="absolute inset-2 z-30 rounded-xl border-2 border-dashed border-cobalt bg-white/90 flex flex-col items-center justify-center gap-1 pointer-events-none">
              <Upload size={24} className="text-cobalt" />
              <p className="m-0 text-[15px] font-semibold text-navy">Drop to add to this chat</p>
              <p className="m-0 text-[13px] text-slate">PDF, Word, PowerPoint, Markdown or text</p>
            </div>
          )}
          {fresh ? (
            <div className="relative flex-1 min-h-0 overflow-y-auto">
              {/* A soft cobalt glow and a faint dot grid behind the greeting, fading out downwards. */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
                style={{
                  backgroundImage: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(37,99,235,0.13), transparent 70%), radial-gradient(rgba(15,43,72,0.10) 1px, transparent 1px)',
                  backgroundSize: '100% 100%, 22px 22px',
                  maskImage: 'linear-gradient(to bottom, black 40%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent)',
                }} />
              <div className="relative max-w-[760px] mx-auto px-5 pt-[14vh] pb-10 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="w-11 h-11 rounded-xl bg-navy text-white flex items-center justify-center shadow-sm"><Layers size={22} /></span>
                  <h1 className="font-heading text-[30px] leading-9 font-bold tracking-tight text-navy m-0">{greeting()}</h1>
                </div>
                <div className="w-full">{composer('hero')}</div>
                <p className="m-0 -mt-2 text-[12px] text-slate">Drop files anywhere here to add them · type / for commands</p>
                <div className="w-full pt-4"><RecentWork /></div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-[780px] mx-auto px-5 py-6">
                  {gid && !wide && (
                    <div className="flex mb-3">
                      <button type="button" onClick={() => setPanel((p) => ({ ...p, view: 'panel' }))} className="btn-outline text-[13px] ml-auto">
                        <PanelRightOpen size={15} />Back to the {panelGen?.type === 'doc' ? 'document' : 'deck'}
                      </button>
                    </div>
                  )}
                  <MessageList conversationId={conversation?.id} messages={messages} pending={pending}
                    openGenerationId={gid}
                    addLabel={addLabel} onAddPicture={addPicture}
                    onOpenGeneration={(id) => navigate(`/c/${conversation.id}/g/${id}`)}
                    onShowItem={(id, index) => {
                      if (id !== gid) navigate(`/c/${conversation.id}/g/${id}`);
                      setPanel((p) => ({ ...p, focus: { index }, view: 'panel' }));
                    }}
                    onMessageUpdated={(msg) => setMessages((ms) => ms.map((m) => (m.id === msg.id ? msg : m)))}
                    onDeckChanged={() => setReloadKey((k) => k + 1)}
                    onAnswer={(text, picked) => send(text, null, null, picked)}
                    onInterview={interviewAction} />
                  <div ref={endRef} />
                </div>
              </div>
              <div className="shrink-0 px-5 pb-4 pt-2 bg-canvas">
                <div className="max-w-[780px] mx-auto">{composer('docked')}</div>
              </div>
            </>
          )}
        </section>
      )}

      {showPanel && (
        <section className="flex-1 min-w-0 bg-white">
          {Editor ? (
            <Editor key={gid} id={gid} reloadKey={reloadKey} addAfter={panel.scope === 'add' ? panel.addAfter : null} focus={panel.focus} command={panel.command}
              onSelect={(i) => setPanel((p) => ({ ...p, selected: i, scope: p.scope === 'add' || !p.scope ? 'item' : p.scope, addAfter: null }))}
              onAddAfter={(i) => setPanel((p) => ({ ...p, scope: 'add', addAfter: i, ...(wide ? {} : { view: 'chat' }) }))}
              onAsk={(instruction, _label, index) => { if (!pending) send(instruction, { index }); }}
              onClose={() => navigate(`/c/${cid}`)}
              // On narrow screens the "full screen" button becomes "back to the chat".
              expanded={wide ? panel.expanded : true}
              onToggleExpand={backToChat} />
          ) : <p className="hint p-6">Loading…</p>}
        </section>
      )}
    </div>
  );
}
