require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");

const {
  initDB,
  saveApplication,
  addWarning,
  getWarnings,
  removeWarning,
  clearWarnings,
  getStats,
  addShift,
  getShifts,
  removeShift,
} = require("./db");
const { getShuffledQuestions } = require("./questions");

// ─── Client Setup ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ["CHANNEL"],
});

const cooldowns = new Collection(); // userId -> timestamp
const activeSessions = new Collection(); // userId -> true

// ─── Slash Command Registration ───────────────────────────────────────────────
async function registerCommands() {
  const commands = [
    // /apply
    new SlashCommandBuilder()
      .setName("apply")
      .setDescription("Apply for a role in this server")
      .toJSON(),

    // /warn <user> <reason>
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warn a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) =>
        o
          .setName("user")
          .setDescription("The member to warn")
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("reason")
          .setDescription("Reason for the warning")
          .setRequired(true),
      )
      .toJSON(),

    // /warnings <user>
    new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("View all warnings for a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) =>
        o
          .setName("user")
          .setDescription("The member to look up")
          .setRequired(true),
      )
      .toJSON(),

    // /clearwarns <user> [warn_id]
    new SlashCommandBuilder()
      .setName("clearwarns")
      .setDescription("Remove a specific warning or all warnings from a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) =>
        o.setName("user").setDescription("The member").setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName("warn_id")
          .setDescription("Warning ID to remove (leave empty to clear ALL)")
          .setRequired(false),
      )
      .toJSON(),

    // /stats
    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("View application statistics")
      .toJSON(),

    // /shift add <time> <start_time>
    new SlashCommandBuilder()
      .setName("shift")
      .setDescription("Manage shifts")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription("Add a new shift")
          .addStringOption((o) =>
            o
              .setName("time")
              .setDescription("Shift time (e.g., 10:00-18:00)")
              .setRequired(true),
          )
          .addStringOption((o) =>
            o
              .setName("start_time")
              .setDescription("Shift start time (e.g., 09:45)")
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("list").setDescription("List all shifts"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription("Remove a shift")
          .addIntegerOption((o) =>
            o
              .setName("id")
              .setDescription("Shift ID to remove")
              .setRequired(true),
          ),
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
  try {
    console.log("📡 Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
}

// ─── Warn threshold auto-actions ─────────────────────────────────────────────
// Configure in .env: WARN_MUTE_AT=3, WARN_KICK_AT=5, WARN_BAN_AT=7
const WARN_MUTE_AT = parseInt(process.env.WARN_MUTE_AT) || 3;
const WARN_KICK_AT = parseInt(process.env.WARN_KICK_AT) || 5;
const WARN_BAN_AT = parseInt(process.env.WARN_BAN_AT) || 7;
const MUTE_DURATION_MS = 10 * 60 * 1000; // 10 minutes per mute threshold

// ─── Embed Builders ───────────────────────────────────────────────────────────
function buildQuestionEmbed(question, index, total) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Question ${index + 1} of ${total}`)
    .setDescription(`**${question.question}**`)
    .addFields(
      {
        name: ":regional_indicator_a:",
        value: question.options.A,
        inline: true,
      },
      {
        name: ":regional_indicator_b:",
        value: question.options.B,
        inline: true,
      },
      {
        name: ":regional_indicator_c:",
        value: question.options.C,
        inline: true,
      },
      {
        name: ":regional_indicator_d:",
        value: question.options.D,
        inline: true,
      },
    )
    .setFooter({ text: "Click a button below to answer" })
    .setTimestamp();
}

function buildAnswerButtons(questionId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    ["A", "B", "C", "D"].map((letter) =>
      new ButtonBuilder()
        .setCustomId(`answer_${questionId}_${letter}`)
        .setLabel(letter)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    ),
  );
}

function buildResultEmbed(user, score, total, accepted) {
  const pct = Math.round((score / total) * 100);
  return new EmbedBuilder()
    .setColor(accepted ? 0x57f287 : 0xed4245)
    .setTitle(accepted ? "🎉 Application Accepted!" : "❌ Application Rejected")
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      accepted
        ? `Congratulations **${user.username}**! You passed the quiz and can now get your Roblox group role.`
        : `Sorry **${user.username}**, you did not meet the minimum score requirement.`,
    )
    .addFields(
      { name: "Score", value: `${score} / ${total} (${pct}%)`, inline: true },
      { name: "Required", value: "70%", inline: true },
      {
        name: "Status",
        value: accepted ? "✅ Accepted" : "❌ Rejected",
        inline: true,
      },
    )
    .setFooter({ text: "Ibeka Store Services" })
    .setTimestamp();
}

function buildLogEmbed(user, score, total, accepted) {
  const pct = Math.round((score / total) * 100);
  return new EmbedBuilder()
    .setColor(accepted ? 0x57f287 : 0xed4245)
    .setAuthor({
      name: `Application — ${user.tag}`,
      iconURL: user.displayAvatarURL(),
    })
    .setTitle(accepted ? "✅ Application Accepted" : "❌ Application Rejected")
    .addFields(
      { name: "User", value: `<@${user.id}> (${user.id})`, inline: true },
      { name: "Score", value: `${score}/${total} — ${pct}%`, inline: true },
      {
        name: "Result",
        value: accepted ? "ACCEPTED" : "REJECTED",
        inline: true,
      },
    )
    .setTimestamp();
}

// ─── /warn handler ────────────────────────────────────────────────────────────
async function handleWarn(interaction) {
  const target = interaction.options.getMember("user");
  const reason = interaction.options.getString("reason");
  const mod = interaction.member;

  if (!target) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription("❌ Member not found in this server."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Cannot warn bots or higher roles
  if (target.user.bot) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription("❌ You cannot warn a bot."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const { id: warnId, totalWarnings } = await addWarning({
    userId: target.id,
    username: target.user.tag,
    moderatorId: mod.id,
    modUsername: mod.user.tag,
    reason,
  });

  // ── Determine auto-action ──────────────────────────────────────────────────
  let autoAction = null;
  try {
    if (totalWarnings >= WARN_BAN_AT) {
      await target.ban({ reason: `Auto-ban: reached ${WARN_BAN_AT} warnings` });
      autoAction = `🔨 Auto-banned (${WARN_BAN_AT} warnings reached)`;
    } else if (totalWarnings >= WARN_KICK_AT) {
      await target.kick(`Auto-kick: reached ${WARN_KICK_AT} warnings`);
      autoAction = `👢 Auto-kicked (${WARN_KICK_AT} warnings reached)`;
    } else if (totalWarnings >= WARN_MUTE_AT) {
      await target.timeout(
        MUTE_DURATION_MS,
        `Auto-mute: reached ${WARN_MUTE_AT} warnings`,
      );
      autoAction = `🔇 Auto-muted 10 min (${WARN_MUTE_AT} warnings reached)`;
    }
  } catch (err) {
    console.error("Auto-action error:", err);
    autoAction = "⚠️ Auto-action failed (check bot permissions/hierarchy)";
  }

  // ── Warn embed for channel ─────────────────────────────────────────────────
  const warnEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⚠️ Member Warned")
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      {
        name: "Member",
        value: `<@${target.id}> (${target.user.tag})`,
        inline: true,
      },
      { name: "Moderator", value: `<@${mod.id}>`, inline: true },
      { name: "Warning #", value: `${totalWarnings}`, inline: true },
      { name: "Reason", value: reason },
      { name: "Warn ID", value: `\`#${warnId}\``, inline: true },
    )
    .setTimestamp();

  if (autoAction)
    warnEmbed.addFields({ name: "Auto Action", value: autoAction });

  await interaction.reply({ embeds: [warnEmbed] });

  // ── DM the warned user ─────────────────────────────────────────────────────
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`⚠️ You received a warning in **${interaction.guild.name}**`)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Warning #", value: `${totalWarnings}`, inline: true },
        { name: "Warn ID", value: `\`#${warnId}\``, inline: true },
      )
      .setFooter({ text: "Please follow the server rules." })
      .setTimestamp();
    if (autoAction)
      dmEmbed.addFields({ name: "Action Taken", value: autoAction });
    await target.user.send({ embeds: [dmEmbed] });
  } catch {
    // DMs closed — not critical
  }

  // ── Log to staff channel ───────────────────────────────────────────────────
  if (process.env.LOG_CHANNEL_ID) {
    try {
      const logCh = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
      await logCh.send({ embeds: [warnEmbed] });
    } catch {}
  }
}

