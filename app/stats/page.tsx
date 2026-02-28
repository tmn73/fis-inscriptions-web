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
  ChevronDown, ChevronUp, UserCog,
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

const GENDER_HEX: Record<string, string> = {
  M: '#1e3a5f',
  W: '#a855f7',
  F: '#a855f7',
}

type SortColumn = 'lastName' | 'firstName' | 'nationCode' | 'gender' | 'fisCode' | 'registrationCount'
type SortDirection = 'asc' | 'desc'

function getSeasonDateRange(season: number | null): { startDate: string; endDate: string } {
  if (!season) return { startDate: '', endDate: '' }
  return {
    startDate: `${season - 1}-07-01`,
    endDate: `${season}-04-30`,
  }
}

const SUMMARY_METRICS = 'totalInscriptions,totalCompetitors,totalIndividualRegistrations,totalRaces'

function getMetricsForTab(tab: string): string {
  switch (tab) {
    case 'overview':
      return `${SUMMARY_METRICS},byStatus,byGender,byDiscipline,topCompetitors,timeline`
    case 'competitors':
      return `${SUMMARY_METRICS},competitorsList`
    case 'disciplines':
      return `${SUMMARY_METRICS},byDiscipline`
    case 'countries':
      return `${SUMMARY_METRICS},byCountry`
    case 'users':
      return `${SUMMARY_METRICS},byCreator`
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
  const [genderFilter, setGenderFilter] = useState<string[]>([])
  const [disciplineFilter, setDisciplineFilter] = useState<string[]>([])
  const [competitorSearch, setCompetitorSearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('registrationCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const activeFilterCount = statusFilter.length + disciplineFilter.length + genderFilter.length

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    const { startDate, endDate } = getSeasonDateRange(season)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (disciplineFilter.length > 0) params.set('discipline', disciplineFilter.join(','))
    if (genderFilter.length > 0) params.set('gender', genderFilter.join(','))
    params.set('metrics', getMetricsForTab(activeTab))
    return params.toString()
  }, [season, statusFilter, disciplineFilter, genderFilter, activeTab])

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

  // Filter countries for the countries tab
  const filteredCountries = useMemo(() => {
    if (!stats?.byCountry) return []
    let list = [...stats.byCountry]
    if (countrySearch) {
      const search = countrySearch.toLowerCase()
      list = list.filter((c: any) => c.country?.toLowerCase().includes(search))
    }
    return list.sort((a: any, b: any) => Number(b.count) - Number(a.count))
  }, [stats?.byCountry, countrySearch])

  // Filter users for the users tab
  const filteredUsers = useMemo(() => {
    if (!stats?.byCreator) return []
    let list = [...stats.byCreator]
    if (userSearch) {
      const search = userSearch.toLowerCase()
      list = list.filter(
        (u: any) =>
          u.firstName?.toLowerCase().includes(search) ||
          u.lastName?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search)
      )
    }
    return list
  }, [stats?.byCreator, userSearch])

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

  const handleGenderToggle = (gender: string) => {
    setGenderFilter((prev) =>
      prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
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
    setGenderFilter([])
  }

  const exportToCSV = async () => {
    const params = new URLSearchParams()
    const { startDate, endDate } = getSeasonDateRange(season)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (disciplineFilter.length > 0) params.set('discipline', disciplineFilter.join(','))
    if (genderFilter.length > 0) params.set('gender', genderFilter.join(','))
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList>
              <TabsTrigger value="overview" className="cursor-pointer">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('tabs.overview')}</span>
                <span className="sm:hidden">{t('tabs.overviewShort')}</span>
              </TabsTrigger>
              <TabsTrigger value="competitors" className="cursor-pointer">
                <Users className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('tabs.competitors')}</span>
                <span className="sm:hidden">{t('tabs.competitorsShort')}</span>
              </TabsTrigger>
              <TabsTrigger value="disciplines" className="cursor-pointer">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('tabs.disciplines')}</span>
                <span className="sm:hidden">Disc.</span>
              </TabsTrigger>
              <TabsTrigger value="countries" className="cursor-pointer">
                <Globe className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('tabs.countries')}</span>
                <span className="sm:hidden">{t('tabs.countriesShort')}</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="cursor-pointer">
                <UserCog className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('tabs.users')}</span>
                <span className="sm:hidden">{t('tabs.usersShort')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`cursor-pointer ${showFilters ? 'bg-accent' : ''}`}
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

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={isLoading}
              className="cursor-pointer"
            >
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

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('filters.gender')}
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { value: 'M', label: t('gender.men') },
                    { value: 'W', label: t('gender.women') },
                  ].map(({ value, label }) => (
                    <Badge
                      key={value}
                      variant={genderFilter.includes(value) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all hover:opacity-80"
                      onClick={() => handleGenderToggle(value)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground cursor-pointer">
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t('filters.reset')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
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
            value={stats?.totalRaces ?? '-'}
            label={t('summary.races')}
            subtitle={t('summary.racesDesc')}
            accentColor="border-l-rose-500"
            icon={BarChart3}
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
            value={
              stats?.totalIndividualRegistrations && stats?.totalInscriptions
                ? (stats.totalIndividualRegistrations / stats.totalInscriptions).toFixed(1)
                : '-'
            }
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
                        const maxCount = Math.max(...stats.byStatus.map((s: any) => Number(s.count)))
                        const total = stats.byStatus.reduce((sum: number, s: any) => sum + Number(s.count), 0)
                        return (
                          <BreakdownBar
                            key={item.status}
                            label={tStatus(item.status)}
                            count={Number(item.count)}
                            maxCount={maxCount}
                            total={total}
                            barColor={STATUS_COLORS[item.status] || 'bg-slate-400'}
                          />
                        )
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* By Gender - Donut Chart (SVG) */}
                {stats.byGender && stats.byGender.length > 0 && (() => {
                  const genderData = stats.byGender.map((item: any) => ({
                    gender: item.gender,
                    label: item.gender === 'M' ? t('gender.men') : t('gender.women'),
                    count: Number(item.count),
                    color: GENDER_HEX[item.gender] || '#94a3b8',
                  }))
                  const total = genderData.reduce((sum: number, g: any) => sum + g.count, 0)
                  const radius = 70
                  const stroke = 18
                  const circumference = 2 * Math.PI * radius
                  let offset = 0
                  return (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('breakdown.byGender')}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <svg width={180} height={180} viewBox="0 0 180 180">
                            <circle cx="90" cy="90" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                            {genderData.map((item: any) => {
                              const pct = total > 0 ? item.count / total : 0
                              const dash = pct * circumference
                              const gap = circumference - dash
                              const currentOffset = offset
                              offset += dash
                              return (
                                <circle
                                  key={item.gender}
                                  cx="90" cy="90" r={radius}
                                  fill="none"
                                  stroke={item.color}
                                  strokeWidth={stroke}
                                  strokeDasharray={`${dash} ${gap}`}
                                  strokeDashoffset={-currentOffset}
                                  strokeLinecap="round"
                                  className="transition-all duration-700 ease-out"
                                  transform="rotate(-90 90 90)"
                                />
                              )
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold tabular-nums">{total}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">total</span>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          {genderData.map((item: any) => (
                            <div key={item.gender} className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className="font-semibold tabular-nums">{item.count}</span>
                              <span className="text-xs text-muted-foreground">
                                ({total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

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
                    className="pl-9 bg-background border-border"
                  />
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {filteredCompetitors.length} / {stats.competitorsList?.length ?? 0} {t('competitorsTable.competitors')}
                </p>
              </div>

              {/* Competitors table */}
              <Card className="py-0 overflow-hidden">
                <div className="overflow-auto max-h-[70vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b bg-muted">
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
          {stats?.byCountry && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('competitorsTable.search')}
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="pl-9 bg-background border-border"
                  />
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {filteredCountries.length} / {stats.byCountry.length} {t('countries.count')}
                </p>
              </div>

              {filteredCountries.length > 0 && (
                <Card>
                  <CardContent className="space-y-3 pt-4">
                    {filteredCountries.map((item: any) => {
                      const maxCount = Math.max(...filteredCountries.map((c: any) => Number(c.count)))
                      const total = filteredCountries.reduce((sum: number, c: any) => sum + Number(c.count), 0)
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

              {filteredCountries.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">{t('competitorsTable.noResults')}</div>
              )}
            </>
          )}

          {stats && !stats.byCountry && (
            <div className="text-center py-12 text-muted-foreground">{t('noData')}</div>
          )}
        </TabsContent>

        {/* === USERS TAB === */}
        <TabsContent value="users" className="space-y-4 mt-2">
          {stats?.byCreator && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('competitorsTable.search')}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 bg-background border-border"
                  />
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {filteredUsers.length} / {stats.byCreator.length} {t('tabs.users').toLowerCase()}
                </p>
              </div>

              {filteredUsers.length > 0 && (
                <Card className="py-0 overflow-hidden">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b bg-muted">
                          <th className="text-left p-3 w-10 text-xs font-semibold text-muted-foreground">#</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('competitorsTable.name')}</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
                          <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('breakdown.events')}</th>
                          <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('competitorsTable.competitors')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((creator: any, index: number) => (
                          <tr
                            key={creator.createdBy}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-3 text-muted-foreground tabular-nums text-xs">{index + 1}</td>
                            <td className="p-3 font-medium">
                              {creator.firstName || creator.lastName
                                ? `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim()
                                : creator.email}
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell">{creator.email}</td>
                            <td className="p-3 text-right">
                              <Badge variant="outline" className="tabular-nums">
                                {creator.inscriptionCount}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant="secondary" className="tabular-nums">
                                {creator.competitorCount}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">{t('competitorsTable.noResults')}</div>
              )}
            </>
          )}

          {stats && !stats.byCreator && (
            <div className="text-center py-12 text-muted-foreground">{t('noData')}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
