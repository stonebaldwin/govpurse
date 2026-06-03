import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Building2, SearchX } from 'lucide-react';
import {
  AnalysisBadge,
  type AnalysisKind,
  Badge,
  BarChart,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CompositionBar,
  DeltaBadge,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  Input,
  Label,
  Legend,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Sparkline,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TimeSeriesChart,
  TransactionTable,
  Treemap,
  type TransactionRow,
  VendorProfile,
} from '@govpurse/ui';
import { ToastDemo } from './demos';

export const metadata: Metadata = {
  title: 'Style guide',
  robots: { index: false, follow: false },
};

// ── Sample data (a mid-size city, FY2025) ──────────────────────────────────
const SPEND_OVER_TIME = [
  { label: 'Jul', value: 38_400_000 },
  { label: 'Aug', value: 41_900_000 },
  { label: 'Sep', value: 36_200_000 },
  { label: 'Oct', value: 44_700_000 },
  { label: 'Nov', value: 39_800_000 },
  { label: 'Dec', value: 52_300_000 },
  { label: 'Jan', value: 40_100_000 },
  { label: 'Feb', value: 37_600_000 },
  { label: 'Mar', value: 45_900_000 },
  { label: 'Apr', value: 43_200_000 },
  { label: 'May', value: 48_700_000 },
  { label: 'Jun', value: 55_100_000 },
];

const DEPARTMENTS = [
  { label: 'Police', value: 142_800_000 },
  { label: 'Fire & EMS', value: 98_300_000 },
  { label: 'Public Works', value: 76_500_000 },
  { label: 'Parks & Rec', value: 41_200_000 },
  { label: 'General Services', value: 33_900_000 },
  { label: 'Library', value: 22_100_000 },
  { label: 'Housing', value: 18_700_000 },
  { label: 'Transportation', value: 15_400_000 },
];

const TOP_VENDORS = [
  { label: 'Acme Construction Co.', value: 28_400_000 },
  { label: 'Metro Health Systems', value: 19_900_000 },
  { label: 'Civic IT Solutions', value: 14_300_000 },
  { label: 'Northstar Engineering', value: 11_800_000 },
  { label: 'Granite Paving LLC', value: 9_600_000 },
  { label: 'BlueLine Fleet Services', value: 7_200_000 },
];

const BUDGET_COMPOSITION = [
  { label: 'General Fund', value: 312_000_000 },
  { label: 'Enterprise', value: 148_000_000 },
  { label: 'Special Revenue', value: 96_000_000 },
  { label: 'Capital Projects', value: 72_000_000 },
  { label: 'Debt Service', value: 44_000_000 },
];

const CATEGORIES = [
  { label: 'Personnel', value: 268_000_000 },
  { label: 'Contracts', value: 121_000_000 },
  { label: 'Capital', value: 88_000_000 },
  { label: 'Supplies', value: 54_000_000 },
  { label: 'Grants', value: 39_000_000 },
  { label: 'Utilities', value: 27_000_000 },
  { label: 'Debt', value: 22_000_000 },
];

