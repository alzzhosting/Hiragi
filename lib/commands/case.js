/**
 * Copyright (C) 2025 LatestURL
 *
 * This code is licensed under the MIT License.
 * See the LICENSE file in the repository root for full license text.
 *
 * HIRAGII Bot Handler
 * Version: 1.0.0
 * Created by LatestURL
 * GitHub: https://github.com/latesturl/HIRAGII
 */

import "../settings/config.js"
import fs from "fs"
import util from "util"
import { exec } from "child_process"
import chalk from "chalk"
import path from "path"
import { fileURLToPath } from "url"
import { loadPlugins, getCommands } from "../utils/pluginLoader.js"
import gradient from "gradient-string"
import figlet from "figlet"
import moment from "moment-timezone"
import Table from "cli-table3"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Set timezone to WIB (Jakarta)
moment.tz.setDefault(global.appearance.timezone || "Asia/Jakarta")

// Function to get current time in WIB
const getWIBTime = (format = global.appearance.timeFormat || "HH:mm:ss") => {
  return moment().format(format)
}

// Function to get current date in WIB
const getWIBDate = (format = global.appearance.dateFormat || "DD/MM/YYYY") => {
  return moment().format(format)
}

// Function to get full date and time in WIB
const getWIBDateTime = (format = global.appearance.fullDateFormat || "DD/MM/YYYY HH:mm:ss") => {
  return moment().format(format)
}

// Function to get group admins
const getGroupAdmins = (participants) => {
  const admins = []
  for (const i of participants) {
    if (i.admin === "superadmin" || i.admin === "admin") admins.push(i.id)
  }
  return admins
}

// Create a formatted log table with gradient
const createLogTable = (data) => {
  // Create a new table with custom styling
  const table = new Table({
    chars: {
      top: "═",
      "top-mid": "╤",
      "top-left": "╔",
      "top-right": "╗",
      bottom: "═",
      "bottom-mid": "╧",
      "bottom-left": "╚",
      "bottom-right": "╝",
      left: "║",
      "left-mid": "╟",
      mid: "─",
      "mid-mid": "┼",
      right: "║",
      "right-mid": "╢",
      middle: "│",
    },
    style: {
      head: ["cyan"],
      border: ["grey"],
      compact: true,
    },
  })

  // Add timestamp to data
  const dataWithTime = {
    TIME: getWIBTime(),
    DATE: getWIBDate(),
    ...data,
  }

  // Convert object to array for table
  const rows = []
  for (const [key, value] of Object.entries(dataWithTime)) {
    rows.push([chalk.cyan(key), chalk.white(value)])
  }

  // Add rows to table
  table.push(...rows)

  return table.toString()
}

// Load plugins
let plugins = {}
let commands = {}

// Initialize plugins
const initPlugins = async () => {
  try {
    const startTime = Date.now()
    console.log(chalk.yellow(`[${getWIBTime()}] Loading plugins...`))
    plugins = await loadPlugins()
    commands = getCommands(plugins)
    const loadTime = Date.now() - startTime

    // Create a gradient for the success message
    const successGradient = gradient(global.appearance.theme.gradients.success)
    console.log(
      successGradient(
        `[${getWIBTime()}] Successfully loaded ${Object.keys(commands).length} commands from plugins in ${loadTime}ms`,
      ),
    )

    return Object.keys(commands).length
  } catch (error) {
    // Create a gradient for the error message
    const errorGradient = gradient(global.appearance.theme.gradients.error)
    console.error(errorGradient(`[${getWIBTime()}] Failed to load plugins:`), error)
    return 0
  }
}

// Function to reload plugins
export const reloadPlugins = async () => {
  return await initPlugins()
}

// Bot mode (public or self)
let isPublic = true

