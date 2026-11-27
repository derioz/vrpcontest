import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from '../ui/toast';
import { cn } from '../../lib/utils';
import { Category, Photo } from '../../types';
import { Skeleton } from '../ui/skeleton';
import { AdminVoterSearch } from './AdminVoterSearch';
import { ChangelogTab } from './ChangelogTab';
import { ArchiveContest } from './ContestManagers';
import { ContestManagementHub } from './ContestManagementHub';
import AdminSubmissionsPreview from './AdminSubmissionsPreview';
import { AdminSuggestionsTab } from './AdminSuggestionsTab';
import { AdminCountdownTab } from './AdminCountdownTab';
import { Button, EmptyState, PageHeader, Panel, Row, Switch } from './kit';
import { useConfirm } from './confirm';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

type AdminTab = 'dashboard' | 'analytics' | 'submissions' | 'suggestions' | 'voters' | 'contest' | 'countdown' | 'controls' | 'changelogs' | 'danger';

interface AdminPanelProps {
  isAdmin: boolean;
  user: any;
  activeContest: { id: string; name: string; submissions_close_date?: string; voting_end_date?: string } | null;
  categories: Category[];
  allPhotos: Photo[];
  votingOpen: boolean;
  submissionsOpen: boolean;
  onePhotoPerUser: boolean;
  showWinnersToggle: boolean;
  siteClosed?: boolean;
  censorSubmissions?: boolean;
  categorySuggestionMode?: boolean;
  publicKey: string | null;
  privateKey: string | null;
  rulesMarkdown: string;
  winners: any[];
  onToggleVoting: (open: boolean) => void;
  onToggleSubmissions: (open: boolean) => void;
  onToggleOnePhotoPerUser: (enabled: boolean) => void;
  onToggleShowWinners: (enabled: boolean) => void;
  onToggleSiteClosed?: (closed: boolean) => void;
  onToggleCensorSubmissions?: (enabled: boolean) => void;
  onToggleCategorySuggestionMode?: (enabled: boolean) => void;
  onGenerateKeys: (confirmed?: boolean) => void;
  onToggleReveal: (reveal: boolean) => void;
  onDownloadWinners: () => void;
  onDeletePhoto: (photoId: string, discordName: string, confirmed?: boolean) => void;
  onToggleDisqualifyPhoto?: (photoId: string, disqualify: boolean, reason?: string) => void;
  onResetVotes?: () => void;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  /** An entry chosen in the command menu, to be opened in Submissions. */
  openEntryId?: string | null;
  onEntryOpened?: () => void;
}

export default function AdminPanel(props: AdminPanelProps) {
  const {
    isAdmin, user, activeContest, categories = [], allPhotos = [], votingOpen, submissionsOpen,
    rulesMarkdown, winners = [], siteClosed = false,
    onDownloadWinners, onDeletePhoto, onToggleDisqualifyPhoto, onResetVotes,
    initialTab = 'dashboard', onTabChange, openEntryId, onEntryOpened,
  } = props;

  if (!isAdmin) return null;

  const switchTab = (tab: AdminTab) => onTabChange?.(tab);

  switch (initialTab) {
    case 'analytics':
      return (
        <div className="space-y-5">
          <PageHeader title="Analytics" />
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
            <AnalyticsDashboard photos={allPhotos} categories={categories} onClose={() => switchTab('dashboard')} isInline />
          </Suspense>
        </div>
      );
    case 'submissions':
      return (
        <AdminSubmissionsPreview
          allPhotos={allPhotos}
          categories={categories}
          onDeletePhoto={onDeletePhoto}
          onToggleDisqualifyPhoto={onToggleDisqualifyPhoto}
          openEntryId={openEntryId}
          onEntryOpened={onEntryOpened}
        />
      );
    case 'voters':
      return <AdminVoterSearch allPhotos={allPhotos} categories={categories} />;
    case 'suggestions':
      return <AdminSuggestionsTab currentUser={user} isAdmin={isAdmin} />;
    case 'contest':
      return (
        <ContestManagementHub
          activeContest={activeContest}
          categories={categories}
          allPhotos={allPhotos}
          rulesMarkdown={rulesMarkdown}
          winners={winners}
          user={user}
          isAdmin={isAdmin}
          votingOpen={votingOpen}
          submissionsOpen={submissionsOpen}
          onDownloadWinners={onDownloadWinners}
        />
      );
    case 'countdown':
      return <AdminCountdownTab activeContest={activeContest} />;
    case 'controls':
      return <ControlsTab {...props} />;
    case 'changelogs':
      return <ChangelogTab />;
    case 'danger':
      return <DangerTab activeContest={activeContest} categories={categories} allPhotos={allPhotos} onResetVotes={onResetVotes} />;
    default:
      return (
        <OverviewTab
          activeContest={activeContest}
          categories={categories}
          allPhotos={allPhotos}
          votingOpen={votingOpen}
          submissionsOpen={submissionsOpen}
          siteClosed={siteClosed}
          setActiveTab={switchTab}
        />
      );
  }
}

