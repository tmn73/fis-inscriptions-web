'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Download, TrendingUp, Users, Calendar, BarChart3,
  Globe, Search, Filter, X, ArrowUp, ArrowDown,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCurrentSeason } from '@/app/lib/dates'

const DISCIPLINE_OPTIONS = [
  { value: 'DH', label: 'DH', full: 'Downhill' },
  { value: 'SL', label: 'SL', full: 'Slalom' },
  { value: 'GS', label: 'GS', full: 'Giant Slalom' },
  { value: 'SG', label: 'SG', full: 'Super-G' },
  { value: 'AC', label: 'AC', full: 'Alpine Combined' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'validated', label: 'Validated' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refused', label: 'Refused' },
  { value: 'not_concerned', label: 'Not Concerned' },
]

const DISCIPLINE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  DH: { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  SL: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  GS: { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  SG: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  AC: { bar: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-sky-500',
  validated: 'bg-emerald-500',
  email_sent: 'bg-teal-500',
  cancelled: 'bg-slate-400',
  refused: 'bg-red-500',
  not_concerned: 'bg-slate-300',
}

type SortColumn = 'lastName' | 'firstName' | 'nationCode' | 'gender' | 'fisCode' | 'registrationCount'
type SortDirection = 'asc' | 'desc'

function getSeasonDateRange(season: number | null): { startDate: string; endDate: string } {
  if (!season) return { startDate: '', endDate: '' }
  return {
    startDate: `${season - 1}-07-01`,
    endDate: `${season}-06-30`,
  }
}

function getMetricsForTab(tab: string): string {
  switch (tab) {
    case 'overview':
      return 'totalInscriptions,totalCompetitors,totalIndividualRegistrations,avgCompetitorsPerInscription,byStatus,byGender,byDiscipline,topCompetitors,timeline'
    case 'competitors':
      return 'totalCompetitors,totalIndividualRegistrations,competitorsList'
    case 'disciplines':
      return 'totalInscriptions,totalIndividualRegistrations,byDiscipline'
    case 'countries':
      return 'totalInscriptions,byCountry'
    default:
      return 'all'
  }
}

// --- Sub-components ---

function SummaryCard({
  value,
  label,
  subtitle,
  accentColor,
  icon: Icon,
  isLoading,
}: {
  value: number | string
  label: string
  subtitle: string
  accentColor: string
  icon: React.ElementType
  isLoading: boolean
}) {
  return (
    <Card className={`relative overflow-hidden border-l-[3px] ${accentColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight">{value}</p>
            )}
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownBar({
  label,
  count,
  maxCount,
  total,
  barColor,
}: {
  label: string
  count: number
  maxCount: number
  total?: number
  barColor: string
}) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
  const share = total && total > 0 ? ((count / total) * 100).toFixed(1) : null

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {share && (
            <span className="text-xs text-muted-foreground">{share}%</span>
          )}
          <Badge variant="secondary" className="text-xs tabular-nums">
            {count}
          </Badge>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function SortableHeader({
  label,
  column,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string
  column: SortColumn
  currentSort: SortColumn
  currentDirection: SortDirection
  onSort: (column: SortColumn) => void
}) {
  const isActive = currentSort === column
  return (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="h-3 w-3 text-foreground" />
        ) : (
          <ArrowDown className="h-3 w-3 text-foreground" />
        )
      ) : (
        <ArrowDown className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      )}
    </button>
  )
}

// --- Main Page ---

export default function StatsPage() {
  const t = useTranslations('stats')
  const tStatus = useTranslations('inscriptions.status')
  const currentSeason = getCurrentSeason()

  const [activeTab, setActiveTab] = useState('overview')
  const [season, setSeason] = useState<number | null>(currentSeason)
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [disciplineFilter, setDisciplineFilter] = useState<string[]>([])
  const [competitorSearch, setCompetitorSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('registrationCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const activeFilterCount = statusFilter.length + disciplineFilter.length

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    const { startDate, endDate } = getSeasonDateRange(season)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (disciplineFilter.length > 0) params.set('discipline', disciplineFilter.join(','))
    params.set('metrics', getMetricsForTab(activeTab))
    return params.toString()
  }, [season, statusFilter, disciplineFilter, activeTab])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/stats?${queryParams}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
  })

  // Filter + sort competitors for the table
  const filteredCompetitors = useMemo(() => {
    if (!stats?.competitorsList) return []
    let list = [...stats.competitorsList]

    if (competitorSearch) {
      const search = competitorSearch.toLowerCase()
      list = list.filter(
        (c: any) =>
          c.firstName?.toLowerCase().includes(search) ||
          c.lastName?.toLowerCase().includes(search) ||
          c.nationCode?.toLowerCase().includes(search) ||
          c.fisCode?.toString().includes(search)
      )
    }

    list.sort((a: any, b: any) => {
      let aVal = a[sortColumn]
      let bVal = b[sortColumn]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [stats?.competitorsList, competitorSearch, sortColumn, sortDirection])

  // Handlers
  const handleDisciplineToggle = (discipline: string) => {
    setDisciplineFilter((prev) =>
      prev.includes(discipline) ? prev.filter((d) => d !== discipline) : [...prev, discipline]
    )
  }

  const handleStatusToggle = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const clearFilters = () => {
    setStatusFilter([])
    setDisciplineFilter([])
  }

  const exportToCSV = async () => {
    const params = new URLSearchParams()
    const { startDate, endDate } = getSeasonDateRange(season)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (disciplineFilter.length > 0) params.set('discipline', disciplineFilter.join(','))
    params.set('metrics', 'competitorsList')

    const response = await fetch(`/api/stats?${params.toString()}`)
    const data = await response.json()

    if (!data.competitorsList || data.competitorsList.length === 0) return

    const headers = ['FIS Code', 'Nom', 'Prenom', 'Nation', 'Genre', 'Date naissance', 'Nb inscriptions']
    const rows = data.competitorsList.map((row: any) => [
      row.fisCode ?? '',
      row.lastName ?? '',
      row.firstName ?? '',
      row.nationCode ?? '',
      row.gender ?? '',
      row.birthDate ?? '',
      row.registrationCount ?? 0,
    ])

    const escapeCSV = (val: any) => {
      const str = String(val)
      if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [headers.join(';'), ...rows.map((r: any[]) => r.map(escapeCSV).join(';'))].join('\n')

    // BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const seasonLabel = season ? `saison-${season}` : 'toutes-saisons'
    link.download = `coureurs-inscriptions-${seasonLabel}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-5 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>

        {/* Season selector */}
        <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
          {[currentSeason - 1, currentSeason].map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                season === s
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setSeason(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
              season === null
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('season.all')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('tabs.overview')}</span>
              <span className="sm:hidden">{t('tabs.overviewShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="competitors">
              <Users className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('tabs.competitors')}</span>
              <span className="sm:hidden">{t('tabs.competitorsShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="disciplines">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('tabs.disciplines')}</span>
              <span className="sm:hidden">Disc.</span>
            </TabsTrigger>
            <TabsTrigger value="countries">
              <Globe className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('tabs.countries')}</span>
              <span className="sm:hidden">{t('tabs.countriesShort')}</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-accent' : ''}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('filters.title')}</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {showFilters ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>

            <Button size="sm" onClick={exportToCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <Card className="mt-3 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('filters.disciplines')}
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {DISCIPLINE_OPTIONS.map(({ value, label }) => (
                    <Badge
                      key={value}
                      variant={disciplineFilter.includes(value) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all hover:opacity-80"
                      onClick={() => handleDisciplineToggle(value)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('filters.status')}
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <Badge
                      key={value}
                      variant={statusFilter.includes(value) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all hover:opacity-80"
                      onClick={() => handleStatusToggle(value)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t('filters.reset')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <SummaryCard
            value={stats?.totalInscriptions ?? '-'}
            label={t('summary.inscriptions')}
            subtitle={t('summary.inscriptionsDesc')}
            accentColor="border-l-sky-500"
            icon={Calendar}
            isLoading={isLoading}
          />
          <SummaryCard
            value={stats?.totalCompetitors ?? '-'}
            label={t('summary.competitors')}
            subtitle={t('summary.competitorsDesc')}
            accentColor="border-l-emerald-500"
            icon={Users}
            isLoading={isLoading}
          />
          <SummaryCard
            value={stats?.totalIndividualRegistrations ?? '-'}
            label={t('summary.individual')}
            subtitle={t('summary.individualDesc')}
            accentColor="border-l-amber-500"
            icon={TrendingUp}
            isLoading={isLoading}
          />
          <SummaryCard
            value={stats?.avgCompetitorsPerInscription?.toFixed(1) ?? '-'}
            label={t('summary.average')}
            subtitle={t('summary.averageDesc')}
            accentColor="border-l-violet-500"
            icon={Users}
            isLoading={isLoading}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
          </div>
        )}

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-4 mt-2">
          {stats && (
            <>
              {/* Breakdowns grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* By Status */}
                {stats.byStatus && stats.byStatus.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('breakdown.byStatus')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stats.byStatus.map((item: any) => {
                        const maxCount = Math.max(...stats.byStatus.map((s: any) => s.count))
                        const total = stats.byStatus.reduce((sum: number, s: any) => sum + s.count, 0)
                        return (
                          <BreakdownBar
                            key={item.status}
                            label={tStatus(item.status)}
                            count={item.count}
                            maxCount={maxCount}
                            total={total}
                            barColor={STATUS_COLORS[item.status] || 'bg-slate-400'}
                          />
                        )
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* By Gender */}
                {stats.byGender && stats.byGender.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('breakdown.byGender')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stats.byGender.map((item: any) => {
                        const total = stats.byGender.reduce((sum: number, g: any) => sum + g.count, 0)
                        return (
                          <BreakdownBar
                            key={item.gender}
                            label={item.gender === 'M' ? t('gender.men') : t('gender.women')}
                            count={item.count}
                            maxCount={total}
                            total={total}
                            barColor={item.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'}
                          />
                        )
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* By Discipline */}
                {stats.byDiscipline && stats.byDiscipline.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('breakdown.byDiscipline')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stats.byDiscipline.map((item: any) => {
                        const maxCount = Math.max(...stats.byDiscipline.map((d: any) => Number(d.count)))
                        const colors = DISCIPLINE_COLORS[item.discipline]
                        return (
                          <BreakdownBar
                            key={item.discipline}
                            label={item.discipline}
                            count={Number(item.count)}
                            maxCount={maxCount}
                            barColor={colors?.bar || 'bg-slate-400'}
                          />
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Competitors */}
              {stats.topCompetitors && stats.topCompetitors.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('breakdown.topCompetitors')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topCompetitors.map((competitor: any, index: number) => (
                        <div
                          key={competitor.competitorid}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-muted-foreground w-7 text-right">
                              {index + 1}.
                            </span>
                            <div>
                              <span className="font-medium text-sm">
                                {competitor.lastname} {competitor.firstname}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {competitor.nationcode} · {competitor.gender}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="tabular-nums">
                            {competitor.registration_count} {t('competitorsTable.registrations')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              {stats.timeline && stats.timeline.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('breakdown.timeline')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.timeline.map((item: any) => {
                      const maxCount = Math.max(...stats.timeline.map((t: any) => Number(t.count)))
                      return (
                        <BreakdownBar
                          key={item.month}
                          label={new Date(item.month).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                          })}
                          count={Number(item.count)}
                          maxCount={maxCount}
                          barColor="bg-indigo-500"
                        />
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* === COMPETITORS TAB === */}
        <TabsContent value="competitors" className="space-y-4 mt-2">
          {stats && (
            <>
              {/* Search + count */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('competitorsTable.search')}
                    value={competitorSearch}
                    onChange={(e) => setCompetitorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {filteredCompetitors.length} / {stats.competitorsList?.length ?? 0} {t('competitorsTable.competitors')}
                </p>
              </div>

              {/* Competitors table */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 w-10 text-xs font-semibold text-muted-foreground">#</th>
                        <th className="text-left p-3">
                          <SortableHeader
                            label={t('competitorsTable.name')}
                            column="lastName"
                            currentSort={sortColumn}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left p-3 hidden md:table-cell">
                          <SortableHeader
                            label={t('competitorsTable.nation')}
                            column="nationCode"
                            currentSort={sortColumn}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left p-3 hidden lg:table-cell">
                          <SortableHeader
                            label={t('competitorsTable.gender')}
                            column="gender"
                            currentSort={sortColumn}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left p-3 hidden lg:table-cell">
                          <SortableHeader
                            label={t('competitorsTable.fisCode')}
                            column="fisCode"
                            currentSort={sortColumn}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-right p-3">
                          <SortableHeader
                            label={t('competitorsTable.registrations')}
                            column="registrationCount"
                            currentSort={sortColumn}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompetitors.map((competitor: any, index: number) => (
                        <tr
                          key={competitor.competitorId ?? index}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 text-muted-foreground tabular-nums text-xs">{index + 1}</td>
                          <td className="p-3">
                            <div>
                              <span className="font-medium">
                                {competitor.lastName} {competitor.firstName}
                              </span>
                              <span className="md:hidden text-xs text-muted-foreground ml-2">
                                {competitor.nationCode}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {competitor.nationCode}
                            </Badge>
                          </td>
                          <td className="p-3 hidden lg:table-cell text-muted-foreground">
                            {competitor.gender === 'M' ? t('gender.men') : t('gender.women')}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-muted-foreground tabular-nums">
                            {competitor.fisCode}
                          </td>
                          <td className="p-3 text-right">
                            <Badge
                              className="tabular-nums"
                              variant={Number(competitor.registrationCount) >= 5 ? 'default' : 'secondary'}
                            >
                              {competitor.registrationCount}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredCompetitors.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground">{t('competitorsTable.noResults')}</div>
                  )}
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* === DISCIPLINES TAB === */}
        <TabsContent value="disciplines" className="space-y-4 mt-2">
          {stats?.byDiscipline && stats.byDiscipline.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.byDiscipline
                .sort((a: any, b: any) => Number(b.count) - Number(a.count))
                .map((item: any) => {
                  const colors = DISCIPLINE_COLORS[item.discipline]
                  const total = stats.byDiscipline.reduce(
                    (sum: number, d: any) => sum + Number(d.count),
                    0
                  )
                  const share = total > 0 ? ((Number(item.count) / total) * 100).toFixed(1) : '0'

                  return (
                    <Card key={item.discipline}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors?.bar || 'bg-slate-400'}`} />
                            <span className="font-bold text-lg">{item.discipline}</span>
                          </div>
                          <span className="text-2xl font-bold tabular-nums">{item.count}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {DISCIPLINE_OPTIONS.find((d) => d.value === item.discipline)?.full || item.discipline}
                          </span>
                          <span>{share}% {t('disciplines.ofTotal')}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${colors?.bar || 'bg-slate-400'}`}
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}

          {stats && (!stats.byDiscipline || stats.byDiscipline.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">{t('noData')}</div>
          )}
        </TabsContent>

        {/* === COUNTRIES TAB === */}
        <TabsContent value="countries" className="space-y-4 mt-2">
          {stats?.byCountry && stats.byCountry.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t('breakdown.byCountry')}</CardTitle>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {stats.byCountry.length} {t('countries.count')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.byCountry
                  .sort((a: any, b: any) => Number(b.count) - Number(a.count))
                  .map((item: any) => {
                    const maxCount = Math.max(...stats.byCountry.map((c: any) => Number(c.count)))
                    const total = stats.byCountry.reduce((sum: number, c: any) => sum + Number(c.count), 0)
                    return (
                      <BreakdownBar
                        key={item.country}
                        label={item.country || t('countries.unknown')}
                        count={Number(item.count)}
                        maxCount={maxCount}
                        total={total}
                        barColor="bg-sky-500"
                      />
                    )
                  })}
              </CardContent>
            </Card>
          )}

          {stats && (!stats.byCountry || stats.byCountry.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">{t('noData')}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