// ─── /warnings handler ────────────────────────────────────────────────────────
async function handleWarnings(interaction) {
  const target = interaction.options.getUser("user");
  const warns = await getWarnings(target.id);

  if (warns.length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`✅ **${target.tag}** has no warnings.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const list = warns
    .map(
      (w, i) =>
        `**#${w.id}** — ${w.reason}\n> Mod: <@${w.moderator_id}> • <t:${Math.floor(new Date(w.warned_at).getTime() / 1000)}:R>`,
    )
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle(`⚠️ Warnings — ${target.tag}`)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(list)
    .addFields({
      name: "Total Warnings",
      value: `${warns.length}`,
      inline: true,
    })
    .setFooter({ text: "Use /clearwarns to remove a warning" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ─── /clearwarns handler ─────────────────────────────────────────────────────
async function handleClearWarns(interaction) {
  const target = interaction.options.getUser("user");
  const warnId = interaction.options.getInteger("warn_id");

  if (warnId) {
    // Remove single warning
    const removed = await removeWarning(warnId);
    if (!removed) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ No warning found with ID \`#${warnId}\`.`),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (removed.user_id !== target.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              `❌ Warning \`#${warnId}\` does not belong to that user.`,
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("🗑️ Warning Removed")
          .addFields(
            { name: "User", value: `<@${target.id}>`, inline: true },
            { name: "Warn ID", value: `\`#${warnId}\``, inline: true },
            { name: "Reason that was removed", value: removed.reason },
          )
          .setTimestamp(),
      ],
    });
  }

  // Clear ALL warnings
  const count = await clearWarnings(target.id);
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🗑️ All Warnings Cleared")
        .setDescription(`Removed **${count}** warning(s) from <@${target.id}>.`)
        .setTimestamp(),
    ],
  });
}