const TRANSACTIONS: TransactionRow[] = [
  {
    id: '1',
    date: '2026-06-01',
    vendor: 'Acme Construction Co.',
    department: 'Public Works',
    category: 'Capital',
    amount: 482_150,
  },
  {
    id: '2',
    date: '2026-05-28',
    vendor: 'Metro Health Systems',
    department: 'Fire & EMS',
    category: 'Contracts',
    amount: 1_204_900,
  },
  {
    id: '3',
    date: '2026-05-22',
    vendor: 'Civic IT Solutions',
    department: 'General Services',
    category: 'Contracts',
    amount: 96_300,
  },
  {
    id: '4',
    date: '2026-05-19',
    vendor: 'Granite Paving LLC',
    department: 'Transportation',
    category: 'Capital',
    amount: 738_400,
  },
  {
    id: '5',
    date: '2026-05-14',
    vendor: 'Northstar Engineering',
    department: 'Public Works',
    category: 'Contracts',
    amount: 312_750,
  },
  {
    id: '6',
    date: '2026-05-09',
    vendor: 'BlueLine Fleet Services',
    department: 'Police',
    category: 'Supplies',
    amount: 54_120,
  },
  {
    id: '7',
    date: '2026-05-03',
    vendor: 'Acme Construction Co.',
    department: 'Parks & Rec',
    category: 'Capital',
    amount: 2_450_000,
  },
  {
    id: '8',
    date: '2026-04-27',
    vendor: 'Evergreen Landscaping',
    department: 'Parks & Rec',
    category: 'Supplies',
    amount: 28_900,
  },
  {
    id: '9',
    date: '2026-04-21',
    vendor: 'Metro Health Systems',
    department: 'Housing',
    category: 'Grants',
    amount: 415_600,
  },
  {
    id: '10',
    date: '2026-04-15',
    vendor: 'Civic IT Solutions',
    department: 'Library',
    category: 'Contracts',
    amount: 67_450,
  },
  {
    id: '11',
    date: '2026-04-08',
    vendor: 'Granite Paving LLC',
    department: 'Public Works',
    category: 'Capital',
    amount: 1_089_200,
  },
  {
    id: '12',
    date: '2026-04-02',
    vendor: 'Northstar Engineering',
    department: 'Transportation',
    category: 'Contracts',
    amount: 224_300,
  },
  {
    id: '13',
    date: '2026-03-26',
    vendor: 'BlueLine Fleet Services',
    department: 'Fire & EMS',
    category: 'Supplies',
    amount: 91_800,
  },
  {
    id: '14',
    date: '2026-03-20',
    vendor: 'Acme Construction Co.',
    department: 'Public Works',
    category: 'Capital',
    amount: 633_400,
  },
  {
    id: '15',
    date: '2026-03-14',
    vendor: 'Summit Office Supply',
    department: 'General Services',
    category: 'Supplies',
    amount: 12_340,
  },
  {
    id: '16',
    date: '2026-03-07',
    vendor: 'Metro Health Systems',
    department: 'Fire & EMS',
    category: 'Contracts',
    amount: 845_700,
  },
];

const ANALYSIS_KINDS: AnalysisKind[] = ['analysis', 'spike', 'concentration', 'sole-source'];

const PRIMARY_SCALE: ReadonlyArray<readonly [string, string]> = [
  ['50', '#ecf5ef'],
  ['100', '#d0e7d7'],
  ['200', '#a4cfb2'],
  ['300', '#71b288'],
  ['400', '#3d9162'],
  ['500', '#16774a'],
  ['600', '#126040'],
  ['700', '#0e4c33'],
  ['800', '#0a3927'],
  ['900', '#07291c'],
];

const BASE_SWATCHES: ReadonlyArray<readonly [string, string]> = [
  ['ink', '#1c1813'],
  ['paper', '#f4efe4'],
  ['surface', '#fffdf8'],
  ['surface-subtle', '#ebe4d4'],
  ['line', '#e3dccb'],
  ['line-strong', '#cdc3aa'],
  ['muted', '#6c6454'],
  ['faint', '#9a9079'],
];

