/**
 * Example Plugin - Ping
 * Tests the bot's response time
 *
 * @plugin
 * @name ping
 * @category example
 * @description Test bot response time
 * @usage .ping
 */

export default async (ctx) => {
  const { m } = ctx

  const start = new Date().getTime()
  await m.reply("Pinging...")
  const end = new Date().getTime()

  const responseTime = end - start

  m.reply(`🏓 Pong!\nResponse time: ${responseTime}ms`)
}

