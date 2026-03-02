import { NextRequest, NextResponse } from 'next/server'
import { getDbTables } from '@/app/lib/getDbTables'
import { and, sql, count, isNull } from 'drizzle-orm'
import { db } from '@/app/db/inscriptionsDB'
import { clerkClient } from '@clerk/nextjs/server'

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

    // SQL expression for effective status (mirrors getEffectiveStatusForFilter from genderStatus.ts)
    // For mixed events, considers menStatus/womenStatus instead of raw status
    const effectiveStatusSql = sql`CASE
      WHEN NOT (
        ${inscriptions.eventData}->'genderCodes' @> '"M"'::jsonb
        AND ${inscriptions.eventData}->'genderCodes' @> '"W"'::jsonb
      ) THEN ${inscriptions.status}::text
      WHEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status}) = 'not_concerned'
        AND COALESCE(${inscriptions.womenStatus}, ${inscriptions.status}) = 'not_concerned'
      THEN 'not_concerned'
      WHEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status}) = 'not_concerned'
      THEN COALESCE(${inscriptions.womenStatus}, ${inscriptions.status})::text
      WHEN COALESCE(${inscriptions.womenStatus}, ${inscriptions.status}) = 'not_concerned'
      THEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status})::text
      WHEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status}) = 'open'
        OR COALESCE(${inscriptions.womenStatus}, ${inscriptions.status}) = 'open'
      THEN 'open'
      WHEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status})
        = COALESCE(${inscriptions.womenStatus}, ${inscriptions.status})
      THEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status})::text
      ELSE CASE
        WHEN (CASE COALESCE(${inscriptions.menStatus}, ${inscriptions.status})
          WHEN 'open' THEN 4 WHEN 'validated' THEN 3 WHEN 'email_sent' THEN 2
          WHEN 'cancelled' THEN 1 WHEN 'refused' THEN 1 WHEN 'not_concerned' THEN 0 ELSE 0 END)
        >= (CASE COALESCE(${inscriptions.womenStatus}, ${inscriptions.status})
          WHEN 'open' THEN 4 WHEN 'validated' THEN 3 WHEN 'email_sent' THEN 2
          WHEN 'cancelled' THEN 1 WHEN 'refused' THEN 1 WHEN 'not_concerned' THEN 0 ELSE 0 END)
        THEN COALESCE(${inscriptions.menStatus}, ${inscriptions.status})::text
        ELSE COALESCE(${inscriptions.womenStatus}, ${inscriptions.status})::text
      END
    END`

    // Build base query conditions (always exclude soft-deleted records)
    const conditions = [isNull(inscriptions.deletedAt)]

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
      const statusValues = query.status.map(s => sql`${s}`)
      conditions.push(sql`(${effectiveStatusSql}) IN (${sql.join(statusValues, sql`, `)})`)
    }

    if (query.discipline && query.discipline.length > 0) {
      const disciplineConditions = query.discipline.map(d =>
        sql`${inscriptions.eventData}->'competitions' @> ${`[{"eventCode":"${d}"}]`}::jsonb`
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

    // Gender filter applies to queries that JOIN with competitors
    const genderConditions = [...conditions, isNull(inscriptionCompetitors.deletedAt)]
    if (query.gender && query.gender.length > 0) {
      const genderSql = query.gender.map(g => sql`${competitors.gender} = ${g}`)
      if (genderSql.length === 1) {
        genderConditions.push(genderSql[0])
      } else {
        genderConditions.push(sql`(${sql.join(genderSql, sql` OR `)})`)
      }
    }
    const genderWhereClause = genderConditions.length > 0
      ? and(...genderConditions)
      : undefined

    const stats: any = {}
    const wantsAll = query.metrics?.includes('all')

    // Available seasons (always returned — lightweight query, no filters applied)
    if (wantsAll || query.metrics?.includes('availableSeasons')) {
      const result = await db.execute(sql`
        SELECT DISTINCT
          CASE
            WHEN EXTRACT(MONTH FROM (${inscriptions.eventData}->>'startDate')::date) >= 7
            THEN EXTRACT(YEAR FROM (${inscriptions.eventData}->>'startDate')::date) + 1
            ELSE EXTRACT(YEAR FROM (${inscriptions.eventData}->>'startDate')::date)
          END as season
        FROM ${inscriptions}
        WHERE ${inscriptions.deletedAt} IS NULL
        ORDER BY season DESC
      `)
      stats.availableSeasons = result.rows.map((r: any) => Number(r.season))
    }

    // Total inscriptions (no JOIN — safe with Drizzle query builder)
    if (wantsAll || query.metrics?.includes('totalInscriptions')) {
      const result = await db
        .select({ count: count() })
        .from(inscriptions)
        .where(whereClause)
      stats.totalInscriptions = result[0]?.count || 0
    }

    // Total competitors (unique runners)
    if (wantsAll || query.metrics?.includes('totalCompetitors')) {
      const hasGender = query.gender && query.gender.length > 0
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT ${inscriptionCompetitors.competitorId}) as count
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        ${hasGender ? sql`INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}` : sql``}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
      `)
      stats.totalCompetitors = Number(result.rows[0]?.count) || 0
    }

    // Total individual registrations (unique competitor x event pairs)
    if (wantsAll || query.metrics?.includes('totalIndividualRegistrations')) {
      const hasGender = query.gender && query.gender.length > 0
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT (${inscriptionCompetitors.inscriptionId}, ${inscriptionCompetitors.competitorId})) as count
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        ${hasGender ? sql`INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}` : sql``}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
      `)
      stats.totalIndividualRegistrations = Number(result.rows[0]?.count) || 0
    }

    // Total codex registrations (total competitor x codex entries, validated against eventData)
    if (wantsAll || query.metrics?.includes('totalCodexRegistrations')) {
      const hasGender = query.gender && query.gender.length > 0
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT (${inscriptionCompetitors.inscriptionId}, ${inscriptionCompetitors.codexNumber})) as count
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        ${hasGender ? sql`INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}` : sql``}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
      `)
      stats.totalCodexRegistrations = Number(result.rows[0]?.count) || 0
    }

    // Total races (codex count - individual races within competitions)
    if (wantsAll || query.metrics?.includes('totalRaces')) {
      const hasGender = query.gender && query.gender.length > 0
      const racesWhereParts = []
      if (whereClause) racesWhereParts.push(whereClause)
      if (hasGender) {
        const genderVals = query.gender!.map(g => sql`${g}`)
        racesWhereParts.push(sql`${inscriptions.id} IN (
          SELECT DISTINCT ${inscriptionCompetitors.inscriptionId}
          FROM ${inscriptionCompetitors}
          LEFT JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}
          WHERE ${inscriptionCompetitors.deletedAt} IS NULL AND ${competitors.gender} IN (${sql.join(genderVals, sql`, `)})
        )`)
      }
      const racesWhere = racesWhereParts.length > 0
        ? sql`WHERE ${sql.join(racesWhereParts, sql` AND `)}`
        : sql``
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM ${inscriptions},
          jsonb_array_elements(${inscriptions.eventData}->'competitions') as comp
        ${racesWhere}
      `)
      stats.totalRaces = Number(result.rows[0]?.count) || 0
    }

    // Breakdown by effective status (accounts for mixed-gender events)
    if (wantsAll || query.metrics?.includes('byStatus')) {
      const result = await db.execute(sql`
        SELECT (${effectiveStatusSql}) as status, COUNT(*) as count
        FROM ${inscriptions}
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY 1
      `)
      stats.byStatus = result.rows
    }

    // Breakdown by gender
    if (wantsAll || query.metrics?.includes('byGender')) {
      const result = await db.execute(sql`
        SELECT ${competitors.gender} as gender, COUNT(DISTINCT (${inscriptionCompetitors.inscriptionId}, ${inscriptionCompetitors.competitorId})) as count
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
        GROUP BY ${competitors.gender}
      `)
      stats.byGender = result.rows
    }

    // Breakdown by discipline (from competitions array -> eventCode: SL, GS, DH, SG, AC)
    if (wantsAll || query.metrics?.includes('byDiscipline')) {
      const hasGender = query.gender && query.gender.length > 0
      // Build WHERE with optional discipline-level filter on unnested competitions
      const disciplineWhereParts = []
      if (whereClause) disciplineWhereParts.push(whereClause)
      if (query.discipline && query.discipline.length > 0) {
        const vals = query.discipline.map(d => sql`${d}`)
        disciplineWhereParts.push(sql`comp->>'eventCode' IN (${sql.join(vals, sql`, `)})`)
      }
      if (hasGender) {
        const genderVals = query.gender!.map(g => sql`${g}`)
        disciplineWhereParts.push(sql`${inscriptions.id} IN (
          SELECT DISTINCT ${inscriptionCompetitors.inscriptionId}
          FROM ${inscriptionCompetitors}
          INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}
          WHERE ${inscriptionCompetitors.deletedAt} IS NULL AND ${competitors.gender} IN (${sql.join(genderVals, sql`, `)})
        )`)
      }
      const disciplineWhere = disciplineWhereParts.length > 0
        ? sql`WHERE ${sql.join(disciplineWhereParts, sql` AND `)}`
        : sql``

      const result = await db.execute(sql`
        SELECT
          comp->>'eventCode' as discipline,
          COUNT(*) as count
        FROM ${inscriptions},
          jsonb_array_elements(${inscriptions.eventData}->'competitions') as comp
        ${disciplineWhere}
        GROUP BY comp->>'eventCode'
        ORDER BY count DESC
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

    // Summary sparklines (monthly breakdown of key metrics for summary cards)
    if (query.metrics?.includes('summarySparklines')) {
      const hasGender = query.gender && query.gender.length > 0
      const result = await db.execute(sql`
        SELECT
          DATE_TRUNC('month', ${inscriptions.createdAt}) as month,
          COUNT(DISTINCT ${inscriptions.id}) as inscriptions,
          COUNT(DISTINCT ${inscriptionCompetitors.competitorId}) as competitors,
          COUNT(DISTINCT (${inscriptionCompetitors.inscriptionId}, ${inscriptionCompetitors.codexNumber})) as codex_registrations
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        ${hasGender ? sql`INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}` : sql``}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
        GROUP BY DATE_TRUNC('month', ${inscriptions.createdAt})
        ORDER BY month ASC
      `)
      stats.summarySparklines = result.rows
    }

    // Top competitors by number of registrations
    if (wantsAll || query.metrics?.includes('topCompetitors')) {
      const result = await db.execute(sql`
        SELECT
          ${competitors.competitorid},
          ${competitors.firstname},
          ${competitors.lastname},
          ${competitors.nationcode},
          ${competitors.gender},
          COUNT(DISTINCT ${inscriptionCompetitors.inscriptionId}) as registration_count,
          COUNT(DISTINCT (${inscriptionCompetitors.inscriptionId}, ${inscriptionCompetitors.codexNumber})) as codex_count
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
        GROUP BY ${competitors.competitorid}, ${competitors.firstname}, ${competitors.lastname}, ${competitors.nationcode}, ${competitors.gender}
        ORDER BY codex_count DESC
        LIMIT 20
      `)
      stats.topCompetitors = result.rows
    }

    // Detailed list of competitors with registration counts (for export)
    if (query.metrics?.includes('competitorsList')) {
      const result = await db.execute(sql`
        SELECT
          ${competitors.competitorid} as "competitorId",
          ${competitors.fiscode} as "fisCode",
          ${competitors.firstname} as "firstName",
          ${competitors.lastname} as "lastName",
          ${competitors.nationcode} as "nationCode",
          ${competitors.gender},
          ${competitors.birthdate} as "birthDate",
          COUNT(DISTINCT ${inscriptionCompetitors.inscriptionId}) as "registrationCount",
          COUNT(DISTINCT (${inscriptionCompetitors.inscriptionId}, ${inscriptionCompetitors.codexNumber})) as "codexCount"
        FROM ${inscriptionCompetitors}
        INNER JOIN ${inscriptions} ON ${inscriptionCompetitors.inscriptionId} = ${inscriptions.id}
        INNER JOIN ${competitors} ON ${inscriptionCompetitors.competitorId} = ${competitors.competitorid}
        ${genderWhereClause ? sql`WHERE ${genderWhereClause}` : sql``}
        GROUP BY ${competitors.competitorid}, ${competitors.fiscode}, ${competitors.firstname}, ${competitors.lastname}, ${competitors.nationcode}, ${competitors.gender}, ${competitors.birthdate}
        ORDER BY "codexCount" DESC, ${competitors.lastname}, ${competitors.firstname}
      `)
      stats.competitorsList = result.rows
    }

    // Breakdown by creator (who creates the most inscriptions)
    if (wantsAll || query.metrics?.includes('byCreator')) {
      const result = await db.execute(sql`
        SELECT
          ${inscriptions.createdBy} as "createdBy",
          COUNT(*) as "inscriptionCount",
          COALESCE(SUM(sub.competitor_count), 0) as "competitorCount"
        FROM ${inscriptions}
        LEFT JOIN (
          SELECT ${inscriptionCompetitors.inscriptionId} as iid, COUNT(DISTINCT ${inscriptionCompetitors.competitorId}) as competitor_count
          FROM ${inscriptionCompetitors}
          WHERE ${inscriptionCompetitors.deletedAt} IS NULL
          GROUP BY ${inscriptionCompetitors.inscriptionId}
        ) sub ON sub.iid = ${inscriptions.id}
        ${whereClause ? sql`WHERE ${whereClause}` : sql``}
        GROUP BY ${inscriptions.createdBy}
        ORDER BY "inscriptionCount" DESC
      `)

      // Resolve Clerk user IDs to names
      const client = await clerkClient()
      const rows = result.rows as any[]
      const userIds = rows.map((r) => r.createdBy).filter(Boolean)
      const userMap: Record<string, { email: string; firstName: string | null; lastName: string | null }> = {}
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const user = await client.users.getUser(userId)
            userMap[userId] = {
              email: user.emailAddresses?.[0]?.emailAddress || userId,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          } catch {
            // fallback to ID
          }
        })
      )

      stats.byCreator = rows.map((row) => {
        const resolved = userMap[row.createdBy]
        return {
          ...row,
          email: resolved?.email || row.createdBy,
          firstName: resolved?.firstName || null,
          lastName: resolved?.lastName || null,
        }
      })
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