const CHART_SWATCHES: ReadonlyArray<readonly [string, string]> = [
  ['chart-1', '#16774a'],
  ['chart-2', '#1f5e8c'],
  ['chart-3', '#b5793a'],
  ['chart-4', '#7e4f74'],
  ['chart-5', '#2e7d72'],
  ['chart-6', '#b1554a'],
  ['chart-7', '#5f6b3a'],
  ['chart-8', '#8a6a3c'],
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line space-y-5 border-t py-10">
      <div className="space-y-1">
        <h2 className="text-ink text-xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-muted max-w-2xl text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="space-y-1.5">
      <div className="border-line h-14 w-full rounded-md border" style={{ backgroundColor: hex }} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink text-xs font-medium">{name}</span>
        <span className="text-faint font-mono text-[11px] uppercase">{hex}</span>
      </div>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="space-y-2">
        <span className="border-line bg-surface text-muted rounded-full border px-3 py-1 font-mono text-xs">
          Govpurse · design system
        </span>
        <h1 className="text-ink text-3xl font-semibold tracking-tight">Style guide</h1>
        <p className="text-muted max-w-2xl">
          Serious public-records infrastructure: trustworthy, calm, numbers-forward. Near-black ink
          on warm off-white, one institutional civic blue, a restrained categorical palette for
          charts, and semantic colors that present <em>computed analysis</em> — never an accusation.
          Every component is keyboard- and screen-reader-accessible.
        </p>
      </header>

      <Section title="Color" description="The @theme tokens that generate every Tailwind utility.">
        <div className="space-y-6">
          <div>
            <h3 className="text-muted mb-3 text-sm font-medium">
              Primary — institutional civic blue
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
              {PRIMARY_SCALE.map(([step, hex]) => (
                <Swatch key={step} name={step} hex={hex} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-muted mb-3 text-sm font-medium">Surfaces &amp; ink</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {BASE_SWATCHES.map(([name, hex]) => (
                <Swatch key={name} name={name} hex={hex} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-muted mb-3 text-sm font-medium">
              Categorical chart palette — restrained &amp; consistent app-wide
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {CHART_SWATCHES.map(([name, hex]) => (
                <Swatch key={name} name={name} hex={hex} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Typography"
        description="Inter for UI and headings; JetBrains Mono (tabular) for every money figure, ID, and date."
      >
        <div className="space-y-3">
          <p className="text-ink text-4xl font-semibold tracking-tight">Follow the money</p>
          <p className="text-ink text-2xl font-semibold tracking-tight">Section heading</p>
          <p className="text-ink text-base">
            Body copy in Inter — public financial records as of a point in time, always linked to
            the official portal.
          </p>
          <p className="text-muted text-sm">Secondary / muted copy for metadata and captions.</p>
          <p className="text-ink font-mono tabular-nums">$1,250,000.00 · PO-44192 · 2026-05-30</p>
        </div>
      </Section>

      <Section
        title="AnalysisBadge"
        description="The distinctive component: every derived/watchdog figure is tagged as computed analysis — never an official finding. Hover for the disclaimer."
      >
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_KINDS.map((kind) => (
            <AnalysisBadge key={kind} kind={kind} />
          ))}
        </div>
      </Section>

      <Section
        title="DeltaBadge"
        description="Year-over-year change. Colors are directional, not evaluative — an increase is not styled as “bad.”"
      >
        <div className="flex flex-wrap items-center gap-2">
          <DeltaBadge value={0.184} />
          <DeltaBadge value={0.602} />
          <DeltaBadge value={-0.083} />
          <DeltaBadge value={-0.21} />
          <DeltaBadge value={0} />
        </div>
      </Section>

      <Section
        title="Stat cards (KPIs)"
        description="The workhorse of a numbers-forward product — big tabular figures, optional delta and sparkline."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total spend FY2025"
            value={formatCompactCurrency(531_700_000)}
            delta={<DeltaBadge value={0.07} />}
            caption="vs. $496.9M in FY2024"
          />
          <StatCard label="Vendors" value={formatNumber(8_412)} caption="resolved entities" />
          <StatCard
            label="Largest payment"
            value={formatCompactCurrency(2_450_000)}
            caption="Acme Construction · Jun 1"
          />
          <StatCard
            label="Police spend"
            value={formatCompactCurrency(142_800_000)}
            delta={<DeltaBadge value={0.12} />}
          >
            <Sparkline data={[31, 33, 30, 35, 34, 38, 36, 40, 42, 41, 45, 47]} />
          </StatCard>
        </div>
      </Section>

      <Section
        title="Spend over time"
        description="Responsive line/area chart with a hover crosshair (FY2025, monthly)."
      >
        <Card>
          <CardHeader>
            <CardTitle>Total monthly spend</CardTitle>
            <CardDescription>City of Example · FY2025</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart data={SPEND_OVER_TIME} format="compactCurrency" />
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Breakdowns"
        description="Ranked horizontal bars for departments, vendors, and categories. The vendor view is paired with a concentration tag."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spend by department</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={DEPARTMENTS} format="compactCurrency" colorByIndex />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Top vendors</CardTitle>
              <AnalysisBadge kind="concentration">Top vendor = 27% of contracts</AnalysisBadge>
            </CardHeader>
            <CardContent>
              <BarChart data={TOP_VENDORS} format="compactCurrency" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Budget composition"
        description="A 100%-stacked composition bar and a squarified treemap over the same idea."
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>By fund</CardTitle>
            </CardHeader>
            <CardContent>
              <CompositionBar segments={BUDGET_COMPOSITION} format="compactCurrency" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By category</CardTitle>
            </CardHeader>
            <CardContent>
              <Treemap data={CATEGORIES} format="compactCurrency" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Transaction explorer"
        description="Data-dense, sortable, paginated. Click a header to sort; amounts are right-aligned tabular mono. Row virtualization arrives in Phase 3."
      >
        <TransactionTable rows={TRANSACTIONS} pageSize={8} />
      </Section>

      <Section
        title="Vendor profile"
        description="The reusable profile scaffold — header, KPI strip, and a content slot for charts and transactions."
      >
        <Card>
          <CardContent className="pt-6">
            <VendorProfile
              name="Acme Construction Co."
              meta="Springfield, IL · resolved across 3 jurisdictions · vendor #V-10231"
              badges={
                <>
                  <AnalysisBadge kind="concentration" />
                  <AnalysisBadge kind="sole-source" />
                </>
              }
              stats={[
                {
                  label: 'Total paid',
                  value: formatCompactCurrency(28_400_000),
                  caption: 'all time',
                },
                {
                  label: 'Paid FY2025',
                  value: formatCompactCurrency(12_100_000),
                  delta: <DeltaBadge value={0.18} />,
                  caption: 'vs. $10.3M FY2024',
                },
                { label: 'Payments', value: formatNumber(1_284) },
                { label: 'Largest', value: formatCurrency(2_450_000), caption: 'Jun 1, 2026' },
              ]}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TimeSeriesChart
                  data={SPEND_OVER_TIME}
                  format="compactCurrency"
                  height={200}
                  colorIndex={1}
                />
                <BarChart data={DEPARTMENTS.slice(0, 5)} format="compactCurrency" colorByIndex />
              </div>
            </VendorProfile>
          </CardContent>
        </Card>
      </Section>

      <Section title="Legend">
        <Legend
          items={BUDGET_COMPOSITION.map((s, i) => ({
            label: s.label,
            value: formatCompactCurrency(s.value),
            colorIndex: i,
          }))}
        />
      </Section>

      <Section
        title="Buttons"
        description="Primary, secondary, ghost, danger, link — in three sizes."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </Section>

      <Section title="Form controls" description="Input, Label, and an accessible Select.">
        <div className="grid max-w-xl gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sg-vendor">Vendor</Label>
            <Input id="sg-vendor" placeholder="e.g. Acme Construction" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-amount">Min amount</Label>
            <Input id="sg-amount" className="font-mono" placeholder="$100,000" />
          </div>
          <div className="space-y-2">
            <Label>Jurisdiction</Label>
            <Select defaultValue="la">
              <SelectTrigger>
                <SelectValue placeholder="Select a jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="la">City of Los Angeles</SelectItem>
                <SelectItem value="cook">Cook County, IL</SelectItem>
                <SelectItem value="austin">City of Austin</SelectItem>
                <SelectItem value="seattle">City of Seattle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Any department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="police">Police</SelectItem>
                <SelectItem value="fire">Fire &amp; EMS</SelectItem>
                <SelectItem value="works">Public Works</SelectItem>
                <SelectItem value="parks">Parks &amp; Rec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Badges" description="Generic badges for counts, tags, and metadata.">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="muted">3 watchlists</Badge>
        </div>
      </Section>

      <Section title="Cards" description="Raised surfaces for grouped content.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Acme Construction Co.</CardTitle>
              <CardDescription>Public Works · City of Example</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-ink font-mono tabular-nums">{formatCurrency(28_400_000)}</span>
              <AnalysisBadge kind="concentration" />
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">
                View vendor profile
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Alerts summary</CardTitle>
              <CardDescription>Across your saved views</CardDescription>
            </CardHeader>
            <CardContent className="text-muted space-y-1 text-sm">
              <p>3 new payments to Acme Construction this week</p>
              <p>Parks &amp; Rec spend up 60% vs. baseline</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="overview" className="max-w-xl">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-muted text-sm">
            Total spend, top departments and vendors, and spend over time.
          </TabsContent>
          <TabsContent value="vendors" className="text-muted text-sm">
            Resolved vendor entities ranked by total paid, with concentration analysis.
          </TabsContent>
          <TabsContent value="transactions" className="text-muted text-sm">
            Every payment, linked to the official portal with a retrieval timestamp.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Set an alert</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alert me about this vendor</DialogTitle>
              <DialogDescription>
                We&apos;ll email you the moment this jurisdiction posts a new payment to Acme
                Construction Co.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Create alert</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Toast" description="Transient feedback via sonner.">
        <ToastDemo />
      </Section>

      <Section title="Skeleton" description="Loading placeholders for cacheable data views.">
        <div className="max-w-md space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="EmptyState"
        description="Honest empty states for uncovered jurisdictions and no-result searches."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={SearchX}
            title="No transactions found"
            description="No payments match these filters. Try widening the date or amount range."
          />
          <EmptyState
            icon={Building2}
            title="Jurisdiction not yet covered"
            description="We don't cover this government yet. Request it and we'll prioritize it."
            action={
              <Button size="sm" variant="secondary">
                Request this jurisdiction
              </Button>
            }
          />
        </div>
      </Section>
    </main>
  );
}
