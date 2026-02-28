'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, TrendingUp, Users, MapPin, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'

const DISCIPLINE_OPTIONS = [
  { value: 'DH', label: 'Downhill' },
  { value: 'SL', label: 'Slalom' },
  { value: 'GS', label: 'Giant Slalom' },
  { value: 'SG', label: 'Super-G' },
  { value: 'AC', label: 'Alpine Combined' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'validated', label: 'Validated' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refused', label: 'Refused' },
  { value: 'not_concerned', label: 'Not Concerned' },
]

interface StatsFilters {
  startDate: string
  endDate: string
  status: string[]
  discipline: string[]
  metrics: string[]
}

export default function StatsPage() {
  const t = useTranslations()

  const [filters, setFilters] = useState<StatsFilters>({
    startDate: '',
    endDate: '',
    status: [],
    discipline: [],
    metrics: ['all'],
  })

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.status.length > 0) params.set('status', filters.status.join(','))
      if (filters.discipline.length > 0) params.set('discipline', filters.discipline.join(','))
      params.set('metrics', filters.metrics.join(','))

      const response = await fetch(`/api/stats?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
  })

  const handleDisciplineToggle = (discipline: string) => {
    setFilters(prev => ({
      ...prev,
      discipline: prev.discipline.includes(discipline)
        ? prev.discipline.filter(d => d !== discipline)
        : [...prev.discipline, discipline],
    }))
  }

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }))
  }

  const exportToCSV = async () => {
    const params = new URLSearchParams()
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.status.length > 0) params.set('status', filters.status.join(','))
    if (filters.discipline.length > 0) params.set('discipline', filters.discipline.join(','))
    params.set('metrics', 'competitorsList')

    const response = await fetch(`/api/stats?${params.toString()}`)
    const data = await response.json()

    if (!data.competitorsList || data.competitorsList.length === 0) {
      alert('No data to export')
      return
    }

    // Convert to CSV
    const headers = Object.keys(data.competitorsList[0])
    const csvContent = [
      headers.join(','),
      ...data.competitorsList.map((row: any) =>
        headers.map(header => {
          const value = row[header]
          // Escape commas and quotes
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      ),
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `competitors-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: [],
      discipline: [],
      metrics: ['all'],
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Statistics Dashboard</h1>
        <Button onClick={exportToCSV} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Disciplines</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DISCIPLINE_OPTIONS.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={filters.discipline.includes(value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleDisciplineToggle(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={filters.status.includes(value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleStatusToggle(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={clearFilters} variant="outline">
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Main Stats */}
      {isLoading ? (
        <div className="text-center py-12">Loading statistics...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inscriptions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInscriptions || 0}</div>
                <p className="text-xs text-muted-foreground">Event registrations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Competitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCompetitors || 0}</div>
                <p className="text-xs text-muted-foreground">Unique runners</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Individual Registrations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalIndividualRegistrations || 0}</div>
                <p className="text-xs text-muted-foreground">Competitor × Events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Registration</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgCompetitorsPerInscription?.toFixed(1) || '0.0'}
                </div>
                <p className="text-xs text-muted-foreground">Competitors per event</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* By Status */}
            {stats.byStatus && stats.byStatus.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>By Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.byStatus.map((item: any) => {
                      const maxCount = Math.max(...stats.byStatus.map((s: any) => s.count))
                      const percentage = (item.count / maxCount) * 100
                      return (
                        <div key={item.status}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm capitalize">{item.status.replace('_', ' ')}</span>
                            <Badge variant="secondary">{item.count}</Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By Gender */}
            {stats.byGender && stats.byGender.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>By Gender</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.byGender.map((item: any) => {
                      const totalCount = stats.byGender.reduce((sum: number, g: any) => sum + g.count, 0)
                      const percentage = (item.count / totalCount) * 100
                      return (
                        <div key={item.gender}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{item.gender === 'M' ? 'Men' : 'Women'}</span>
                            <Badge variant="secondary">{item.count} ({percentage.toFixed(1)}%)</Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                item.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By Discipline */}
            {stats.byDiscipline && stats.byDiscipline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>By Discipline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.byDiscipline.map((item: any) => {
                      const maxCount = Math.max(...stats.byDiscipline.map((d: any) => d.count))
                      const percentage = (item.count / maxCount) * 100
                      const colors: Record<string, string> = {
                        DH: 'bg-red-600',
                        SL: 'bg-green-600',
                        GS: 'bg-blue-600',
                        SG: 'bg-yellow-600',
                        AC: 'bg-purple-600',
                      }
                      return (
                        <div key={item.discipline}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{item.discipline}</span>
                            <Badge variant="secondary">{item.count}</Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${colors[item.discipline] || 'bg-gray-600'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Competitors */}
          {stats.topCompetitors && stats.topCompetitors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Competitors by Registration Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topCompetitors.map((competitor: any, index: number) => (
                    <div key={competitor.competitorid} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground w-6">#{index + 1}</span>
                        <div>
                          <div className="font-medium">
                            {competitor.firstname} {competitor.lastname}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {competitor.nationcode} • {competitor.gender}
                          </div>
                        </div>
                      </div>
                      <Badge>{competitor.registration_count} registrations</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {stats.timeline && stats.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Registration Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.timeline.map((item: any) => {
                    const maxCount = Math.max(...stats.timeline.map((t: any) => t.count))
                    const percentage = (item.count / maxCount) * 100
                    return (
                      <div key={item.month}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">
                            {new Date(item.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                          </span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
