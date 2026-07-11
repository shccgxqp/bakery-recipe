/* GET/POST /api/admin/users — 站長專用的使用者管理(role:"owner" 才能用)
   GET  → { ok, users: [{ _id, email, displayName, role, suspended, createdAt,
            counts: { recipes, ingredients, molds } }] }
   POST body: { userId, role } 或 { userId, suspended }
   政策邊界:這支只動 users 表(角色/停用),完全不碰使用者的食譜/材料/模具
   內容(見 docs/roadmap.md 第 2 項 phase 4 權限模型)。
   防呆:不能改自己的角色/停用自己(避免把唯一的站長鎖在門外)。 */

import { getDb, cors, readBody } from '../_lib/mongo.js'
import { resolveCallerChecked } from '../_lib/auth.js'

const ROLES = ['user', 'trusted', 'owner']

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  }

  try {
    const db = await getDb()
    const caller = await resolveCallerChecked(req, db)
    if (!caller) return res.status(401).json({ ok: false, error: '尚未登入' })
    if (caller.kind !== 'owner') return res.status(403).json({ ok: false, error: '只有站長能管理使用者' })
    const col = db.collection('users')

    if (req.method === 'GET') {
      const [users, recipeCounts, ingCounts, moldCounts] = await Promise.all([
        col.find({}, { projection: { passwordHash: 0, failedAttempts: 0, lockedUntil: 0, googleSub: 0 } })
          .sort({ createdAt: 1 }).toArray(),
        db.collection('recipes').aggregate([
          { $match: { deletedAt: null } },
          { $group: { _id: '$ownerId', n: { $sum: 1 } } },
        ]).toArray(),
        db.collection('ingredients').aggregate([
          { $match: { deletedAt: null } },
          { $group: { _id: '$createdBy', n: { $sum: 1 } } },
        ]).toArray(),
        db.collection('molds').aggregate([
          { $match: { deletedAt: null } },
          { $group: { _id: '$createdBy', n: { $sum: 1 } } },
        ]).toArray(),
      ])
      const countOf = (rows, key) => rows.find(r => r._id === key)?.n || 0
      return res.status(200).json({
        ok: true,
        users: users.map(u => ({
          _id: u._id,
          email: u.email,
          displayName: u.displayName || '',
          role: u.role || 'user',
          suspended: !!u.suspended,
          createdAt: u.createdAt,
          counts: {
            recipes: countOf(recipeCounts, u.email),
            ingredients: countOf(ingCounts, u.email),
            molds: countOf(moldCounts, u.email),
          },
        })),
      })
    }

    /* POST:改角色 / 停用 */
    const body = readBody(req)
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const target = userId && await col.findOne({ _id: userId })
    if (!target) return res.status(404).json({ ok: false, error: '找不到這個使用者' })
    if (target.email === caller.id) {
      return res.status(400).json({ ok: false, error: '不能改自己的角色或停用自己(避免把站長鎖在門外)' })
    }

    const patch = { updatedAt: new Date().toISOString() }
    if ('role' in body) {
      if (!ROLES.includes(body.role)) return res.status(400).json({ ok: false, error: '無效的角色' })
      patch.role = body.role
    }
    if ('suspended' in body) patch.suspended = !!body.suspended
    if (!('role' in patch) && !('suspended' in patch)) {
      return res.status(400).json({ ok: false, error: '沒有要更新的欄位' })
    }
    await col.updateOne({ _id: target._id }, { $set: patch })
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