export default async (conn, m, chatUpdate, store) => {
  try {
    // Update the body parsing section to be more readable
    var body =
      (m.mtype === "conversation"
        ? m.message?.conversation
        : m.mtype === "imageMessage"
          ? m.message?.imageMessage?.caption
          : m.mtype === "videoMessage"
            ? m.message?.videoMessage?.caption
            : m.mtype === "extendedTextMessage"
              ? m.message?.extendedTextMessage?.text
              : m.mtype === "buttonsResponseMessage"
                ? m.message?.buttonsResponseMessage?.selectedButtonId
                : m.mtype === "listResponseMessage"
                  ? m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
                  : m.mtype === "templateButtonReplyMessage"
                    ? m.message?.templateButtonReplyMessage?.selectedId
                    : m.mtype === "interactiveResponseMessage"
                      ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
                      : m.mtype === "messageContextInfo"
                        ? m.message?.buttonsResponseMessage?.selectedButtonId ||
                          m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                          m.text
                        : "") || ""

    const budy = typeof m.text === "string" ? m.text : ""

    // Handle multi-prefix configuration
    let prefix = global.prefix.main
    let isCmd = false
    let command = ""

    if (global.prefix.multi) {
      // Check if message starts with any of the prefixes
      for (const pfx of global.prefix.list) {
        if (body.startsWith(pfx)) {
          prefix = pfx
          isCmd = true
          command = body.slice(pfx.length).trim().split(" ").shift().toLowerCase()
          break
        }
      }
    } else {
      // Single prefix mode
      isCmd = body.startsWith(prefix)
      command = isCmd ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase() : ""
    }

    const args = body.trim().split(/ +/).slice(1)
    const text = args.join(" ")
    const q = text

    // Add section for quoted message handling
    const fatkuns = m.quoted || m
    const quoted =
      fatkuns.mtype === "buttonsMessage"
        ? fatkuns[Object.keys(fatkuns)[1]]
        : fatkuns.mtype === "templateMessage"
          ? fatkuns.hydratedTemplate[Object.keys(fatkuns.hydratedTemplate)[1]]
          : fatkuns.mtype === "product"
            ? fatkuns[Object.keys(fatkuns)[0]]
            : m.quoted
              ? m.quoted
              : m
    const mime = (quoted.msg || quoted).mimetype || ""
    const qmsg = quoted.msg || quoted
    const isMedia = /image|video|sticker|audio/.test(mime)

    //================= { USER } =================\\
    const botNumber = await conn.decodeJid(conn.user.id)

    // Get owner numbers from config
    const ownerNumbers = global.owner.map((o) => o.number + "@s.whatsapp.net")

    const sender = m.key.fromMe
      ? conn.user.id.split(":")[0] + "@s.whatsapp.net" || conn.user.id
      : m.key.participant || m.key.remoteJid
    const senderNumber = sender.split("@")[0]

    // Check if sender is an owner
    const isOwner = ownerNumbers.includes(sender)

    // Check if sender is a developer
    const isDev = global.owner.some((o) => o.number === senderNumber && o.isDev)

    const itsMe = m.sender === botNumber ? true : false
    const isCreator = [botNumber, ...ownerNumbers].includes(m.sender)
    const pushname = m.pushName || `${senderNumber}`
    const isBot = botNumber.includes(senderNumber)

    //================= { GROUP } =================\\
    const isGroup = m.isGroup
    const groupMetadata = isGroup ? await conn.groupMetadata(m.chat).catch(() => null) : null
    const groupName = groupMetadata?.subject || ""
    const participants = isGroup ? groupMetadata?.participants || [] : []
    const groupAdmins = isGroup ? await getGroupAdmins(participants) : ""
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false
    const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false
    const groupOwner = isGroup ? groupMetadata?.owner : ""
    const isGroupOwner = isGroup ? (groupOwner ? groupOwner : groupAdmins).includes(m.sender) : false

    // Check if bot should respond based on mode (public or self)
    const shouldRespond = isPublic || isCreator || m.key.fromMe

    // If in self mode and not from owner, don't process the message
    if (!shouldRespond) return

    // Console logging with improved formatting using figlet
    if (m.message && isCmd) {
      // Create figlet text for command
      figlet.text(
        command.toUpperCase(),
        {
          font: "ANSI Shadow",
          horizontalLayout: "default",
          verticalLayout: "default",
          width: 80,
          whitespaceBreak: true,
        },
        (err, data) => {
          if (err) {
            console.log("Something went wrong with figlet")
            console.dir(err)
            return
          }

          // Apply gradient to figlet output
          const purpleGradient = gradient(global.appearance.theme.gradient)
          console.log(purpleGradient(data))

          // Log additional information in a table
          const logData = {
            SENDER: pushname || "Unknown",
            JID: m.sender,
            ...(isGroup && { GROUP: groupName || "Unknown" }),
            COMMAND: `${prefix}${command}`,
            MODE: isPublic ? "PUBLIC" : "SELF",
            TIMESTAMP: getWIBDateTime(),
          }

          console.log(createLogTable(logData))
        },
      )
    }

    //================= { COMMAND HANDLER } =================\\
    // Create context object for plugins
    const ctx = {
      conn,
      m,
      chatUpdate,
      store,
      body,
      budy,
      prefix,
      command,
      args,
      text,
      q,
      quoted,
      mime,
      qmsg,
      isMedia,
      sender,
      senderNumber,
      botNumber,
      isOwner,
      isDev,
      isCreator,
      itsMe,
      isBot,
      pushname,
      isGroup,
      groupMetadata,
      groupName,
      participants,
      groupAdmins,
      isBotAdmins,
      isAdmins,
      isGroupOwner,
      groupOwner,
      botName: global.botName,
      ownerName: global.ownerName,
      isPublic,
      // Add time utilities to context
      time: {
        now: () => getWIBTime(),
        date: () => getWIBDate(),
        datetime: () => getWIBDateTime(),
        moment: moment,
      },
    }

    // Check if command exists in plugins
    if (isCmd && commands[command]) {
      try {
        // Get plugin metadata and handler
        const { category, handler, metadata } = commands[command]

        // Check if command is owner-only
        if (metadata && metadata.owner && !isCreator) {
          // Silently ignore if owner-only command is used by non-owner
          console.log(chalk.yellow(`[${getWIBTime()}] [PLUGIN] Owner-only command ${command} attempted by non-owner`))
          return
        }

        // Execute the plugin handler
        await handler(ctx)

        // Log command execution
        console.log(chalk.green(`[${getWIBTime()}] [PLUGIN] Executed ${category}/${command}`))
      } catch (error) {
        console.error(chalk.red(`[${getWIBTime()}] [PLUGIN] Error executing ${command}:`), error)
        m.reply(`Error executing command: ${error.message}`)
      }
      return
    }

    //================= { BUILT-IN COMMANDS } =================\\
    switch (command) {
      case "self": {
        // Only allow owner to change mode
        if (!isCreator) return

        if (!isPublic) return m.reply(`Bot is already in self mode!`)

        isPublic = false
        m.reply(`Bot switched to *SELF MODE*. Only the owner can use commands.`)
        break
      }

      case "public": {
        // Only allow owner to change mode
        if (!isCreator) return

        if (isPublic) return m.reply(`Bot is already in public mode!`)

        isPublic = true
        m.reply(`Bot switched to *PUBLIC MODE*. Everyone can use commands.`)
        break
      }

      //================= { OWNER COMMANDS } =================\\
      default: {
        // Eval command for owner (=>)
        if (budy.startsWith("=>")) {
          if (!isCreator) return
          function Return(sul) {
            const sat = JSON.stringify(sul, null, 2)
            let bang = util.format(sat)
            if (sat == undefined) bang = util.format(sul)
            return m.reply(bang)
          }
          try {
            m.reply(util.format(eval(`(async () => { return ${budy.slice(3)} })()`)))
          } catch (e) {
            m.reply(String(e))
          }
        }

        // Eval command for owner (>)
        if (budy.startsWith(">")) {
          if (!isCreator) return
          try {
            let evaled = eval(budy.slice(2))
            if (typeof evaled !== "string") evaled = util.inspect(evaled)
            m.reply(evaled)
          } catch (err) {
            m.reply(String(err))
          }
        }

        // Terminal command for owner ($)
        if (budy.startsWith("$")) {
          if (!isCreator) return
          exec(budy.slice(2), (err, stdout) => {
            if (err) return m.reply(`${err}`)
            if (stdout) return m.reply(stdout)
          })
        }

        // If command not found and has prefix, silently ignore
        if (isCmd) {
          // Command doesn't exist, do nothing
          console.log(chalk.yellow(`[${getWIBTime()}] Unknown command: ${command} from ${pushname}`))
        }
      }
    }
  } catch (err) {
    console.log(util.format(err))
  }
}

//================= { FILE WATCHER } =================\\
// Watch for file changes
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`[${getWIBTime()}] Update ${__filename}`))
  import(`file://${__filename}?update=${Date.now()}`).catch(console.error)
})

