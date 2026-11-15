/**
 * Pure-mode message filter (host side).
 *
 * Plugins such as `dsh-mnemon` inject *user-role messages* (memory snapshots,
 * "instructions", skill catalogs, time context, runtime reminders…). They bypass
 * the system prompt, so an empty persona/tool set cannot remove them. They also
 * register their per-agent `agent/pre-step` injector at Agent creation, which
 * makes a preset-scope listener run *inside* theirs and thus unable to strip
 * what they append afterwards.
 *
 * To beat that ordering without depending on load order, this host plugin —
 * which runs for every Agent but acts only on the `pure` preset — installs an
 * outermost `agent/pre-step` filter lazily during `system-prompt/assemble`. That
 * event fires right before `agent/pre-step` on every step and, crucially, after
 * the injectors have already registered their own listeners. Prepending here
 * makes this filter the outermost wrapper, so it can drop every user message
 * whose `source.kind` is not `'user'` (the real user input), leaving only the
 * user and assistant conversation.
 *
 * @module @local/dsh-pure-mode/host
 */

/** Cordis plugin name. */
export const name = 'pure-mode-host'

/** The preset registry, used to recognise Agents of the `pure` preset. */
export const inject = ['agentPresets']

/**
 * Install the per-Agent message filter for pure-mode Agents only.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the host Context.
 */
export function apply(ctx) {
  const prepared = new WeakSet()

  ctx.effect(() => ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const agent = context.agent
    if (agent !== undefined && !prepared.has(agent)) {
      let preset
      try {
        preset = ctx.agentPresets.composedPreset(agent.ctx)
        if (preset === undefined) preset = ctx.agentPresets.presetForSession(agent.session) ?? undefined
      } catch {
        preset = undefined
      }
      if (preset === 'pure') {
        prepared.add(agent)
        agent.ctx.on('agent/pre-step', async (payload, nextStep) => {
          const decision = await nextStep()
          if (decision.kind !== 'enter') return decision
          const messages = decision.messages.filter(message =>
            message !== null && typeof message === 'object'
              && message.role === 'user'
              && message.source !== null && typeof message.source === 'object'
              && message.source.kind === 'user')
          if (messages.length === decision.messages.length) return decision
          return { ...decision, messages }
        }, { prepend: true })
      }
    }
    return next()
  }), 'pure-mode-host.filter()')
}