// ─── /stats handler ───────────────────────────────────────────────────────────
async function handleStats(interaction) {
  const stats = await getStats();
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 Application Statistics")
    .setDescription("Statistics for all applications submitted.")
    .addFields(
      {
        name: "Total Applications",
        value: `${stats.total || 0}`,
        inline: true,
      },
      { name: "Accepted", value: `${stats.accepted || 0}`, inline: true },
      { name: "Rejected", value: `${stats.rejected || 0}`, inline: true },
      { name: "Average Score", value: `${stats.avg_pct || 0}%`, inline: true },
    )
    .setFooter({ text: "Ibeka Store Services" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ─── /shift handler ───────────────────────────────────────────────────────────
async function handleShift(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    const time = interaction.options.getString("time");
    const startTime = interaction.options.getString("start_time");

    const id = await addShift({ time, startTime });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅ Shift Added")
          .addFields(
            { name: "Shift ID", value: `${id}`, inline: true },
            { name: "Time", value: time, inline: true },
            { name: "Start Time", value: startTime, inline: true },
          )
          .setFooter({ text: "Ibeka Store Services" })
          .setTimestamp(),
      ],
    });

    // Post to shift channel
    if (process.env.SHIFT_CHANNEL_ID) {
      try {
        const shiftChannel = await client.channels.fetch(
          process.env.SHIFT_CHANNEL_ID,
        );
        const shiftEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🔔 New Shift Scheduled")
          .setDescription(
            `A new shift has been added to the schedule.\n\n**Shift Details:**\n• **Time:** ${time}\n• **Start Time:** ${startTime}\n• **ID:** ${id}\n\n**How Shifts Work:**\n• Arrive at the start time to prepare.\n• Be ready for your shift at the scheduled time.\n• Follow all store policies during your shift.\n• Report any issues to management immediately.\n\nThank you for your dedication to Ibeka Store Services!`,
          )
          .setFooter({ text: "Ibeka Store Services" })
          .setTimestamp();
        await shiftChannel.send({ embeds: [shiftEmbed] });
      } catch (err) {
        console.error("Failed to post shift:", err);
      }
    }
  } else if (subcommand === "list") {
    const shifts = await getShifts();
    if (shifts.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription("No shifts scheduled."),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const list = shifts
      .map((s) => `**ID ${s.id}** — ${s.time} (Start: ${s.start_time})`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📅 Scheduled Shifts")
      .setDescription(list)
      .setFooter({ text: "Ibeka Store Services" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } else if (subcommand === "remove") {
    const id = interaction.options.getInteger("id");
    const removed = await removeShift(id);
    if (!removed) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ No shift found with ID \`${id}\`.`),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("🗑️ Shift Removed")
          .setDescription(`Shift ID \`${id}\` has been removed.`)
          .setFooter({ text: "Ibeka Store Services" })
          .setTimestamp(),
      ],
    });
  }
}

