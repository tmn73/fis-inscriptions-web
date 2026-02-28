import { NextRequest, NextResponse } from 'next/server'
import { getDbTables } from '@/app/lib/getDbTables'
import { eq, and, gte, lte, sql, count, countDistinct } from 'drizzle-orm'
import { db } from '@/app/db/inscriptionsDB'

export const dynamic = 'force-dynamic'

interface StatsQuery {
  // Filters
  startDate?: string
  endDate?: string
  status?: string[]
  gender?: string[]
  discipline?: string[]
  country?: string[]

  // Metrics to return
  metrics?: string[]
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const query: StatsQuery = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status')?.split(',').filter(Boolean),
      gender: searchParams.get('gender')?.split(',').filter(Boolean),
      discipline: searchParams.get('discipline')?.split(',').filter(Boolean),
      country: searchParams.get('country')?.split(',').filter(Boolean),
      metrics: searchParams.get('metrics')?.split(',').filter(Boolean) || ['all'],
    }

    const { inscriptions, inscriptionCompetitors, competitors } = getDbTables()

    // Build base query conditions
    const conditions = []

    if (query.startDate) {
      conditions.push(
        sql`(${inscriptions.eventData}->>'startDate')::date >= ${query.startDate}`
      )
    }

    if (query.endDate) {
      conditions.push(
        sql`(${inscriptions.eventData}->>'endDate')::date <= ${query.endDate}`
      )
    }

    if (query.status && query.status.length > 0) {
      const statusConditions = query.status.map(s => eq(inscriptions.status, s as any))
      if (statusConditions.length === 1) {
        conditions.push(statusConditions[0])
      } else {
        conditions.push(sql`(${sql.join(statusConditions, sql` OR `)})`)
      }
    }

    if (query.discipline && query.discipline.length > 0) {
      const disciplineConditions = query.discipline.map(d =>
        sql`${inscriptions.eventData}->>'disciplineCode' = ${d}`
      )
      if (disciplineConditions.length === 1) {
        conditions.push(disciplineConditions[0])
      } else {
        conditions.push(sql`(${sql.join(disciplineConditions, sql` OR `)})`)
      }
    }

    if (query.country && query.country.length > 0) {
      const countryConditions = query.country.map(c =>
        sql`${inscriptions.eventData}->>'placeNationCode' = ${c}`
      )
      if (countryConditions.length === 1) {
        conditions.push(countryConditions[0])
      } else {
        conditions.push(sql`(${sql.join(countryConditions, sql` OR `)})`)
      }
    }

    const whereClause = conditions.length > 0
      ? and(...conditions)
      : undefined

    const stats: any = {}
    const wantsAll = query.metrics?.includes('all')

    // Total inscriptions
    if (wantsAll || query.metrics?.includes('totalInscriptions')) {
      const result = await db
        .select({ count: count() })
        .from(inscriptions)
        .where(whereClause)
      stats.totalInscriptions = result[0]?.count || 0
    }

    // Total competitors (unique runners)
    if (wantsAll || query.metrics?.includes('totalCompetitors')) {
      const result = await db
        .select({ count: countDistinct(inscriptionCompetitors.competitorId) })
        .from(inscriptionCompetitors)
        .leftJoin(inscriptions, eq(inscriptionCompetitors.inscriptionId, inscriptions.id))
        .where(whereClause)
      stats.totalCompetitors = result[0]?.count || 0
    }

    // Total individual registrations (competitor x events)
    if (wantsAll || query.metrics?.includes('totalIndividualRegistrations')) {
      const result = await db
        .select({ count: count() })
        .from(inscriptionCompetitors)
        .leftJoin(inscriptions, eq(inscriptionCompetitors.inscriptionId, inscriptions.id))
        .where(whereClause)
      stats.totalIndividualRegistrations = result[0]?.count || 0
    }

    // Breakdown by status
    if (wantsAll || query.metrics?.includes('byStatus')) {
      const result = await db
        .select({
          status: inscriptions.status,
          count: count()
        })
        .from(inscriptions)
        .where(whereClause)
        .groupBy(inscriptions.status)
      stats.byStatus = result
    }

    // Breakdown by gender
    if (wantsAll || query.metrics?.includes('byGender')) {
      const result = await db
        .select({
          gender: competitors.gender,
          count: count()
        })
        .from(inscriptionCompetitors)
        .leftJoin(inscriptions, eq(inscriptionCompetitors.inscriptionId, inscriptions.id))
        .leftJoin(competitors, eq(inscriptionCompetitors.competitorId, competitors.competitorid))
        .where(whereClause)
        .groupBy(competitors.gender)
      stats.byGender = result
    }

    // Breakdown by discipline
    if (wantsAll || query.metrics?.includes('byDiscipline')) {
      const result = await db.execute(sql`
        SELECT
          event_data->>'disciplineCode' as discipline,
          COUNT(*) as count
        FROM ${inscriptions}
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY event_data->>'disciplineCode'
      `)
      stats.byDiscipline = result.rows
    }

    // Breakdown by country
    if (wantsAll || query.metrics?.includes('byCountry')) {
      const result = await db.execute(sql`
        SELECT
          event_data->>'placeNationCode' as country,
          COUNT(*) as count
        FROM ${inscriptions}
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY event_data->>'placeNationCode'
      `)
      stats.byCountry = result.rows
    }

    // Registrations over time (by month)
    if (wantsAll || query.metrics?.includes('timeline')) {
      const result = await db.execute(sql`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM ${inscriptions}
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `)
      stats.timeline = result.rows
    }

    // Average competitors per inscription
    if (wantsAll || query.metrics?.includes('avgCompetitorsPerInscription')) {
      const result = await db.execute(sql`
        SELECT AVG(competitor_count) as avg
        FROM (
          SELECT inscription_id, COUNT(*) as competitor_count
          FROM ${inscriptionCompetitors}
          LEFT JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
          ${whereClause ? sql`WHERE ${whereClause}` : sql``}
          GROUP BY inscription_id
        ) as counts
      `)
      stats.avgCompetitorsPerInscription = parseFloat(result.rows[0]?.avg || '0')
    }

    // Top competitors by number of registrations
    if (wantsAll || query.metrics?.includes('topCompetitors')) {
      const result = await db.execute(sql`
        SELECT
          c.competitorid,
          c.firstname,
          c.lastname,
          c.nationcode,
          c.gender,
          COUNT(*) as registration_count
        FROM ${inscriptionCompetitors} ic
        LEFT JOIN ${inscriptions} i ON ic.inscription_id = i.id
        LEFT JOIN ${competitors} c ON ic.competitor_id = c.competitorid
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY c.competitorid, c.firstname, c.lastname, c.nationcode, c.gender
        ORDER BY registration_count DESC
        LIMIT 20
      `)
      stats.topCompetitors = result.rows
    }

    // Detailed list of competitors with registration counts (for export)
    if (query.metrics?.includes('competitorsList')) {
      const result = await db.execute(sql`
        SELECT
          c.competitorid as "competitorId",
          c.fiscode as "fisCode",
          c.firstname as "firstName",
          c.lastname as "lastName",
          c.nationcode as "nationCode",
          c.gender,
          c.birthdate as "birthDate",
          COUNT(*) as "registrationCount"
        FROM ${inscriptionCompetitors} ic
        LEFT JOIN ${inscriptions} i ON ic.inscription_id = i.id
        LEFT JOIN ${competitors} c ON ic.competitor_id = c.competitorid
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY c.competitorid, c.fiscode, c.firstname, c.lastname, c.nationcode, c.gender, c.birthdate
        ORDER BY "registrationCount" DESC, c.lastname, c.firstname
      `)
      stats.competitorsList = result.rows
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
