import { Version } from '#components'
import * as request from './request.js'
import moment from 'moment'
import { Bot, logger } from '#lib'

export { request }

const steamIdOffset = 76561197960265728n

/**
 * 将好友码或steamID转换成steamID
 * @param {string} id 好友码或steamID
 * @returns {string} steamID
 */
export function getSteamId (id) {
  if (!id) {
    return false
  }
  id = BigInt(id)
  if (id < steamIdOffset) {
    id = id + steamIdOffset
  }
  return id.toString()
}

/**
 * 将steamID转换成好友码
 * @param {string} steamId
 * @returns {string}
 */
export function getFriendCode (steamId) {
  if (!steamId) {
    return false
  }
  steamId = BigInt(steamId)
  return (steamId - steamIdOffset).toString()
}

/**
 * 将对应时间转换成时长字符串
 * @param {number} inp
 * @param {'year' | 'years' | 'y' |'month' | 'months' | 'M' |'week' | 'weeks' | 'w' |'day' | 'days' | 'd' 'hour' | 'hours' | 'h' | 'minute' | 'minutes' | 'm' | 'second' | 'seconds' | 's' | 'millisecond' | 'milliseconds' | 'ms' | 'quarter' | 'quarters' | 'Q'} unit
 * @returns {string}
 */
export function formatDuration (inp, unit = 'seconds') {
  const duration = moment.duration(inp, unit)

  const days = duration.days()
  const hours = duration.hours()
  const minutes = duration.minutes()
  // const secs = duration.seconds()

  let formatted = ''
  if (days > 0)formatted += `${days}天`
  if (hours > 0) formatted += `${hours}小时`
  if (minutes > 0) formatted += `${minutes}分钟`
  // if (secs > 0 || formatted === '') formatted += `${secs}秒`

  return formatted.trim()
}

/**
 * 获取用户名
 * @param {string} botId
 * @param {string} uid
 * @param {string?} gid
 */
export async function getUserName (botId, uid, gid) {
  try {
    if (Version.BotName === 'Karin') {
      if (gid) {
        const bot = Bot.getBot(botId)
        const info = await bot.GetGroupMemberInfo(gid, uid)
        return info.card || info.nick || info.uid || uid
      } else {
        return uid
      }
    } else {
      uid = Number(uid) || uid
      if (gid) {
        gid = Number(gid) || gid
        const group = Bot[botId].pickGroup(gid)
        const member = await group.pickMember(uid)
        const info = await member.getInfo?.() || member.info || {}
        return info.card || info.nickname || info.user_id || uid
      } else {
        const user = Bot[botId].pickFriend(uid)
        const info = await user.getInfo?.() || user.info || {}
        return info.nickname || info.user_id || uid
      }
    }
  } catch {
    return uid
  }
}

/**
 * 获取用户头像
 * @param {string} botId
 * @param {string} uid
 * @param {string?} gid
 * @returns {Promise<string>}
 */
export async function getUserAvatar (botId, uid, gid) {
  try {
    if (Version.BotName === 'Karin') {
      const bot = Bot.getBot(botId)
      const avatarUrl = await bot.getAvatarUrl(uid)
      return avatarUrl || await bot.getAvatarUrl(botId) || ''
    } else {
      uid = Number(uid) || uid
      if (gid) {
        gid = Number(gid) || gid
        const group = Bot[botId].pickGroup(gid)
        const avatarUrl = (await group.pickMember(uid)).getAvatarUrl()
        return avatarUrl || Bot[botId].avatar
      } else {
        const user = Bot[botId].pickUser(uid)
        const avatarUrl = await user.getAvatarUrl()
        return avatarUrl || Bot[botId].avatar || ''
      }
    }
  } catch {
    return ''
  }
}

/**
 * 获取某个群的群成员列表
 * @param {string} botId
 * @param {string} groupId
 * @returns {Promise<string[]>}
 */
export async function getGroupMemberList (botId, groupId) {
  const result = []
  try {
    if (Version.BotName === 'Karin') {
      const memberList = await Bot.getBot(botId).GetGroupMemberList(groupId)
      result.push(...memberList.map(i => i.uid))
    } else {
      const memberMap = await Bot[botId].pickGroup(groupId).getMemberMap()
      result.push(...memberMap.keys())
    }
  } catch { }
  return result
}

/**
 * 获取at的id,没有则返回用户id
 * @param {string|string[]} at
 * @param {string} id
 * @returns {string}
 */
export function getAtUid (at, id) {
  if (Version.BotName === 'Karin') {
    if (typeof at === 'string') {
      return at
    }
    if (at.length) {
      return at.pop()
    } else {
      return id
    }
  } else {
    return at || id
  }
}

/**
 * 主动发送群消息
 * @param {string} botId
 * @param {string} gid
 * @param {any} msg
 * @returns {Promise<any>}
 */
export async function sendGroupMsg (botId, gid, msg) {
  if (Version.BotName === 'Karin') {
    return await Bot.sendMsg(botId, { scene: 'group', peer: gid }, msg)
  } else {
    gid = Number(gid) || gid
    return await Bot[botId].pickGroup(gid).sendMsg(msg)
  }
}

/**
 * 获取appid对应的header图片url
 * @param {string} appid
 * @returns {string}
 */
export function getHeaderImgUrlByAppid (appid) {
  if (!appid) return ''
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`
}

/**
 * 获取图片buffer
 * @param {string} url
 * @returns {Promise<Buffer|null|string>}
 */
export async function getImgUrlBuffer (url) {
  if (!url) return null
  for (let i = 0; i < 3; i++) {
    try {
      const buffer = await request.get(url, { responseType: 'arraybuffer', baseUrl: '' }).then(res => res.data)
      if (Version.BotName === 'Karin') {
        return `base64://${buffer.toString('base64')}`
      } else {
        return buffer
      }
    } catch (error) {
      logger.error(`获取图片${url}失败: ${error.message}, 第${i + 1}次重试`)
    }
  }
  return null
}

/**
 * 将用户状态码转换为中文
 * @param {number} state
 * @returns {string}
 */
export function getPersonaState (state) {
  const stateMap = {
    0: '离线',
    1: '在线',
    3: '离开',
    4: '离开'
  }
  return stateMap[state] || '其他'
}