// ─── Quiz Runner ──────────────────────────────────────────────────────────────
async function runQuiz(interaction) {
  const user = interaction.user;
  const userId = user.id;

  const COOLDOWN_MS = 60 * 60 * 1000;
  if (cooldowns.has(userId)) {
    const remaining = COOLDOWN_MS - (Date.now() - cooldowns.get(userId));
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle("⏳ Cooldown Active")
            .setDescription(
              `Please wait **${mins} minute(s)** before applying again.`,
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (activeSessions.has(userId)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("⚠️ Session Active")
          .setDescription("You already have an active quiz in your DMs."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📬 Application Started")
        .setDescription("Check your **Direct Messages**!"),
    ],
    flags: MessageFlags.Ephemeral,
  });

  let dm;
  try {
    dm = await user.createDM();
  } catch {
    return;
  }

  activeSessions.set(userId, true);
  cooldowns.set(userId, Date.now());

  const questions = getShuffledQuestions();
  let score = 0;

  await dm.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("👋 Welcome to the Application Quiz")
        .setDescription(
          `Hello **${user.username}**!\n\nYou will be asked **${questions.length} questions**.\nYou need **70% or higher** to be accepted.\n\n*Answer by clicking the buttons.*`,
        )
        .setFooter({ text: "Ibeka Store Services" }),
    ],
  });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const row = buildAnswerButtons(`q${i}`);
    let qMessage;
    try {
      qMessage = await dm.send({
        embeds: [buildQuestionEmbed(q, i, questions.length)],
        components: [row],
      });
    } catch (err) {
      console.error("Failed to send question:", err);
      activeSessions.delete(userId);
      return;
    }

    let collected;
    try {
      collected = await qMessage.awaitMessageComponent({
        filter: (btn) =>
          btn.user.id === userId && btn.customId.startsWith(`answer_q${i}_`),
        time: 60_000,
      });
    } catch {
      await dm.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("⏱️ Time Expired")
            .setDescription("Application cancelled due to inactivity."),
        ],
      });
      await qMessage.edit({ components: [buildAnswerButtons(`q${i}`, true)] });
      activeSessions.delete(userId);
      return;
    }

    const chosen = collected.customId.split("_")[2];
    const correct = chosen === q.answer;
    if (correct) score++;

    await collected.update({
      embeds: [
        buildQuestionEmbed(q, i, questions.length),
        new EmbedBuilder()
          .setColor(correct ? 0x57f287 : 0xed4245)
          .setDescription(
            correct
              ? `✅ Correct! The answer was **${q.answer}**.`
              : `❌ Incorrect. Correct answer: **${q.answer}** — ${q.options[q.answer]}`,
          ),
      ],
      components: [buildAnswerButtons(`q${i}`, true)],
    });

    if (i < questions.length - 1) await sleep(1200);
  }

  const total = questions.length;
  const pct = (score / total) * 100;
  const accepted = pct >= 70;

  await dm.send({ embeds: [buildResultEmbed(user, score, total, accepted)] });

  try {
    await saveApplication({
      userId,
      username: user.tag,
      score,
      total,
      accepted,
    });
  } catch {}

  if (accepted) {
    // Attempt automatic Roblox group rank assignment using Roblox API with cookie
    try {
      const robloxGroupId = process.env.ROBLOX_GROUP_ID;
      const robloxCookie = process.env.ROBLOX_COOKIE;
      const rankId = process.env.BLOXLINK_RANK_ID; // Reuse the rank ID

      if (!robloxGroupId || !robloxCookie || !rankId) {
        throw new Error("Roblox group ID, cookie, or rank ID not configured");
      }

      // First, get Roblox user ID from Discord ID using Bloxlink public API
      const bloxlinkResponse = await fetch(
        `https://api.blox.link/v1/user/${userId}`,
      );
      if (!bloxlinkResponse.ok) {
        throw new Error("Failed to get Roblox ID from Bloxlink");
      }
      const bloxlinkData = await bloxlinkResponse.json();
      const robloxUserId = bloxlinkData.robloxId;
      if (!robloxUserId) {
        throw new Error("User has no linked Roblox account");
      }

      // Now, set the rank using Roblox API
      const robloxResponse = await fetch(
        `https://groups.roblox.com/v1/groups/${robloxGroupId}/users/${robloxUserId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: `.ROBLOSECURITY=${robloxCookie}`,
          },
          body: JSON.stringify({ roleId: rankId }),
        },
      );

      if (robloxResponse.ok) {
        // Success! Rank was assigned
        await dm.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("🎮 Roblox Group Rank Assigned")
              .setDescription(
                "**Congratulations!** You have been accepted and your Roblox group rank has been automatically updated!\n\nYou should now have access to the group. If you don't see it yet, try leaving and rejoining the Roblox group.",
              )
              .setFooter({ text: "Welcome to the group!" })
              .setTimestamp(),
          ],
        });
      } else {
        // API call failed, fallback to manual instructions
        const errorText = await robloxResponse.text();
        console.error("Roblox API error:", errorText);

        await dm.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle("🎮 Roblox Group Rank")
              .setDescription(
                "**Congratulations!** You have been accepted.\n\nPlease contact management to receive your Roblox group rank update.\n\n*Make sure your Roblox account is linked to Bloxlink!*",
              )
              .setFooter({ text: "Contact management for rank update" })
              .setTimestamp(),
          ],
        });
      }
    } catch (err) {
      console.error("Roblox assignment error:", err);
      // Fallback: send manual instructions
      try {
        await dm.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle("🎮 Roblox Group Rank")
              .setDescription(
                "**Congratulations!** You have been accepted.\n\nPlease contact management to receive your Roblox group rank update.\n\n*Make sure your Roblox account is linked to Bloxlink!*",
              )
              .setFooter({ text: "Contact management for rank update" })
              .setTimestamp(),
          ],
        });
      } catch (fallbackErr) {
        console.error("Failed to send fallback message:", fallbackErr);
      }
    }
  }

  if (process.env.LOG_CHANNEL_ID) {
    try {
      const logChannel = await client.channels.fetch(
        process.env.LOG_CHANNEL_ID,
      );
      await logChannel.send({
        embeds: [buildLogEmbed(user, score, total, accepted)],
      });
    } catch {}
  }

  activeSessions.delete(userId);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await initDB();
  await registerCommands();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "apply":
        return await runQuiz(interaction);
      case "warn":
        return await handleWarn(interaction);
      case "warnings":
        return await handleWarnings(interaction);
      case "clearwarns":
        return await handleClearWarns(interaction);
      case "stats":
        return await handleStats(interaction);
      case "shift":
        return await handleShift(interaction);
    }
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const errEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("⚠️ Error")
      .setDescription("Something went wrong. Please try again.");
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          embeds: [errEmbed],
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          embeds: [errEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {}
  }
});

client.on("error", (err) => console.error("Client error:", err));
process.on("unhandledRejection", (err) =>
  console.error("Unhandled rejection:", err),
);

client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
