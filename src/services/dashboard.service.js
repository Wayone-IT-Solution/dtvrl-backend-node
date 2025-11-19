// src/services/dashboard.service.js
import { Sequelize } from "sequelize";
import dayjs from "dayjs";
import sequelize from "#configs/database";
import User from "#models/user";

const DAY = "YYYY-MM-DD";

const toNum = (v, p = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return p === 0 ? Math.trunc(n) : Number(n.toFixed(p));
};

const pct = (curr, prev) => {
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;
  if (!p && !c) return 0;
  if (!p) return 100;
  return Number((((c - p) / p) * 100).toFixed(2));
};

const pickGranularity = (days, requested) => {
  if (requested === "day" || requested === "month") return requested;
  return days > 45 ? "month" : "day";
};

const computeRanges = ({ startDate, endDate }) => {
  const fallbackEnd = dayjs().endOf("day");
  const rangeEnd = endDate ? dayjs(endDate).endOf("day") : fallbackEnd;
  let rangeStart = startDate
    ? dayjs(startDate).startOf("day")
    : rangeEnd.subtract(6, "day").startOf("day");
  if (rangeStart.isAfter(rangeEnd))
    rangeStart = rangeEnd.subtract(6, "day").startOf("day");
  const totalDays = Math.max(1, rangeEnd.diff(rangeStart, "day") + 1);
  const previousEnd = rangeStart.subtract(1, "day").endOf("day");
  const previousStart = previousEnd
    .subtract(totalDays - 1, "day")
    .startOf("day");
  return { rangeStart, rangeEnd, previousStart, previousEnd, totalDays };
};

const run = (sql, replacements = {}) =>
  sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });

async function tableExists(name) {
  const [row] = await run(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = :t
     ) AS ok`,
    { t: name }
  );
  return Boolean(row?.ok);
}

const monthWindow = (end) => {
  const endMonth = dayjs(end).endOf("month");
  const startMonth = endMonth.subtract(11, "month").startOf("month");
  const prevEndMonth = endMonth.subtract(12, "month").endOf("month");
  const prevStartMonth = startMonth.subtract(12, "month").startOf("month");
  return { startMonth, endMonth, prevStartMonth, prevEndMonth };
};

const buildMetric = (curr, prev, series = []) => ({
  totalCurrent: toNum(curr),
  totalPrevious: toNum(prev),
  percentageChange: pct(curr, prev),
  chartData: series.map((x) => toNum(x)),
});

const DashboardService = {
  /**
   * getOverview
   * options: { startDate, endDate, granularity, tz, page, limit, modules }
   */
  async getOverview(opts = {}) {
    const {
      startDate = null,
      endDate = null,
      granularity = "auto",
      tz = "UTC",
      page = 1,
      limit = 20,
      modules = null,
    } = opts;

    const { rangeStart, rangeEnd, previousStart, previousEnd, totalDays } =
      computeRanges({ startDate, endDate });

    const agg = pickGranularity(totalDays, granularity);
    const dateTrunc = agg === "month" ? "month" : "day";
    const bucketFmt = agg === "month" ? "YYYY-MM" : "YYYY-MM-DD";

    const named = {
      tz,
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
      pfrom: previousStart.toISOString(),
      pto: previousEnd.toISOString(),
      limit,
      offset: (page - 1) * limit,
    };

    const include = (name) =>
      !Array.isArray(modules) || modules.length === 0
        ? true
        : modules.includes(name);

    const payload = {
      meta: {
        range: {
          startDate: rangeStart.format(DAY),
          endDate: rangeEnd.format(DAY),
          days: totalDays,
        },
        previousRange: {
          startDate: previousStart.format(DAY),
          endDate: previousEnd.format(DAY),
        },
        granularity: agg,
        tz,
      },
      users: {},
      posts: {},
      reels: {},
      memories: {},
      itineraries: {},
      aiChats: {},
      notifications: {},
      directMessages: {},
      social: {},
      userSessions: {},
      metrics: {},
      monthWise: {},
      recent: {},
    };

    // ------------------------
    // Combined top-level scalars
    // ------------------------
    const combinedScalarsSQL = `
      SELECT
        (SELECT COUNT(*)::int FROM "Users" WHERE "createdAt" BETWEEN :from AND :to) AS users_new,
        (SELECT COUNT(*)::int FROM "Users" WHERE upper(COALESCE(status::text,'active'))='ACTIVE' AND "createdAt" BETWEEN :from AND :to) AS users_active,

        (SELECT COUNT(*)::int FROM "Posts" WHERE "createdAt" BETWEEN :from AND :to) AS posts_total,
        (SELECT COUNT(*)::int FROM "PostLikes" WHERE "createdAt" BETWEEN :from AND :to) AS post_likes,
        (SELECT COUNT(*)::int FROM "PostComments" WHERE "createdAt" BETWEEN :from AND :to) AS post_comments,
        (SELECT COUNT(*)::int FROM "PostShares" WHERE "createdAt" BETWEEN :from AND :to) AS post_shares,
        (SELECT COUNT(*)::int FROM "PostViews" WHERE "createdAt" BETWEEN :from AND :to) AS post_views,

        (SELECT COUNT(*)::int FROM "Reels" WHERE "createdAt" BETWEEN :from AND :to) AS reels_total,
        (SELECT COUNT(*)::int FROM "ReelLikes" WHERE "createdAt" BETWEEN :from AND :to) AS reel_likes,
        (SELECT COUNT(*)::int FROM "ReelViews" WHERE "createdAt" BETWEEN :from AND :to) AS reel_views,

        (SELECT COUNT(*)::int FROM "AiChatSessions" WHERE "createdAt" BETWEEN :from AND :to) AS aichat_sessions,
        (SELECT COUNT(*)::int FROM "AiChatMessages" WHERE "createdAt" BETWEEN :from AND :to) AS aichat_messages,

        (SELECT COUNT(*)::int FROM "Itineraries" WHERE "createdAt" BETWEEN :from AND :to) AS itins_total,
        (SELECT COALESCE(SUM(COALESCE(amount,0))::numeric,0) FROM "Itineraries" WHERE "createdAt" BETWEEN :from AND :to) AS itins_amount,

        (SELECT COUNT(*)::int FROM "Memories" WHERE "createdAt" BETWEEN :from AND :to) AS memories_total,

        (SELECT COUNT(*)::int FROM "Notifications" WHERE "createdAt" BETWEEN :from AND :to) AS notifications_total,

        (SELECT COUNT(*)::int FROM "Messages" WHERE "createdAt" BETWEEN :from AND :to) AS messages_total
    `;
    const [combinedTotals] = await run(combinedScalarsSQL, {
      from: named.from,
      to: named.to,
    });

    payload.metrics = {
      usersNew: combinedTotals?.users_new ?? 0,
      usersActive: combinedTotals?.users_active ?? 0,
      postsTotal: combinedTotals?.posts_total ?? 0,
      postLikes: combinedTotals?.post_likes ?? 0,
      reelsTotal: combinedTotals?.reels_total ?? 0,
      aichatSessions: combinedTotals?.aichat_sessions ?? 0,
      itinsAmount: combinedTotals?.itins_amount ?? 0,
      messagesTotal: combinedTotals?.messages_total ?? 0,
      notificationsTotal: combinedTotals?.notifications_total ?? 0,
      memoriesTotal: combinedTotals?.memories_total ?? 0,
    };

    // ------------------------
    // USERS block
    // ------------------------
    if (include("users")) {
      const usersSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        users_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS new_users
          FROM "Users"
          WHERE "createdAt" BETWEEN :from AND :to
          GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts, COALESCE(u.new_users,0) AS new_users
        FROM series s
        LEFT JOIN users_sub u ON u.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const usersSeries = await run(usersSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const usersScalarSQL = `
        WITH curr AS (
          SELECT
            COUNT(*)::int AS total_users,
            COUNT(CASE WHEN upper(COALESCE(status::text,'active'))='ACTIVE' THEN 1 END)::int AS active_total,
            COUNT(CASE WHEN upper(COALESCE(status::text,''))='SUSPENDED' THEN 1 END)::int AS suspended_total,
            COUNT(CASE WHEN "emailVerified" = true THEN 1 END)::int AS emailVerified_total
          FROM "Users"
          WHERE "createdAt" BETWEEN :from AND :to
        ), prev AS (
          SELECT COUNT(*)::int AS total_users FROM "Users" WHERE "createdAt" BETWEEN :pfrom AND :pto
        )
        SELECT (SELECT row_to_json(c) FROM curr c) AS curr, (SELECT row_to_json(p) FROM prev p) AS prev
      `;
      const [usersScalars] = await run(usersScalarSQL, {
        from: named.from,
        to: named.to,
        pfrom: named.pfrom,
        pto: named.pto,
      });

      const genderRow = await run(
        `SELECT COALESCE(("gender")::text, 'Unknown') AS gender_text, COUNT(*)::int AS cnt FROM "Users" WHERE "createdAt" BETWEEN :from AND :to GROUP BY COALESCE(("gender")::text, 'Unknown')`,
        { from: named.from, to: named.to }
      );

      const topUsers = await run(
        `SELECT u.id, u.username, u.name, COALESCE(f.count,0)::int AS followers_count
         FROM "Users" u
         LEFT JOIN (
           SELECT "otherId" AS uid, COUNT(*)::int AS count
           FROM "UserFollows" GROUP BY "otherId"
         ) f ON f.uid = u.id
         ORDER BY followers_count DESC NULLS LAST
         LIMIT 20`
      );

      const topActive = await run(
        `SELECT u.id, u.username, u.name,
               COALESCE(p.cnt,0)::int AS posts_count,
               COALESCE(r.cnt,0)::int AS reels_count,
               (COALESCE(p.cnt,0) + COALESCE(r.cnt,0))::int AS total_activity
         FROM "Users" u
         LEFT JOIN (SELECT "userId", COUNT(*)::int AS cnt FROM "Posts" GROUP BY "userId") p ON p."userId" = u.id
         LEFT JOIN (SELECT "userId", COUNT(*)::int AS cnt FROM "Reels" GROUP BY "userId") r ON r."userId" = u.id
         ORDER BY total_activity DESC LIMIT 20`
      );

      const recentUsers = await run(
        `SELECT id, username, name, email, "createdAt", status FROM "Users" ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.users = {
        metrics: {
          totals: usersScalars?.curr ?? {},
          previous: usersScalars?.prev ?? {},
          summary: {
            newUsers: payload.metrics.usersNew,
            activeUsers: payload.metrics.usersActive,
          },
        },
        series: usersSeries,
        breakdowns: {
          gender: (genderRow || []).reduce((acc, r) => {
            acc[r.gender_text] = Number(r.cnt || 0);
            return acc;
          }, {}),
        },
        topUsers,
        topActive,
        recent: recentUsers,
      };
    }

    // ------------------------
    // POSTS block
    // ------------------------
    if (include("posts")) {
      const postsSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        p_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS posts_count
          FROM "Posts" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        likes_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS likes_count
          FROM "PostLikes" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        comments_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS comments_count
          FROM "PostComments" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        shares_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS shares_count
          FROM "PostShares" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        views_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts,
                 COUNT(*)::int AS views_count,
                 SUM(COALESCE("duration",0))::bigint AS views_total_duration
          FROM "PostViews"
          WHERE "createdAt" BETWEEN :from AND :to
          GROUP BY 1
        ),
        washere_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS washere_count
          FROM "PostWasHeres" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts,
          COALESCE(p.posts_count,0) AS posts_count,
          COALESCE(l.likes_count,0) AS likes_count,
          COALESCE(c.comments_count,0) AS comments_count,
          COALESCE(sh.shares_count,0) AS shares_count,
          COALESCE(v.views_count,0) AS views_count,
          COALESCE(v.views_total_duration,0) AS views_total_duration,
          COALESCE(w.washere_count,0) AS washere_count
        FROM series s
        LEFT JOIN p_sub p ON p.bucket_ts = s.bucket_ts
        LEFT JOIN likes_sub l ON l.bucket_ts = s.bucket_ts
        LEFT JOIN comments_sub c ON c.bucket_ts = s.bucket_ts
        LEFT JOIN shares_sub sh ON sh.bucket_ts = s.bucket_ts
        LEFT JOIN views_sub v ON v.bucket_ts = s.bucket_ts
        LEFT JOIN washere_sub w ON w.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const postsSeries = await run(postsSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const postsTotalsSQL = `
        SELECT
          (SELECT COUNT(*)::int FROM "Posts" WHERE "createdAt" BETWEEN :from AND :to) AS posts_total,
          (SELECT COUNT(*)::int FROM "PostLikes" WHERE "createdAt" BETWEEN :from AND :to) AS likes_total,
          (SELECT COUNT(*)::int FROM "PostComments" WHERE "createdAt" BETWEEN :from AND :to) AS comments_total,
          (SELECT COUNT(*)::int FROM "PostShares" WHERE "createdAt" BETWEEN :from AND :to) AS shares_total,
          (SELECT COUNT(*)::int FROM "PostViews" WHERE "createdAt" BETWEEN :from AND :to) AS views_total,
          (SELECT SUM(COALESCE("duration",0))::bigint FROM "PostViews" WHERE "createdAt" BETWEEN :from AND :to) AS views_total_duration,
          (SELECT COUNT(*)::int FROM "PostWasHeres" WHERE "createdAt" BETWEEN :from AND :to) AS was_here_total
      `;
      const [postsTotals] = await run(postsTotalsSQL, {
        from: named.from,
        to: named.to,
      });

      const topPosts = await run(
        `SELECT p.id, p.caption, p."userId", p."createdAt",
          COALESCE(l.likes_count,0) AS likes_count,
          COALESCE(c.comments_count,0) AS comments_count,
          COALESCE(s.shares_count,0) AS shares_count,
          COALESCE(v.views_count,0) AS views_count,
          COALESCE(w.washere_count,0) AS washere_count,
          (COALESCE(l.likes_count,0) + COALESCE(c.comments_count,0) + COALESCE(s.shares_count,0) + COALESCE(v.views_count,0) + COALESCE(w.washere_count,0))::int AS engagement_score
        FROM "Posts" p
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS likes_count FROM "PostLikes" GROUP BY "postId") l ON l."postId" = p.id
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS comments_count FROM "PostComments" GROUP BY "postId") c ON c."postId" = p.id
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS shares_count FROM "PostShares" GROUP BY "postId") s ON s."postId" = p.id
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS views_count FROM "PostViews" GROUP BY "postId") v ON v."postId" = p.id
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS washere_count FROM "PostWasHeres" GROUP BY "postId") w ON w."postId" = p.id
        ORDER BY engagement_score DESC NULLS LAST
        LIMIT 20`
      );

      const recentPosts = await run(
        `SELECT p.id, p.caption, p.image, p."userId", p.visibility, p.status, p."createdAt",
          COALESCE(l.likes_count,0) AS likes_count, COALESCE(c.comments_count,0) AS comments_count
        FROM "Posts" p
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS likes_count FROM "PostLikes" GROUP BY "postId") l ON l."postId" = p.id
        LEFT JOIN (SELECT "postId", COUNT(*)::int AS comments_count FROM "PostComments" GROUP BY "postId") c ON c."postId" = p.id
        ORDER BY p."createdAt" DESC
        LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.posts = {
        metrics: { totals: postsTotals },
        series: postsSeries,
        topPosts,
        recent: recentPosts,
      };
    }

    // ------------------------
    // REELS block
    // Notes:
    // - ReelViews table in your schema doesn't include `duration` (you provided one recordset without duration).
    // - To avoid SQL errors, views_total_duration for reels is set to 0 (safe).
    // ------------------------
    if (include("reels")) {
      const reelsSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        r_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS reels_count
          FROM "Reels" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        likes_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS likes_count
          FROM "ReelLikes" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        comments_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS comments_count
          FROM "ReelComments" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        shares_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS shares_count
          FROM "ReelShares" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        -- safe: ReelViews may not have duration column; return 0 for total_duration to avoid missing-column errors
        views_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts,
                 COUNT(*)::int AS views_count,
                 0::bigint AS views_total_duration
          FROM "ReelViews"
          WHERE "createdAt" BETWEEN :from AND :to
          GROUP BY 1
        ),
        washere_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS washere_count
          FROM "ReelWasHeres" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts,
          COALESCE(r.reels_count,0) AS reels_count,
          COALESCE(l.likes_count,0) AS likes_count,
          COALESCE(c.comments_count,0) AS comments_count,
          COALESCE(sh.shares_count,0) AS shares_count,
          COALESCE(v.views_count,0) AS views_count,
          COALESCE(v.views_total_duration,0) AS views_total_duration,
          COALESCE(w.washere_count,0) AS washere_count
        FROM series s
        LEFT JOIN r_sub r ON r.bucket_ts = s.bucket_ts
        LEFT JOIN likes_sub l ON l.bucket_ts = s.bucket_ts
        LEFT JOIN comments_sub c ON c.bucket_ts = s.bucket_ts
        LEFT JOIN shares_sub sh ON sh.bucket_ts = s.bucket_ts
        LEFT JOIN views_sub v ON v.bucket_ts = s.bucket_ts
        LEFT JOIN washere_sub w ON w.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const reelsSeries = await run(reelsSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const reelsTotalsSQL = `
        SELECT
          (SELECT COUNT(*)::int FROM "Reels" WHERE "createdAt" BETWEEN :from AND :to) AS reels_total,
          (SELECT COUNT(*)::int FROM "ReelLikes" WHERE "createdAt" BETWEEN :from AND :to) AS likes_total,
          (SELECT COUNT(*)::int FROM "ReelComments" WHERE "createdAt" BETWEEN :from AND :to) AS comments_total,
          (SELECT COUNT(*)::int FROM "ReelShares" WHERE "createdAt" BETWEEN :from AND :to) AS shares_total,
          (SELECT COUNT(*)::int FROM "ReelViews" WHERE "createdAt" BETWEEN :from AND :to) AS views_total,
          0 AS views_total_duration,
          (SELECT COUNT(*)::int FROM "ReelWasHeres" WHERE "createdAt" BETWEEN :from AND :to) AS was_here_total
      `;
      const [reelsTotals] = await run(reelsTotalsSQL, {
        from: named.from,
        to: named.to,
      });

      const topReels = await run(
        `SELECT r.id, r.caption, r."userId", r."createdAt",
           COALESCE(l.likes_count,0) AS likes_count,
           COALESCE(c.comments_count,0) AS comments_count,
           COALESCE(s.shares_count,0) AS shares_count,
           COALESCE(v.views_count,0) AS views_count,
           COALESCE(w.washere_count,0) AS washere_count,
           (COALESCE(l.likes_count,0)+COALESCE(c.comments_count,0)+COALESCE(s.shares_count,0)+COALESCE(v.views_count,0)+COALESCE(w.washere_count,0))::int AS engagement_score
         FROM "Reels" r
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS likes_count FROM "ReelLikes" GROUP BY "reelId") l ON l."reelId" = r.id
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS comments_count FROM "ReelComments" GROUP BY "reelId") c ON c."reelId" = r.id
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS shares_count FROM "ReelShares" GROUP BY "reelId") s ON s."reelId" = r.id
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS views_count FROM "ReelViews" GROUP BY "reelId") v ON v."reelId" = r.id
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS washere_count FROM "ReelWasHeres" GROUP BY "reelId") w ON w."reelId" = r.id
         ORDER BY engagement_score DESC NULLS LAST LIMIT 20`
      );

      const recentReels = await run(
        `SELECT r.id, r.caption, r."userId", r."videoUrl", r.visibility, r.status, r."createdAt",
               COALESCE(l.likes_count,0) AS likes_count, COALESCE(c.comments_count,0) AS comments_count
         FROM "Reels" r
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS likes_count FROM "ReelLikes" GROUP BY "reelId") l ON l."reelId" = r.id
         LEFT JOIN (SELECT "reelId", COUNT(*)::int AS comments_count FROM "ReelComments" GROUP BY "reelId") c ON c."reelId" = r.id
         ORDER BY r."createdAt" DESC
         LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.reels = {
        metrics: { totals: reelsTotals },
        series: reelsSeries,
        topReels,
        recent: recentReels,
      };
    }

    // ------------------------
    // AI CHATS block
    // ------------------------
    if (include("aiChats")) {
      const aiSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        sessions_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS sessions_count, COUNT(DISTINCT "userId")::int AS unique_users
          FROM "AiChatSessions" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        ),
        messages_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS messages_count, COUNT(DISTINCT "sessionId")::int AS sessions_with_messages
          FROM "AiChatMessages" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts,
          COALESCE(sess.sessions_count,0) AS sessions_count,
          COALESCE(sess.unique_users,0) AS unique_users,
          COALESCE(msg.messages_count,0) AS messages_count,
          COALESCE(msg.sessions_with_messages,0) AS sessions_with_messages
        FROM series s
        LEFT JOIN sessions_sub sess ON sess.bucket_ts = s.bucket_ts
        LEFT JOIN messages_sub msg ON msg.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const aiSeries = await run(aiSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const aiScalarsSQL = `
        WITH curr AS (
          SELECT COUNT(*)::int AS sessions_total,
                 COUNT(DISTINCT "userId")::int AS unique_users,
                 (SELECT COUNT(*) FROM "AiChatMessages" WHERE "createdAt" BETWEEN :from AND :to)::int AS messages_total,
                 AVG(msgs_per_session)::numeric AS avg_messages_per_session
          FROM "AiChatSessions" s
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS msgs_per_session FROM "AiChatMessages" m WHERE m."sessionId" = s.id
          ) x ON TRUE
          WHERE s."createdAt" BETWEEN :from AND :to
        ), prev AS (
          SELECT COUNT(*)::int AS sessions_total FROM "AiChatSessions" WHERE "createdAt" BETWEEN :pfrom AND :pto
        )
        SELECT (SELECT row_to_json(c) FROM curr c) AS curr, (SELECT row_to_json(p) FROM prev p) AS prev
      `;
      const [aiScalars] = await run(aiScalarsSQL, {
        from: named.from,
        to: named.to,
        pfrom: named.pfrom,
        pto: named.pto,
      });

      const aiTopUsers = await run(
        `SELECT u.id, u.username, u.name, COALESCE(cnt.cnt,0)::int AS messages_count
         FROM "Users" u
         LEFT JOIN (
           SELECT s."userId", COUNT(m.*)::int AS cnt
           FROM "AiChatSessions" s
           JOIN "AiChatMessages" m ON m."sessionId" = s.id
           GROUP BY s."userId"
         ) cnt ON cnt."userId" = u.id
         ORDER BY COALESCE(cnt.cnt,0) DESC NULLS LAST LIMIT 20`
      );

      const aiRecent = await run(
        `SELECT s.id, s."userId", s.title, s."lastInteractionAt", s."createdAt",
                COALESCE(msgs.msg_count,0) AS messages_count
         FROM "AiChatSessions" s
         LEFT JOIN (SELECT "sessionId", COUNT(*)::int AS msg_count FROM "AiChatMessages" GROUP BY "sessionId") msgs ON msgs."sessionId" = s.id
         ORDER BY s."lastInteractionAt" DESC
         LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      const aiRole = await run(
        `SELECT role, COUNT(*)::int AS cnt FROM "AiChatMessages" WHERE "createdAt" BETWEEN :from AND :to GROUP BY role`,
        { from: named.from, to: named.to }
      );

      payload.aiChats = {
        metrics: { totals: aiScalars?.curr ?? {}, previous: aiScalars?.prev ?? {} },
        series: aiSeries,
        topUsers: aiTopUsers,
        recent: aiRecent,
        roleBreakdown: (aiRole || []).reduce((acc, r) => {
          acc[r.role] = Number(r.cnt || 0);
          return acc;
        }, {}),
      };
    }

    // ------------------------
    // MEMORIES block
    // ------------------------
    if (include("memories")) {
      const memSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        mem_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS memories_count
          FROM "Memories" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts, COALESCE(m.memories_count,0) AS memories_count
        FROM series s LEFT JOIN mem_sub m ON m.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const memSeries = await run(memSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const memTotalsSQL = `
        SELECT
          (SELECT COUNT(*)::int FROM "Memories" WHERE "createdAt" BETWEEN :from AND :to) AS memories_total,
          (SELECT COUNT(*)::int FROM "Memories" WHERE privacy = 'open_to_all' AND "createdAt" BETWEEN :from AND :to) AS open_total
      `;
      const [memTotals] = await run(memTotalsSQL, {
        from: named.from,
        to: named.to,
      });

      const memPrivacy = await run(
        `SELECT privacy, COUNT(*)::int AS cnt FROM "Memories" WHERE "createdAt" BETWEEN :from AND :to GROUP BY privacy`,
        { from: named.from, to: named.to }
      );

      const memRecent = await run(
        `SELECT id, name, "userId", "startDate", "endDate", privacy, "createdAt" FROM "Memories" ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.memories = {
        metrics: { totals: memTotals },
        series: memSeries,
        privacyBreakdown: (memPrivacy || []).reduce((acc, r) => {
          acc[r.privacy] = Number(r.cnt || 0);
          return acc;
        }, {}),
        recent: memRecent,
      };
    }

    // ------------------------
    // ITINERARIES block
    // ------------------------
    if (include("itineraries")) {
      const itinSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        it_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts,
                 COUNT(*)::int AS itineraries_count,
                 SUM(COALESCE(amount,0))::numeric AS amount_sum,
                 AVG(COALESCE("peopleCount",0))::numeric AS avg_people
          FROM "Itineraries"
          WHERE "createdAt" BETWEEN :from AND :to
          GROUP BY 1
        ),
        comments_sub AS (SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS comments_count FROM "ItineraryComments" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1),
        likes_sub AS (SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS likes_count FROM "ItineraryLikes" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1),
        recommends_sub AS (SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS recommends_count FROM "ItineraryRecommends" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1)
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts,
          COALESCE(it.itineraries_count,0) AS itineraries_count,
          COALESCE(it.amount_sum,0) AS amount_sum,
          COALESCE(it.avg_people,0) AS avg_people,
          COALESCE(c.comments_count,0) AS comments_count,
          COALESCE(l.likes_count,0) AS likes_count,
          COALESCE(r.recommends_count,0) AS recommends_count
        FROM series s
        LEFT JOIN it_sub it ON it.bucket_ts = s.bucket_ts
        LEFT JOIN comments_sub c ON c.bucket_ts = s.bucket_ts
        LEFT JOIN likes_sub l ON l.bucket_ts = s.bucket_ts
        LEFT JOIN recommends_sub r ON r.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const itinSeries = await run(itinSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const itinScalarSQL = `
        WITH curr AS (
          SELECT COUNT(*)::int AS itineraries_total,
                 SUM(COALESCE(amount,0))::numeric AS amount_total,
                 AVG(COALESCE("peopleCount",0))::numeric AS avg_people,
                 COUNT(CASE WHEN public THEN 1 END)::int AS public_total,
                 COUNT(CASE WHEN NOT public THEN 1 END)::int AS private_total,
                 COUNT(CASE WHEN "aiMessageId" IS NOT NULL THEN 1 END)::int AS ai_generated_total
          FROM "Itineraries"
          WHERE "createdAt" BETWEEN :from AND :to
        ), prev AS (
          SELECT COUNT(*)::int AS itineraries_total FROM "Itineraries" WHERE "createdAt" BETWEEN :pfrom AND :pto
        )
        SELECT (SELECT row_to_json(c) FROM curr c) AS curr, (SELECT row_to_json(p) FROM prev p) AS prev
      `;
      const [itinTotals] = await run(itinScalarSQL, {
        from: named.from,
        to: named.to,
        pfrom: named.pfrom,
        pto: named.pto,
      });

      const topItineraries = await run(
        `SELECT it.id, it.title, it."userId", it."createdAt",
          COALESCE(l.likes_count,0) AS likes_count, COALESCE(c.comments_count,0) AS comments_count, COALESCE(r.recommends_count,0) AS recommends_count,
          (COALESCE(l.likes_count,0)+COALESCE(c.comments_count,0)+COALESCE(r.recommends_count,0))::int AS engagement_score
         FROM "Itineraries" it
         LEFT JOIN (SELECT "itineraryId", COUNT(*)::int AS likes_count FROM "ItineraryLikes" GROUP BY "itineraryId") l ON l."itineraryId" = it.id
         LEFT JOIN (SELECT "itineraryId", COUNT(*)::int AS comments_count FROM "ItineraryComments" GROUP BY "itineraryId") c ON c."itineraryId" = it.id
         LEFT JOIN (SELECT "itineraryId", COUNT(*)::int AS recommends_count FROM "ItineraryRecommends" GROUP BY "itineraryId") r ON r."itineraryId" = it.id
         ORDER BY engagement_score DESC NULLS LAST LIMIT 20`
      );

      const recentItins = await run(
        `SELECT id, title, "userId", amount, public, "createdAt" FROM "Itineraries" ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.itineraries = {
        metrics: { totals: itinTotals?.curr ?? {}, previous: itinTotals?.prev ?? {} },
        series: itinSeries,
        topItineraries,
        recent: recentItins,
      };
    }

    // ------------------------
    // NOTIFICATIONS
    // ------------------------
    if (include("notifications")) {
      const notifSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        n_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts,
                 COUNT(*)::int AS notifications_count,
                 COUNT(CASE WHEN status = 'UNREAD' THEN 1 END)::int AS unread_count
          FROM "Notifications"
          WHERE "createdAt" BETWEEN :from AND :to
          GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts, COALESCE(n.notifications_count,0) AS notifications_count, COALESCE(n.unread_count,0) AS unread_count
        FROM series s
        LEFT JOIN n_sub n ON n.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const notifSeries = await run(notifSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const notifTotals = await run(
        `SELECT (SELECT COUNT(*)::int FROM "Notifications" WHERE "createdAt" BETWEEN :from AND :to) AS total_notifications,
                (SELECT COUNT(*)::int FROM "Notifications" WHERE status = 'UNREAD' AND "createdAt" BETWEEN :from AND :to) AS unread_notifications`,
        { from: named.from, to: named.to }
      );

      const notifTypes = await run(
        `SELECT type, COUNT(*)::int AS cnt FROM "Notifications" WHERE "createdAt" BETWEEN :from AND :to GROUP BY type ORDER BY cnt DESC`,
        { from: named.from, to: named.to }
      );

      const recentNotifs = await run(
        `SELECT id, "recipientId", "actorId", type, status, title, message, "createdAt" FROM "Notifications" ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.notifications = {
        metrics: { totals: notifTotals?.[0] ?? {} },
        series: notifSeries,
        types: (notifTypes || []).reduce((acc, r) => {
          acc[r.type] = Number(r.cnt || 0);
          return acc;
        }, {}),
        recent: recentNotifs,
      };
    }

    // ------------------------
    // DIRECT MESSAGES
    // ------------------------
    if (include("directMessages")) {
      const dmSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        m_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts,
                 COUNT(*)::int AS messages_count,
                 COUNT(CASE WHEN "readByUser" = false THEN 1 END)::int AS unread_count
          FROM "Messages"
          WHERE "createdAt" BETWEEN :from AND :to
          GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts, COALESCE(m.messages_count,0) AS messages_count, COALESCE(m.unread_count,0) AS unread_count
        FROM series s
        LEFT JOIN m_sub m ON m.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const dmSeries = await run(dmSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const dmTotals = await run(
        `SELECT (SELECT COUNT(*)::int FROM "Messages" WHERE "createdAt" BETWEEN :from AND :to) AS messages_total,
                (SELECT COUNT(*)::int FROM "Messages" WHERE "readByUser" = false AND "createdAt" BETWEEN :from AND :to) AS unread_total`,
        { from: named.from, to: named.to }
      );

      const topSenders = await run(
        `SELECT u.id, u.username, u.name, COALESCE(cnt.cnt,0)::int AS sent_count
         FROM "Users" u
         LEFT JOIN (
           SELECT "senderId", COUNT(*)::int AS cnt FROM "Messages" GROUP BY "senderId" ORDER BY cnt DESC LIMIT 20
         ) cnt ON cnt."senderId" = u.id
         ORDER BY sent_count DESC LIMIT 20`
      );

      const recentMsgs = await run(
        `SELECT id, message, "senderId", "receiverId", file, "readByUser", "createdAt" FROM "Messages" ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.directMessages = {
        metrics: { totals: dmTotals?.[0] ?? {} },
        series: dmSeries,
        topSenders,
        recent: recentMsgs,
      };
    }

    // ------------------------
    // SOCIAL block (follows / requests / blocks)
    // ------------------------
    if (include("social")) {
      const socialSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        follows_sub AS (SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS follows_count FROM "UserFollows" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1),
        followreq_sub AS (SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS requests_count FROM "FollowRequests" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1),
        blocks_sub AS (SELECT date_trunc('${dateTrunc}', timezone(:tz, "createdAt")) AS bucket_ts, COUNT(*)::int AS blocks_count FROM "UserBlocks" WHERE "createdAt" BETWEEN :from AND :to GROUP BY 1)
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts,
          COALESCE(f.follows_count,0) AS follows_count,
          COALESCE(fq.requests_count,0) AS follow_requests_count,
          COALESCE(b.blocks_count,0) AS blocks_count
        FROM series s
        LEFT JOIN follows_sub f ON f.bucket_ts = s.bucket_ts
        LEFT JOIN followreq_sub fq ON fq.bucket_ts = s.bucket_ts
        LEFT JOIN blocks_sub b ON b.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const socialSeries = await run(socialSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const socialTotals = await run(
        `SELECT
           (SELECT COUNT(*)::int FROM "UserFollows" WHERE "createdAt" BETWEEN :from AND :to) AS follows_total,
           (SELECT COUNT(*)::int FROM "FollowRequests" WHERE "createdAt" BETWEEN :from AND :to) AS follow_requests_total,
           (SELECT COUNT(*)::int FROM "UserBlocks" WHERE "createdAt" BETWEEN :from AND :to) AS blocks_total`,
        { from: named.from, to: named.to }
      );

      const followReqStatus = await run(
        `SELECT status, COUNT(*)::int AS cnt FROM "FollowRequests" WHERE "createdAt" BETWEEN :from AND :to GROUP BY status`,
        { from: named.from, to: named.to }
      );

      const influencers = await run(
        `SELECT u.id, u.username, u.name, COALESCE(f.cnt,0)::int AS followers_count
         FROM "Users" u
         LEFT JOIN (SELECT "otherId" AS uid, COUNT(*)::int AS cnt FROM "UserFollows" GROUP BY "otherId") f ON f.uid = u.id
         ORDER BY followers_count DESC LIMIT 20`
      );

      payload.social = {
        metrics: { totals: socialTotals?.[0] ?? {} },
        series: socialSeries,
        followRequestStatus: (followReqStatus || []).reduce((acc, r) => {
          acc[r.status] = Number(r.cnt || 0);
          return acc;
        }, {}),
        topInfluencers: influencers,
      };
    }

    // ------------------------
    // USER SESSIONS
    // ------------------------
    if (include("userSessions")) {
      const sessSeriesSQL = `
        WITH series AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, gs)) AS bucket_ts,
                 to_char(date_trunc('${dateTrunc}', gs), '${bucketFmt}') AS bucket_key,
                 CASE WHEN '${dateTrunc}' = 'month' THEN to_char(date_trunc('month', gs), 'Mon YYYY') ELSE to_char(date_trunc('day', gs), 'Mon DD') END AS bucket_label
          FROM generate_series(date_trunc('${dateTrunc}', :from::timestamp), date_trunc('${dateTrunc}', :to::timestamp), '1 ${dateTrunc}') gs
        ),
        s_sub AS (
          SELECT date_trunc('${dateTrunc}', timezone(:tz, "startedAt")) AS bucket_ts,
                 COUNT(*)::int AS sessions_count,
                 AVG(COALESCE("duration",0))::numeric AS avg_duration
          FROM "UserSessions"
          WHERE "startedAt" BETWEEN :from AND :to
          GROUP BY 1
        )
        SELECT s.bucket_key, s.bucket_label, s.bucket_ts,
               COALESCE(sx.sessions_count,0) AS sessions_count,
               COALESCE(sx.avg_duration,0) AS avg_duration
        FROM series s
        LEFT JOIN s_sub sx ON sx.bucket_ts = s.bucket_ts
        ORDER BY s.bucket_ts ASC
      `;
      const sessSeries = await run(sessSeriesSQL, {
        tz: named.tz,
        from: named.from,
        to: named.to,
      });

      const sessTotals = await run(
        `SELECT
          (SELECT COUNT(*)::int FROM "UserSessions" WHERE "startedAt" BETWEEN :from AND :to) AS sessions_total,
          (SELECT AVG(COALESCE("duration",0))::numeric FROM "UserSessions" WHERE "startedAt" BETWEEN :from AND :to) AS avg_duration`,
        { from: named.from, to: named.to }
      );

      const peakHourRow = await run(
        `SELECT EXTRACT(HOUR FROM timezone(:tz, "startedAt"))::int AS hour, COUNT(*)::int AS cnt
         FROM "UserSessions"
         WHERE "startedAt" BETWEEN :from AND :to
         GROUP BY 1
         ORDER BY cnt DESC
         LIMIT 1`,
        { tz: named.tz, from: named.from, to: named.to }
      );

      const recentSessions = await run(
        `SELECT id, "userId", "duration", "startedAt", "lastPingAt", "endedAt", "startLat", "startLng", "endLat", "endLng"
         FROM "UserSessions"
         ORDER BY "startedAt" DESC
         LIMIT :limit OFFSET :offset`,
        { limit: named.limit, offset: named.offset }
      );

      payload.userSessions = {
        metrics: { totals: sessTotals?.[0] ?? {} },
        series: sessSeries,
        peakHour: peakHourRow?.[0]?.hour ?? null,
        recent: recentSessions,
      };
    }

    // ------------------------
    // MONTH-WISE YOY (safe)
    // ------------------------
    try {
      const { startMonth, endMonth, prevStartMonth, prevEndMonth } =
        monthWindow(rangeEnd);

      const runMonthYoY = async ({ table, dateCol = "createdAt" }) => {
        const monthYoYSQL = `
          WITH series AS (
            SELECT date_trunc('month', gs)::date AS month_ts
            FROM generate_series(date_trunc('month', :m_from::timestamp), date_trunc('month', :m_to::timestamp), '1 month') gs
          ),
          curr AS (
            SELECT date_trunc('month', timezone(:tz, t."${dateCol}"))::date AS month_ts, COUNT(*)::int AS curr_count
            FROM "${table}" t
            WHERE t."${dateCol}" BETWEEN :m_from AND :m_to
            GROUP BY 1
          ),
          prev AS (
            SELECT date_trunc('month', timezone(:tz, t."${dateCol}"))::date AS month_ts, COUNT(*)::int AS prev_count
            FROM "${table}" t
            WHERE t."${dateCol}" BETWEEN :p_from AND :p_to
            GROUP BY 1
          )
          SELECT to_char(s.month_ts, 'YYYY-MM') AS month_key,
                 to_char(s.month_ts, 'Mon YYYY') AS month_label,
                 COALESCE(c.curr_count, 0) AS curr_count,
                 COALESCE(p.prev_count, 0) AS prev_count
          FROM series s
          LEFT JOIN curr c ON c.month_ts = s.month_ts
          LEFT JOIN prev p ON p.month_ts = (s.month_ts - interval '1 year')::date
          ORDER BY s.month_ts ASC
        `;
        const rows = await run(monthYoYSQL, {
          tz: named.tz,
          m_from: startMonth.toISOString(),
          m_to: endMonth.toISOString(),
          p_from: prevStartMonth.toISOString(),
          p_to: prevEndMonth.toISOString(),
        });
        return rows;
      };

      if (include("posts")) {
        const postMonthYoY = await runMonthYoY({ table: "Posts" });
        payload.monthWise.posts = {
          labels: postMonthYoY.map((r) => r.month_label),
          current: postMonthYoY.map((r) => Number(r.curr_count || 0)),
          previous: postMonthYoY.map((r) => Number(r.prev_count || 0)),
        };
      }
      if (include("reels")) {
        const reelMonthYoY = await runMonthYoY({ table: "Reels" });
        payload.monthWise.reels = {
          labels: reelMonthYoY.map((r) => r.month_label),
          current: reelMonthYoY.map((r) => Number(r.curr_count || 0)),
          previous: reelMonthYoY.map((r) => Number(r.prev_count || 0)),
        };
      }
      if (include("itineraries")) {
        const itinMonthYoY = await runMonthYoY({ table: "Itineraries" });
        payload.monthWise.itineraries = {
          labels: itinMonthYoY.map((r) => r.month_label),
          current: itinMonthYoY.map((r) => Number(r.curr_count || 0)),
          previous: itinMonthYoY.map((r) => Number(r.prev_count || 0)),
        };
      }
      if (include("users")) {
        const userMonthYoY = await runMonthYoY({ table: "Users" });
        payload.monthWise.users = {
          labels: userMonthYoY.map((r) => r.month_label),
          current: userMonthYoY.map((r) => Number(r.curr_count || 0)),
          previous: userMonthYoY.map((r) => Number(r.prev_count || 0)),
        };
      }
    } catch (err) {
      // swallow month YOY errors - keep partial monthWise
    }

    // ------------------------
    // RECENT snapshot + raw series
    // ------------------------
    payload.recent = {
      users: payload.users?.recent ?? [],
      posts: payload.posts?.recent ?? [],
      reels: payload.reels?.recent ?? [],
      memories: payload.memories?.recent ?? [],
      itineraries: payload.itineraries?.recent ?? [],
      messages: payload.directMessages?.recent ?? [],
      notifications: payload.notifications?.recent ?? [],
      aiSessions: payload.aiChats?.recent ?? [],
      sessions: payload.userSessions?.recent ?? [],
    };

    payload.seriesRaw = {
      users: payload.users?.series ?? [],
      posts: payload.posts?.series ?? [],
      reels: payload.reels?.series ?? [],
      itineraries: payload.itineraries?.series ?? [],
      aiChats: payload.aiChats?.series ?? [],
      memories: payload.memories?.series ?? [],
    };

    return payload;
  },
};

export default DashboardService;
