/**
 * Copyright (C) 2025 LatestURL
 *
 * This code is licensed under the MIT License.
 * See the LICENSE file in the repository root for full license text.
 *
 * HIRAGII Bot Database Utilities
 * Version: 1.0.0
 * Created by LatestURL
 * GitHub: https://github.com/latesturl/HIRAGII
 */

import { useMultiFileAuthState } from "@whiskeysockets/baileys"
import { useSqliteState } from "./sqlite-auth.js"
import { useMongoState } from "./mongodb-auth.js"
import fs from "fs"
import path from "path"
import chalk from "chalk"
import { fileURLToPath } from "url"
import moment from "moment-timezone"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get current time for logging
const getTime = () => {
  return moment().format("HH:mm:ss")
}

/**
 * Initialize authentication state based on configuration
 * @param {string} sessionDir - Directory for file-based authentication
 * @returns {Promise<Object>} - Authentication state and saveCreds function
 */
export const initAuthState = async (sessionDir) => {
  try {
    // Get authentication method from config
    const authMethod = globalThis.database?.authMethod || "file"

    console.log(chalk.cyan(`[${getTime()}] Initializing authentication using ${authMethod} method...`))

    let sqliteAuth = null
    if (authMethod === "sqlite") {
      try {
        // Get SQLite configuration
        const dbPath = globalThis.database?.sqlite?.dbPath || path.join(sessionDir, "auth.db")

        // Ensure directory exists
        const dbDir = path.dirname(dbPath)
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true })
        }

        // Initialize SQLite authentication
        sqliteAuth = await useSqliteState(dbPath)
        console.log(chalk.green(`[${getTime()}] SQLite authentication initialized successfully`))
      } catch (error) {
        console.error(chalk.red(`[${getTime()}] Error initializing SQLite authentication:`), error)
        console.log(chalk.yellow(`[${getTime()}] Falling back to file-based authentication`))
      }
    }

    switch (authMethod) {
      case "sqlite":
        if (sqliteAuth) {
          return sqliteAuth
        } else {
          return await useMultiFileAuthState(sessionDir)
        }

      case "mongodb":
        try {
          // Get MongoDB configuration
          const uri = globalThis.database?.mongodb?.uri || "mongodb://localhost:27017/hiragii"

          // Initialize MongoDB authentication
          const mongoAuth = await useMongoState(uri)
          console.log(chalk.green(`[${getTime()}] MongoDB authentication initialized successfully`))
          return mongoAuth
        } catch (error) {
          console.error(chalk.red(`[${getTime()}] Error initializing MongoDB authentication:`), error)
          console.log(chalk.yellow(`[${getTime()}] Falling back to file-based authentication`))
          return await useMultiFileAuthState(sessionDir)
        }

      case "file":
      default:
        // Initialize file-based authentication
        const fileAuth = await useMultiFileAuthState(sessionDir)
        console.log(chalk.green(`[${getTime()}] File-based authentication initialized successfully`))
        return fileAuth
    }
  } catch (error) {
    console.error(chalk.red(`[${getTime()}] Error initializing authentication:`), error)
    console.log(chalk.yellow(`[${getTime()}] Using default file-based authentication`))
    return await useMultiFileAuthState(sessionDir)
  }
}

// Watch for file changes
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(chalk.redBright(`[${getTime()}] Update ${__filename}`))
  import(`file://${__filename}?update=${Date.now()}`).catch(console.error)
})