/* ── Overview ──────────────────────────────────────────────────────────────── */

interface BugReport {
  id: string;
  title: string;
  description: string;
  contactEmail?: string;
  reportedBy?: string;
  status: 'Open' | 'Resolved';
  createdAt?: any;
  dateStr?: string;
}

function formatDeadline(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function OverviewTab({ activeContest, categories, allPhotos, votingOpen, submissionsOpen, siteClosed, setActiveTab }: {
  activeContest: AdminPanelProps['activeContest']; categories: Category[]; allPhotos: Photo[];
  votingOpen: boolean; submissionsOpen: boolean; siteClosed: boolean;
  setActiveTab: (tab: AdminTab) => void;
}) {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const confirm = useConfirm();

  // Subscribe to bug reports collection
  useEffect(() => {
    try {
      const q = query(collection(db, 'bug_reports'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reports: BugReport[] = snapshot.docs.map(d => {
          const data = d.data();
          let dateStr = 'Recently';
          if (data.createdAt?.toDate) {
            dateStr = data.createdAt.toDate().toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
          }
          return {
            id: d.id,
            title: data.title || 'Untitled Report',
            description: data.description || '',
            contactEmail: data.contactEmail,
            reportedBy: data.reportedBy,
            status: data.status === 'Resolved' ? 'Resolved' : 'Open',
            createdAt: data.createdAt,
            dateStr
          };
        });
        setBugReports(reports);
        setLoadingBugs(false);
      }, (err) => {
        console.error('Error fetching bug reports:', err);
        setLoadingBugs(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoadingBugs(false);
    }
  }, []);

  const handleToggleBugStatus = async (bug: BugReport) => {
    const nextStatus = bug.status === 'Open' ? 'Resolved' : 'Open';
    try {
      await updateDoc(doc(db, 'bug_reports', bug.id), { status: nextStatus });
      toast.success(`Bug marked as ${nextStatus}`);
    } catch (e) {
      toast.error('Failed to update bug status');
    }
  };

  const handleDeleteBug = async (id: string) => {
    if (!(await confirm({ title: 'Delete this bug report?', body: 'This cannot be undone.', confirmLabel: 'Delete report', tone: 'danger' }))) return;
    try {
      await deleteDoc(doc(db, 'bug_reports', id));
      toast.success('Bug report deleted');
    } catch (e) {
      toast.error('Failed to delete bug report');
    }
  };

  const totalVotes = useMemo(() => allPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0), [allPhotos]);
  const perCategory = useMemo(
    () => categories.map((c) => {
      const entries = allPhotos.filter((p) => p.category_id === c.id);
      return { ...c, entries: entries.length, votes: entries.reduce((s, p) => s + (p.vote_count || 0), 0) };
    }),
    [categories, allPhotos],
  );
  const recent = useMemo(
    () => [...allPhotos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    [allPhotos],
  );
  const openBugs = bugReports.filter((b) => b.status === 'Open').length;
  const submissionsClose = formatDeadline(activeContest?.submissions_close_date);
  const votingEnds = formatDeadline(activeContest?.voting_end_date);

  const state = (on: boolean, yes: string, no: string, alert = false) => (
    <span className={cn('text-sm font-semibold', alert ? 'text-red-300' : on ? 'text-emerald-300' : 'text-white/60')}>{on ? yes : no}</span>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description={activeContest ? activeContest.name : 'No active contest.'}
        actions={<Button variant="primary" onClick={() => setActiveTab('submissions')}>Review submissions</Button>}
      />

      <dl className="grid grid-cols-3 divide-x divide-white/10 rounded-lg border border-white/10 bg-[#0c0c10]">
        {[
          ['Entries', allPhotos.length],
          ['Votes', totalVotes],
          ['Open bug reports', openBugs],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <dt className="text-xs text-white/60">{label}</dt>
            <dd className="mt-0.5 text-2xl font-bold tabular-nums text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Contest status" actions={<Button size="sm" onClick={() => setActiveTab('controls')}>Change</Button>}>
          <Row label="Submissions" description={submissionsClose ? `Deadline ${submissionsClose}` : 'No deadline set'}>
            {state(submissionsOpen, 'Open', 'Closed')}
          </Row>
          <Row label="Voting" description={votingEnds ? `Ends ${votingEnds}` : 'No end date set'}>
            {state(votingOpen, 'Open', 'Closed')}
          </Row>
          <Row label="Public site">{state(!siteClosed, 'Open', 'Locked', siteClosed)}</Row>
        </Panel>

        <Panel title="Entries by category">
          {perCategory.length === 0 ? (
            <EmptyState title="No categories yet">Add categories in contest setup.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/55">
                  <th scope="col" className="px-4 py-2 font-medium">Category</th>
                  <th scope="col" className="w-20 px-4 py-2 text-right font-medium">Entries</th>
                  <th scope="col" className="w-20 px-4 py-2 text-right font-medium">Votes</th>
                </tr>
              </thead>
              <tbody>
                {perCategory.map((c) => (
                  <tr key={c.id} className="border-t border-white/[0.07]">
                    <td className="max-w-0 truncate px-4 py-2 text-white">{c.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-white/80">{c.entries}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-white/80">{c.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {recent.length > 0 && (
        <Panel title="Latest entries" actions={<Button size="sm" onClick={() => setActiveTab('submissions')}>View all</Button>}>
          <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 2xl:grid-cols-8">
            {recent.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setActiveTab('submissions')} className="block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-fivem-orange">
                  <img src={p.image_url} alt={p.caption || 'Entry'} loading="lazy" decoding="async" className="aspect-video w-full rounded-md bg-white/5 object-cover" />
                  <span className="mt-1 block truncate text-xs text-white/70">{p.player_name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Bug reports">
        {loadingBugs ? (
          <div className="space-y-2 p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-2/3" /></div>
        ) : bugReports.length === 0 ? (
          <EmptyState title="No bug reports">Reports sent from the public site appear here.</EmptyState>
        ) : (
          <ul>
            {bugReports.map((bug) => {
              const open = expandedBugId === bug.id;
              return (
                <li key={bug.id} className="border-b border-white/[0.07] last:border-b-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpandedBugId(open ? null : bug.id)}
                      className="flex min-w-0 flex-1 basis-52 cursor-pointer items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-fivem-orange"
                    >
                      <ChevronDown size={14} aria-hidden="true" className={cn('shrink-0 text-white/45 transition-transform', open && 'rotate-180')} />
                      <span className={cn('truncate text-sm font-medium', bug.status === 'Open' ? 'text-white' : 'text-white/55')}>{bug.title}</span>
                    </button>
                    <span className="text-xs text-white/50">{bug.reportedBy || 'Anonymous'}, {bug.dateStr}</span>
                    <span className={cn('w-16 text-xs font-semibold', bug.status === 'Open' ? 'text-red-300' : 'text-emerald-300')}>{bug.status}</span>
                    <Button size="sm" onClick={() => handleToggleBugStatus(bug)}>{bug.status === 'Open' ? 'Resolve' : 'Reopen'}</Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete report: ${bug.title}`} onClick={() => handleDeleteBug(bug.id)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </div>
                  {open && (
                    <div className="space-y-1 px-4 pb-3 pl-10 text-sm text-white/75">
                      <p className="max-w-prose whitespace-pre-wrap">{bug.description || 'No description.'}</p>
                      {bug.contactEmail && <p className="text-xs text-white/55">Contact: {bug.contactEmail}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ── Controls ──────────────────────────────────────────────────────────────── */

function ControlsTab({
  votingOpen, submissionsOpen, onePhotoPerUser, showWinnersToggle, siteClosed = false, censorSubmissions = false,
  categorySuggestionMode = false, publicKey, privateKey,
  onToggleVoting, onToggleSubmissions, onToggleOnePhotoPerUser, onToggleShowWinners, onToggleSiteClosed,
  onToggleCensorSubmissions, onToggleCategorySuggestionMode, onGenerateKeys, onToggleReveal,
}: AdminPanelProps) {
  const confirm = useConfirm();

  const replaceKeys = async () => {
    if (!publicKey) return onGenerateKeys();
    const ok = await confirm({
      title: 'Replace the encryption keys?',
      body: 'Entries already encrypted with the current keys can no longer be opened.',
      confirmLabel: 'Replace keys',
      tone: 'danger',
    });
    if (ok) onGenerateKeys(true);
  };

  const control = (label: string, description: string, checked: boolean, onChange: (v: boolean) => void, extra?: { disabled?: boolean; tone?: 'accent' | 'danger' }) => (
    <Row label={label} description={description}>
      <Switch label={label} checked={checked} onChange={onChange} {...extra} />
    </Row>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Controls" description="Changes apply to the public site immediately." />

      <Panel title="Contest">
        {control('Submissions', 'Players can upload entries.', submissionsOpen, onToggleSubmissions)}
        {control('Voting', 'Signed-in players can vote.', votingOpen, onToggleVoting)}
        {onToggleCensorSubmissions &&
          control('Pixelate until voting', 'Entry photos stay pixelated until voting opens.', censorSubmissions, onToggleCensorSubmissions)}
        {control('One entry per player', 'Each Discord account can have one active entry.', onePhotoPerUser, onToggleOnePhotoPerUser)}
        {control('Winners announcement', 'Shows the winners banner on the public site.', showWinnersToggle, onToggleShowWinners)}
      </Panel>

      <Panel title="Entry encryption" description={publicKey ? 'Keys are set up.' : 'No keys yet.'}>
        <Row label="Encryption keys" description="Creates the key pair used to encrypt entries. Replacing keys breaks entries already encrypted.">
          <Button size="sm" onClick={replaceKeys}>{publicKey ? 'Replace keys' : 'Generate keys'}</Button>
        </Row>
        {control(
          'Reveal entries',
          'Publishes the private key, so anyone can see who submitted each photo and open the full image.',
          !!privateKey,
          async (next) => {
            if (!next || (await confirm({ title: 'Reveal all entries?', body: 'Player names and full images become visible to anyone.', confirmLabel: 'Reveal entries', tone: 'danger' }))) onToggleReveal(next);
          },
          { disabled: !publicKey },
        )}
      </Panel>

      <Panel title="Site">
        {onToggleCategorySuggestionMode &&
          control('Category suggestion mode', 'The suggestion page replaces the public home page. Admin stays available.', categorySuggestionMode, onToggleCategorySuggestionMode)}
        {onToggleSiteClosed &&
          control(
            'Lock the public site',
            'Visitors see a closed notice. Only admins can browse.',
            siteClosed,
            async (next) => {
              if (!next || (await confirm({ title: 'Lock the public site?', body: 'Visitors cannot browse until you unlock it. Admins still can.', confirmLabel: 'Lock site', tone: 'danger' }))) onToggleSiteClosed(next);
            },
            { tone: 'danger' },
          )}
      </Panel>
    </div>
  );
}

/* ── Danger zone ───────────────────────────────────────────────────────────── */

function DangerTab({ activeContest, categories, allPhotos, onResetVotes }: {
  activeContest: any; categories: Category[]; allPhotos: Photo[]; onResetVotes?: () => void;
}) {
  const confirm = useConfirm();

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Danger zone" description="These actions cannot be undone." />

      <Panel className="border-red-500/30">
        <Row label="Reset all votes" description="Deletes every vote record and sets each photo in the current contest back to 0.">
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              const ok = await confirm({
                title: 'Reset all votes to 0?',
                body: 'Every vote record is deleted. This cannot be undone.',
                confirmLabel: 'Reset votes',
                tone: 'danger',
              });
              if (ok) onResetVotes?.();
            }}
          >
            Reset votes
          </Button>
        </Row>
      </Panel>

      <Panel title="Archive the contest" description="Saves winners and player stats, then permanently deletes the current photos and votes." className="border-red-500/30">
        <div className="p-4">
          <ArchiveContest
            onArchived={() => window.location.reload()}
            activeContest={activeContest}
            categories={categories}
            allPhotos={allPhotos}
          />
        </div>
      </Panel>
    </div>
  );
}
